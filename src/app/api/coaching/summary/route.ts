import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  OPENAI_API_KEY,
  CORS_HEADERS,
} from '@/lib/coaching/config'

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

// POST /api/coaching/summary - Generate instant post-call summary
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const token = authHeader.split(' ')[1]
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const { sessionId } = await request.json()
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Get session with transcript
    const { data: session, error: sessionError } = await supabase
      .from('coaching_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    // If no transcript, return empty summary
    if (!session.transcript || session.transcript.length < 50) {
      return NextResponse.json({
        summary: {
          overview: 'Call was too short to generate a meaningful summary.',
          keyPoints: [],
          actionItems: [],
          objections: [],
          nextSteps: [],
          sentiment: 'neutral'
        }
      }, { headers: CORS_HEADERS })
    }

    // Generate summary using OpenAI
    if (!OPENAI_API_KEY) {
      return NextResponse.json({
        summary: {
          overview: 'AI summary not available - OpenAI not configured.',
          keyPoints: [],
          actionItems: [],
          objections: [],
          nextSteps: [],
          sentiment: 'neutral'
        }
      }, { headers: CORS_HEADERS })
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a sales call analyst. Generate a concise post-call summary from this transcript.

Return a JSON object with:
- overview: 2-3 sentence summary of the call
- keyPoints: Array of 3-5 key discussion points (strings)
- actionItems: Array of specific action items mentioned (strings)
- objections: Array of any objections or concerns raised by the prospect (strings)
- nextSteps: Array of agreed next steps (strings)
- sentiment: One of "positive", "neutral", or "negative" based on how the call went

Be concise. Focus on what matters for follow-up.`
        },
        {
          role: 'user',
          content: `Analyze this sales call transcript and provide a summary:\n\n${session.transcript.substring(0, 8000)}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1000,
    })

    const summaryContent = response.choices[0]?.message?.content
    let summary = {
      overview: 'Unable to generate summary.',
      keyPoints: [],
      actionItems: [],
      objections: [],
      nextSteps: [],
      sentiment: 'neutral'
    }

    if (summaryContent) {
      try {
        summary = JSON.parse(summaryContent)
      } catch (e) {
        console.error('[Summary] Failed to parse OpenAI response:', e)
      }
    }

    // Store summary in session
    await supabase
      .from('coaching_sessions')
      .update({ summary: JSON.stringify(summary) })
      .eq('id', sessionId)

    return NextResponse.json({ summary }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[Summary] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
