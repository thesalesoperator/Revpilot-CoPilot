import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  OPENAI_API_KEY,
  CORS_HEADERS,
} from '@/lib/coaching/config'

// AI Coaching prompt
const COACHING_PROMPT = `You are an expert real-time sales coach analyzing a live sales call.

CONTEXT: You're hearing the conversation in real-time. The transcript shows who is speaking.

YOUR JOB: Provide actionable coaching tips to help the sales rep succeed.

RESPOND WITH JSON ONLY:
{
  "suggestion": {
    "type": "question" | "tip" | "objection" | "positive" | "alert",
    "content": "Brief actionable suggestion (max 2 sentences)"
  },
  "talk_ratio": <estimated % the sales rep is talking, 0-100>
}

SUGGESTION TYPES:
- question: Suggest a specific discovery question to ask
- tip: Coaching tip based on the conversation
- objection: When prospect raises concerns, tell rep how to respond
- positive: Reinforce something the rep did well
- alert: Urgent warning (talking too much, missed signal, etc.)

ALWAYS PROVIDE A SUGGESTION. Examples:
1. Opening the call - suggest building rapport
2. Rep making statements - suggest asking questions instead
3. Rep asking questions - reinforce or suggest follow-ups
4. Prospect raises objection - provide specific response strategy
5. Prospect mentions price - guide pricing discussion
6. Prospect mentions competitors - suggest differentiation

RULES:
1. ALWAYS give a suggestion
2. Be SPECIFIC - reference what was actually said
3. Keep it SHORT (1-2 sentences max)
4. Focus on what the REP should SAY or DO next

Current transcript:
`

// Rate limit for AI suggestions (milliseconds)
const SUGGESTION_RATE_LIMIT = 6000

