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
import {
  detectConversationStage,
  detectObjections,
  detectBuyingSignals,
  calculateTalkRatio,
  buildCoachingPrompt,
  ConversationStage,
  SalesMethodology,
  ConversationContext,
} from '@/lib/coaching/intelligence'

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

interface TranscriptEntry {
  text: string
  speaker: number | null
  confidence: number
  timestamp: number
}

// In-memory conversation state (per session)
// In production, this should be stored in Redis or the database
interface SessionState {
  fullTranscript: string
  previousSuggestions: string[]
  startTime: number
  lastStage: ConversationStage
  methodology: SalesMethodology
  keyInfo: {
    painPoints: string[]
    budget: string | null
    timeline: string | null
    decisionMakers: string[]
    objections: string[]
    buyingSignals: string[]
  }
}

const sessionStates = new Map<string, SessionState>()

// Rate limiting per session
const recentAnalysis = new Map<string, number>()

// Extract key information from transcript
function extractKeyInfo(
  transcript: string,
  existingInfo: SessionState['keyInfo']
): SessionState['keyInfo'] {
  const lower = transcript.toLowerCase()
  const info = { ...existingInfo }

  // Extract pain points
  const painPatterns = [
    /(?:challenge|problem|struggle|frustrat|difficult|pain point)[^.]*\./gi,
    /(?:we need|we have to|must|can't|unable to)[^.]*\./gi,
  ]
  for (const pattern of painPatterns) {
    const matches = transcript.match(pattern) || []
    for (const match of matches) {
      if (!info.painPoints.includes(match) && info.painPoints.length < 5) {
        info.painPoints.push(match.trim())
      }
    }
  }

  // Extract budget mentions
  const budgetPatterns = [
    /\$[\d,]+(?:\s*(?:k|K|thousand|million|M))?\b/g,
    /budget[^.]*(?:\$[\d,]+|[\d]+\s*(?:k|thousand|million))[^.]*/gi,
  ]
  for (const pattern of budgetPatterns) {
    const match = transcript.match(pattern)
    if (match && !info.budget) {
      info.budget = match[0]
    }
  }

  // Extract timeline mentions
  const timelinePatterns = [
    /(?:by|before|within|next)\s+(?:Q[1-4]|January|February|March|April|May|June|July|August|September|October|November|December|\d+\s*(?:days?|weeks?|months?|quarters?))/gi,
    /(?:looking to|need to|have to)\s+(?:implement|deploy|launch|start)[^.]*(?:by|before|within)[^.]*/gi,
  ]
  for (const pattern of timelinePatterns) {
    const match = transcript.match(pattern)
    if (match && !info.timeline) {
      info.timeline = match[0]
    }
  }

  // Extract decision maker mentions
  const dmPatterns = [
    /(?:my|our)\s+(?:boss|manager|VP|director|CEO|CTO|CFO|CMO|head of|chief)[^,.]*/gi,
    /(?:report to|check with|approval from|sign-off from)[^,.]*/gi,
  ]
  for (const pattern of dmPatterns) {
    const matches = transcript.match(pattern) || []
    for (const match of matches) {
      const trimmed = match.trim()
      if (!info.decisionMakers.includes(trimmed) && info.decisionMakers.length < 3) {
        info.decisionMakers.push(trimmed)
      }
    }
  }

  return info
}

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

    const { sessionId, transcripts, methodology = 'general' } = await request.json() as {
      sessionId: string
      transcripts: TranscriptEntry[]
      methodology?: SalesMethodology
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
    if (now - lastAnalysis < 3000) { // Min 3 seconds between analyses
      return NextResponse.json({ status: 'rate_limited' }, { headers: CORS_HEADERS })
    }
    recentAnalysis.set(sessionId, now)

    // Clean up old rate limit entries
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
      .select('id, user_id, status, created_at')
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

    // Get or create session state
    let state = sessionStates.get(sessionId)
    if (!state) {
      state = {
        fullTranscript: '',
        previousSuggestions: [],
        startTime: new Date(session.created_at).getTime(),
        lastStage: 'opening',
        methodology: methodology,
        keyInfo: {
          painPoints: [],
          budget: null,
          timeline: null,
          decisionMakers: [],
          objections: [],
          buyingSignals: [],
        },
      }
      sessionStates.set(sessionId, state)
    }

    // Combine transcripts into conversation text
    const recentTranscript = transcripts
      .map(t => {
        const speaker = t.speaker !== null ? `Speaker ${t.speaker}` : 'Unknown'
        return `[${speaker}]: ${t.text}`
      })
      .join('\n')

    // Update full transcript
    state.fullTranscript += '\n' + recentTranscript

    // Store transcript in session for later summary
    const { data: existingSession } = await supabase
      .from('coaching_sessions')
      .select('transcript')
      .eq('id', sessionId)
      .single()

    const existingTranscript = existingSession?.transcript || ''
    const updatedTranscript = existingTranscript + '\n' + recentTranscript

    await supabase
      .from('coaching_sessions')
      .update({ transcript: updatedTranscript })
      .eq('id', sessionId)

    // Analyze conversation context
    const currentStage = detectConversationStage(state.fullTranscript)
    const detectedObjections = detectObjections(recentTranscript)
    const detectedBuyingSignals = detectBuyingSignals(recentTranscript)
    const talkRatio = calculateTalkRatio(transcripts)
    const callDurationMinutes = Math.round((now - state.startTime) / 60000)

    // Update state
    state.lastStage = currentStage
    state.keyInfo = extractKeyInfo(recentTranscript, state.keyInfo)

    // Track detected objections and buying signals
    for (const obj of detectedObjections) {
      if (!state.keyInfo.objections.includes(obj.category)) {
        state.keyInfo.objections.push(obj.category)
      }
    }
    for (const signal of detectedBuyingSignals) {
      if (!state.keyInfo.buyingSignals.includes(signal.signal)) {
        state.keyInfo.buyingSignals.push(signal.signal)
      }
    }

    // Analyze with OpenAI if configured
    if (!OPENAI_API_KEY) {
      console.log('[Analyze] No OpenAI API key, skipping analysis')
      return NextResponse.json({
        status: 'no_openai_key',
        stage: currentStage,
        talkRatio,
      }, { headers: CORS_HEADERS })
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

    // Build sophisticated context
    const context: ConversationContext = {
      stage: currentStage,
      methodology: state.methodology,
      recentTranscript,
      fullTranscript: state.fullTranscript,
      detectedObjections,
      detectedBuyingSignals,
      talkRatio,
      callDurationMinutes,
      previousSuggestions: state.previousSuggestions,
    }

    const systemPrompt = buildCoachingPrompt(context)

    // Use GPT-4o for better coaching quality (fall back to gpt-4o-mini for cost)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',  // Using GPT-4o for highest quality coaching
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Analyze this moment in the conversation and provide coaching.

Key information gathered so far:
- Pain points: ${state.keyInfo.painPoints.join('; ') || 'None identified yet'}
- Budget: ${state.keyInfo.budget || 'Not discussed'}
- Timeline: ${state.keyInfo.timeline || 'Not discussed'}
- Decision makers: ${state.keyInfo.decisionMakers.join(', ') || 'Unknown'}
- Previous objections: ${state.keyInfo.objections.join(', ') || 'None'}
- Buying signals seen: ${state.keyInfo.buyingSignals.join(', ') || 'None'}

Current conversation stage: ${currentStage}
${detectedObjections.length > 0 ? `\n⚠️ OBJECTION IN PROGRESS: ${detectedObjections[0].category}` : ''}
${detectedBuyingSignals.length > 0 ? `\n✅ BUYING SIGNAL: ${detectedBuyingSignals[0].signal}` : ''}`
        }
      ],
      max_tokens: 300,
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const responseText = completion.choices[0]?.message?.content || '{}'
    let analysis

    try {
      analysis = JSON.parse(responseText)
    } catch {
      console.error('[Analyze] Failed to parse OpenAI response:', responseText)
      return NextResponse.json({
        status: 'parse_error',
        stage: currentStage,
        talkRatio,
      }, { headers: CORS_HEADERS })
    }

    // If there's a suggestion, insert it into the database
    if (analysis.suggestion && analysis.suggestion.content) {
      // Track this suggestion to avoid repeating
      state.previousSuggestions.push(analysis.suggestion.content)
      if (state.previousSuggestions.length > 10) {
        state.previousSuggestions = state.previousSuggestions.slice(-10)
      }

      const { error: insertError } = await supabase
        .from('coaching_suggestions')
        .insert({
          session_id: sessionId,
          type: analysis.suggestion.type || 'tip',
          content: analysis.suggestion.content,
          metadata: {
            priority: analysis.suggestion.priority,
            stage: currentStage,
            conversationInsight: analysis.conversationInsight,
            predictedNextMove: analysis.predictedNextMove,
            keyInfo: state.keyInfo,
          }
        })

      if (insertError) {
        console.error('[Analyze] Failed to insert suggestion:', insertError)
      } else {
        console.log(`[Analyze] Inserted ${analysis.suggestion.priority} priority ${analysis.suggestion.type}: ${analysis.suggestion.content.substring(0, 50)}...`)
      }
    }

    // Update talk ratio stats in database
    await supabase
      .from('coaching_suggestions')
      .insert({
        session_id: sessionId,
        type: 'stats',
        content: JSON.stringify({
          talk_ratio: talkRatio.repPercent,
          stage: currentStage,
          duration_minutes: callDurationMinutes,
        }),
      })

    return NextResponse.json({
      status: 'analyzed',
      suggestion: analysis.suggestion || null,
      conversationInsight: analysis.conversationInsight,
      predictedNextMove: analysis.predictedNextMove,
      stage: currentStage,
      talkRatio,
      keyInfo: state.keyInfo,
    }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[Analyze] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

// Cleanup old session states periodically
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000  // 2 hours
  for (const [sessionId, state] of sessionStates.entries()) {
    if (state.startTime < cutoff) {
      sessionStates.delete(sessionId)
    }
  }
}, 30 * 60 * 1000)  // Run every 30 minutes
