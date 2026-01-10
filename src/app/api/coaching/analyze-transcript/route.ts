import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  SUPABASE_ANON_KEY,
  OPENAI_API_KEY,
  CORS_HEADERS,
} from '@/lib/coaching/config'

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

interface TranscriptEntry {
  text: string
  speaker: number | null
  confidence: number
  timestamp: number
}

// Track recent analysis to avoid duplicate suggestions
const recentAnalysis = new Map<string, number>()

export async function POST(request: NextRequest) {
  try {
    // Verify auth token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const token = authHeader.split(' ')[1]

    // Verify user token
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const { sessionId, transcripts } = await request.json() as {
      sessionId: string
      transcripts: TranscriptEntry[]
    }

    if (!sessionId || !transcripts || transcripts.length === 0) {
      return NextResponse.json(
        { error: 'Session ID and transcripts required' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Rate limit: don't analyze too frequently for the same session
    const lastAnalysis = recentAnalysis.get(sessionId) || 0
    const now = Date.now()
    if (now - lastAnalysis < 2000) { // Min 2 seconds between analyses
      return NextResponse.json({ status: 'rate_limited' }, { headers: CORS_HEADERS })
    }
    recentAnalysis.set(sessionId, now)

    // Clean up old entries
    if (recentAnalysis.size > 100) {
      const cutoff = now - 60000
      for (const [key, time] of recentAnalysis.entries()) {
        if (time < cutoff) recentAnalysis.delete(key)
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Verify session exists and belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('coaching_sessions')
      .select('id, user_id, status')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    if (session.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - session belongs to another user' },
        { status: 403, headers: CORS_HEADERS }
      )
    }

    // Combine transcripts into conversation text
    const conversationText = transcripts
      .map(t => {
        const speaker = t.speaker !== null ? `Speaker ${t.speaker}` : 'Unknown'
        return `[${speaker}]: ${t.text}`
      })
      .join('\n')

    // Store transcript in session for later summary
    // First get existing transcript, then append
    const { data: existingSession } = await supabase
      .from('coaching_sessions')
      .select('transcript')
      .eq('id', sessionId)
      .single()

    const existingTranscript = existingSession?.transcript || ''
    const updatedTranscript = existingTranscript + '\n' + conversationText

    await supabase
      .from('coaching_sessions')
      .update({ transcript: updatedTranscript })
      .eq('id', sessionId)

    // Analyze with OpenAI if configured
    if (!OPENAI_API_KEY) {
      console.log('[Analyze] No OpenAI API key, skipping analysis')
      return NextResponse.json({ status: 'no_openai_key' }, { headers: CORS_HEADERS })
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

    const systemPrompt = `You are an expert sales coach analyzing a live sales call in real-time.
Your job is to provide actionable, immediate coaching suggestions based on what's being said.

Analyze the conversation and provide ONE coaching suggestion if warranted.
Only respond if there's something actionable to suggest. If the conversation is going well, you can provide positive reinforcement.

Response format (JSON):
{
  "suggestion": {
    "type": "question" | "tip" | "objection" | "alert" | "positive",
    "content": "Your specific, actionable suggestion (keep it brief - max 2 sentences)"
  }
}

Types:
- question: Suggest a discovery question to ask
- tip: Provide a coaching tip or best practice
- objection: Help handle an objection that was raised
- alert: Warn about something (talking too much, going off track, etc.)
- positive: Reinforce something the sales rep did well

If no suggestion is needed, respond with: {"suggestion": null}

Keep suggestions:
- Brief and actionable (max 2 sentences)
- Specific to what was just said
- Focused on sales best practices (discovery, qualification, objection handling, closing)`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Recent conversation:\n${conversationText}` }
      ],
      max_tokens: 150,
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const responseText = completion.choices[0]?.message?.content || '{}'
    let analysis

    try {
      analysis = JSON.parse(responseText)
    } catch {
      console.error('[Analyze] Failed to parse OpenAI response:', responseText)
      return NextResponse.json({ status: 'parse_error' }, { headers: CORS_HEADERS })
    }

    // If there's a suggestion, insert it into the database
    if (analysis.suggestion && analysis.suggestion.content) {
      const { error: insertError } = await supabase
        .from('coaching_suggestions')
        .insert({
          session_id: sessionId,
          type: analysis.suggestion.type || 'tip',
          content: analysis.suggestion.content,
        })

      if (insertError) {
        console.error('[Analyze] Failed to insert suggestion:', insertError)
      } else {
        console.log('[Analyze] Inserted suggestion:', analysis.suggestion.type)
      }
    }

    return NextResponse.json({
      status: 'analyzed',
      suggestion: analysis.suggestion || null
    }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[Analyze] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