function getOpenAIClient(): OpenAI | null {
  if (!OPENAI_API_KEY) return null
  return new OpenAI({ apiKey: OPENAI_API_KEY })
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

export async function POST(request: NextRequest) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    const body = await request.json()
    const sessionId = request.nextUrl.searchParams.get('session_id')
    const webhookType = request.nextUrl.searchParams.get('type')
    const eventType = body.event || body.type

    console.log('[Webhook] Event:', eventType, 'session:', sessionId)

    // Route to appropriate handler
    if (eventType === 'transcript.data' || eventType === 'transcript.partial_data') {
      return handleTranscriptEvent(body, sessionId, supabase, eventType === 'transcript.data')
    }

    if (eventType === 'bot.status_change' || webhookType === 'status') {
      return handleBotStatusChange(body, supabase)
    }

    return NextResponse.json({ received: true, event: eventType }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed', details: String(error) },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

async function handleTranscriptEvent(
  body: any,
  sessionId: string | null,
  supabase: any,
  isFinal: boolean
) {
  // Extract transcript data (handle double nesting from Recall.ai)
  const outerData = body.data || {}
  const innerData = outerData.data || outerData
  const words = innerData.words || []
  const speaker = innerData.participant?.name || 'Unknown'

  // Build transcript text
  const transcriptText = Array.isArray(words)
    ? words.map((w: any) => w.text || w.word || String(w)).join(' ')
    : ''

  if (!transcriptText.trim()) {
    return NextResponse.json({ received: true, skipped: 'empty' }, { headers: CORS_HEADERS })
  }

  console.log(`[Webhook] "${speaker}": "${transcriptText.slice(0, 80)}..."`)

  // Find session
  const session = await findSession(supabase, sessionId, body.bot_id)
  if (!session) {
    return NextResponse.json({ received: true, skipped: 'no_session' }, { headers: CORS_HEADERS })
  }

  // Update transcript in DB
  const existingTranscript = session.transcript || ''
  const newTranscript = existingTranscript + `\n${speaker}: ${transcriptText}`
  const trimmedTranscript = newTranscript.length > 5000 ? newTranscript.slice(-5000) : newTranscript

  await supabase
    .from('coaching_sessions')
    .update({ transcript: trimmedTranscript, updated_at: new Date().toISOString() })
    .eq('id', session.id)

  // Check if we should generate coaching
  const wordCount = transcriptText.split(' ').length
  if (!isFinal && wordCount < 5) {
    return NextResponse.json({ received: true, partial: true }, { headers: CORS_HEADERS })
  }

  // Rate limit check
  const lastSuggestionAt = session.last_suggestion_at ? new Date(session.last_suggestion_at) : null
  const timeSinceLastSuggestion = lastSuggestionAt
    ? Date.now() - lastSuggestionAt.getTime()
    : Infinity

  if (timeSinceLastSuggestion < SUGGESTION_RATE_LIMIT) {
    return NextResponse.json({ received: true, rateLimited: true }, { headers: CORS_HEADERS })
  }

  // Update rate limit timestamp
  await supabase
    .from('coaching_sessions')
    .update({ last_suggestion_at: new Date().toISOString() })
    .eq('id', session.id)

  // Generate AI coaching
  return generateCoachingSuggestion(supabase, session.id, trimmedTranscript)
}

async function findSession(supabase: any, sessionId: string | null, botId?: string) {
  // Try session_id first
  if (sessionId) {
    const { data } = await supabase
      .from('coaching_sessions')
      .select('id, user_id, transcript, last_suggestion_at, status')
      .eq('id', sessionId)
      .neq('status', 'ended')
      .single()

    if (data) return data
  }

  // Fallback to bot_id
  if (botId) {
    const { data } = await supabase
      .from('coaching_sessions')
      .select('id, user_id, transcript, last_suggestion_at, status')
      .eq('bot_id', botId)
      .neq('status', 'ended')
      .single()

    if (data) return data
  }

  return null
}

async function generateCoachingSuggestion(supabase: any, sessionId: string, transcript: string) {
  const openai = getOpenAIClient()
  if (!openai) {
    return NextResponse.json({ received: true, skipped: 'no_openai' }, { headers: CORS_HEADERS })
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a real-time sales coach. Respond with JSON only.' },
        { role: 'user', content: COACHING_PROMPT + transcript.slice(-2000) }
      ],
      temperature: 0.7,
      max_tokens: 200,
    })

    const responseText = completion.choices[0]?.message?.content || ''
    const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const coaching = JSON.parse(cleanedResponse)

    // Insert suggestion
    const suggestionType = coaching.suggestion?.type || 'tip'
    const suggestionContent = coaching.suggestion?.content || 'Try asking an open-ended question to learn more about their needs.'

    await supabase.from('coaching_suggestions').insert({
      session_id: sessionId,
      type: suggestionType,
      content: suggestionContent,
    })

    console.log(`[Webhook] ✓ ${suggestionType}: ${suggestionContent.slice(0, 50)}...`)

    // Insert talk ratio stats if provided
    if (coaching.talk_ratio !== undefined) {
      await supabase.from('coaching_suggestions').insert({
        session_id: sessionId,
        type: 'stats',
        content: JSON.stringify({ talk_ratio: coaching.talk_ratio }),
      })
    }

    return NextResponse.json({ received: true, coaching: true }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[Webhook] AI error:', error)
    return NextResponse.json({ received: true, aiError: String(error) }, { headers: CORS_HEADERS })
  }
}

async function handleBotStatusChange(body: any, supabase: any) {
  const botId = body.data?.bot_id || body.bot_id
  const status = body.data?.status?.code || body.data?.status || body.status

  if (!botId) {
    return NextResponse.json({ received: true }, { headers: CORS_HEADERS })
  }

  const { data: session } = await supabase
    .from('coaching_sessions')
    .select('id')
    .eq('bot_id', botId)
    .single()

  if (!session) {
    return NextResponse.json({ received: true }, { headers: CORS_HEADERS })
  }

  // Map Recall.ai status to our status
  let sessionStatus = 'active'
  if (status === 'joining' || status === 'joining_call') sessionStatus = 'bot_joining'
  if (status === 'in_call' || status === 'in_waiting_room') sessionStatus = 'active'
  if (status === 'done' || status === 'call_ended' || status === 'error' || status === 'fatal') sessionStatus = 'ended'

  await supabase
    .from('coaching_sessions')
    .update({ status: sessionStatus, updated_at: new Date().toISOString() })
    .eq('id', session.id)

  console.log('[Webhook] Bot status:', status, '→', sessionStatus)
  return NextResponse.json({ received: true, newStatus: sessionStatus }, { headers: CORS_HEADERS })
}

// Health check endpoint
export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get('challenge')
  if (challenge) {
    return NextResponse.json({ challenge }, { headers: CORS_HEADERS })
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    openai_configured: !!OPENAI_API_KEY,
    supabase_configured: !!SUPABASE_URL && !!SUPABASE_SERVICE_KEY,
  }, { headers: CORS_HEADERS })
}
