import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Handle CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('[Webhook] OPENAI_API_KEY is not configured!')
    return null
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

// Coaching system prompt
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

ALWAYS PROVIDE A SUGGESTION. Examples of what to coach on:
1. Opening the call - suggest building rapport
2. Rep making statements - suggest asking questions instead
3. Rep asking questions - reinforce good behavior or suggest follow-ups
4. Any pause or silence - suggest probing questions
5. Rep talking about features - remind to focus on benefits/outcomes
6. Prospect sounds interested - suggest moving toward next steps
7. Prospect raises objection - provide specific response strategy
8. Prospect mentions price - guide pricing discussion
9. Prospect mentions competitors - suggest differentiation

RULES:
1. ALWAYS give a suggestion - even if just "ask an open-ended question"
2. Be SPECIFIC - reference what was actually said when possible
3. Keep it SHORT (1-2 sentences max)
4. Focus on what the REP should SAY or DO next

Current transcript:
`

export async function POST(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const body = await request.json()
    const url = new URL(request.url)
    const sessionIdParam = url.searchParams.get('session_id')
    const webhookType = url.searchParams.get('type')

    console.log('[Webhook] ====== INCOMING REQUEST ======')
    console.log('[Webhook] Event type:', body.event || body.type || 'unknown')
    console.log('[Webhook] Query params - session_id:', sessionIdParam, 'type:', webhookType)
    console.log('[Webhook] Full body:', JSON.stringify(body, null, 2).slice(0, 1000))

    const eventType = body.event || body.type

    // Handle transcript events (new Recall.ai format)
    // Docs: https://docs.recall.ai/docs/bot-real-time-transcription
    if (eventType === 'transcript.data' || eventType === 'transcript.partial_data') {
      return handleTranscriptEvent(body, sessionIdParam, supabase, eventType === 'transcript.data')
    }

    // Handle bot status change events
    if (eventType === 'bot.status_change' || webhookType === 'status') {
      return handleBotStatusChange(body, supabase)
    }

    console.log('[Webhook] Unknown event type:', eventType)
    return NextResponse.json({ received: true, event: eventType }, { headers: corsHeaders })

  } catch (error) {
    console.error('[Webhook] Error:', error)
    return NextResponse.json({ error: 'Webhook processing failed', details: String(error) }, { status: 500, headers: corsHeaders })
  }
}

// Handle Recall.ai transcript events
// Event structure: { event: "transcript.data", data: { data: { words: [...], participant: {...} } } }
async function handleTranscriptEvent(
  body: any,
  sessionId: string | null,
  supabase: any,
  isFinal: boolean
) {
  console.log('[Webhook] Processing transcript event, isFinal:', isFinal)

  // Extract transcript data - note the DOUBLE nesting: body.data.data
  // See: https://docs.recall.ai/docs/real-time-webhook-endpoints
  const outerData = body.data || {}
  const innerData = outerData.data || outerData // Handle both nested and flat structures
  const words = innerData.words || []
  const participant = innerData.participant || {}
  const speaker = participant.name || 'Unknown'

  // Build transcript text from words array
  let transcriptText = ''
  if (Array.isArray(words)) {
    transcriptText = words.map((w: any) => w.text || w.word || String(w)).join(' ')
  }

  if (!transcriptText.trim()) {
    console.log('[Webhook] Empty transcript, skipping')
    return NextResponse.json({ received: true, skipped: 'empty' }, { headers: corsHeaders })
  }

  console.log(`[Webhook] Transcript from "${speaker}": "${transcriptText.slice(0, 100)}..."`)

  // Find session - try session_id param first, then bot_id
  // Don't filter by status - process events for any non-ended session
  let session = null

  if (sessionId) {
    const { data: s, error } = await supabase
      .from('coaching_sessions')
      .select('id, user_id, transcript, last_suggestion_at, status')
      .eq('id', sessionId)
      .neq('status', 'ended')
      .single()

    if (error) {
      console.log('[Webhook] Session lookup by ID error:', error.message)
    } else {
      session = s
      console.log('[Webhook] Found session by ID, status:', s.status)
    }
  }

  // Fallback: find by bot_id
  if (!session && body.bot_id) {
    const { data: s, error } = await supabase
      .from('coaching_sessions')
      .select('id, user_id, transcript, last_suggestion_at, status')
      .eq('bot_id', body.bot_id)
      .neq('status', 'ended')
      .single()

    if (error) {
      console.log('[Webhook] Session lookup by bot_id error:', error.message)
    } else {
      session = s
      console.log('[Webhook] Found session by bot_id, status:', s.status)
    }
  }

  if (!session) {
    console.log('[Webhook] No active session found for session_id:', sessionId, 'bot_id:', body.bot_id)
    return NextResponse.json({ received: true, skipped: 'no_session' }, { headers: corsHeaders })
  }

  console.log('[Webhook] Found session:', session.id)

  // Append to existing transcript (stored in DB, not memory - serverless is stateless!)
  const existingTranscript = session.transcript || ''
  const newTranscript = existingTranscript + `\n${speaker}: ${transcriptText}`

  // Keep only last ~2000 characters to avoid bloat
  const trimmedTranscript = newTranscript.length > 5000
    ? newTranscript.slice(-5000)
    : newTranscript

  // Update session transcript in DB
  const { error: updateError } = await supabase
    .from('coaching_sessions')
    .update({
      transcript: trimmedTranscript,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id)

  if (updateError) {
    console.error('[Webhook] Failed to update transcript:', updateError)
  } else {
    console.log('[Webhook] Transcript updated, length:', trimmedTranscript.length)
  }

  // Generate AI coaching on final transcripts OR if we have substantial partial content
  // Some providers only send partial_data, so we need to handle both cases
  const wordCount = transcriptText.split(' ').length
  const shouldGenerateCoaching = isFinal || wordCount >= 5  // At least 5 words in the utterance

  if (!shouldGenerateCoaching) {
    console.log('[Webhook] Skipping AI - partial with only', wordCount, 'words')
    return NextResponse.json({ received: true, partial: true, wordCount }, { headers: corsHeaders })
  }

  // Rate limit: only generate suggestions every 6 seconds
  // Use DB timestamp since serverless functions are stateless
  const lastSuggestionAt = session.last_suggestion_at ? new Date(session.last_suggestion_at) : null
  const now = new Date()
  const timeSinceLastSuggestion = lastSuggestionAt ? now.getTime() - lastSuggestionAt.getTime() : Infinity

  if (timeSinceLastSuggestion < 6000) {
    console.log('[Webhook] Rate limited, last suggestion was', Math.round(timeSinceLastSuggestion / 1000), 'seconds ago')
    return NextResponse.json({ received: true, rateLimited: true }, { headers: corsHeaders })
  }

  // Update last_suggestion_at timestamp
  await supabase
    .from('coaching_sessions')
    .update({ last_suggestion_at: now.toISOString() })
    .eq('id', session.id)

  // Generate AI coaching suggestion
  const openai = getOpenAIClient()
  if (!openai) {
    console.error('[Webhook] OpenAI client not available - check OPENAI_API_KEY')
    return NextResponse.json({ received: true, skipped: 'no_openai' }, { headers: corsHeaders })
  }

  try {
    console.log('[Webhook] Generating AI coaching suggestion...')

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a real-time sales coach. Respond with JSON only.'
        },
        {
          role: 'user',
          content: COACHING_PROMPT + trimmedTranscript.slice(-2000)
        }
      ],
      temperature: 0.7,
      max_tokens: 200,
    })

    const responseText = completion.choices[0]?.message?.content || ''
    console.log('[Webhook] OpenAI response:', responseText.slice(0, 200))

    // Parse JSON response
    const cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    const coaching = JSON.parse(cleanedResponse)

    // Insert suggestion - AI should always provide one with new prompt
    const suggestionType = coaching.suggestion?.type || 'tip'
    const suggestionContent = coaching.suggestion?.content || 'Try asking an open-ended question to learn more about their needs.'

    const { error: insertError } = await supabase
      .from('coaching_suggestions')
      .insert({
        session_id: session.id,
        type: suggestionType,
        content: suggestionContent,
      })

    if (insertError) {
      console.error('[Webhook] Failed to insert suggestion:', insertError)
    } else {
      console.log(`[Webhook] ✓ Generated coaching: ${suggestionType} - ${suggestionContent}`)
    }

    // Insert stats update if provided
    if (coaching.talk_ratio !== undefined) {
      await supabase
        .from('coaching_suggestions')
        .insert({
          session_id: session.id,
          type: 'stats',
          content: JSON.stringify({ talk_ratio: coaching.talk_ratio }),
        })
    }

    return NextResponse.json({ received: true, coaching: !!coaching.suggestion?.content }, { headers: corsHeaders })

  } catch (aiError) {
    console.error('[Webhook] AI coaching error:', aiError)
    return NextResponse.json({ received: true, aiError: String(aiError) }, { headers: corsHeaders })
  }
}

// Handle bot status change events
async function handleBotStatusChange(body: any, supabase: any) {
  const botId = body.data?.bot_id || body.bot_id
  const status = body.data?.status?.code || body.data?.status || body.status

  console.log('[Webhook] Bot status change - bot_id:', botId, 'status:', status)

  if (!botId) {
    console.log('[Webhook] No bot_id in status change event')
    return NextResponse.json({ received: true }, { headers: corsHeaders })
  }

  // Find session by bot ID
  const { data: session, error } = await supabase
    .from('coaching_sessions')
    .select('id')
    .eq('bot_id', botId)
    .single()

  if (error || !session) {
    console.log('[Webhook] No session found for bot_id:', botId)
    return NextResponse.json({ received: true }, { headers: corsHeaders })
  }

  // Map Recall status to our status
  let sessionStatus = 'active'
  if (status === 'joining' || status === 'joining_call') sessionStatus = 'bot_joining'
  if (status === 'in_call' || status === 'in_waiting_room') sessionStatus = 'active'
  if (status === 'done' || status === 'call_ended' || status === 'error' || status === 'fatal') sessionStatus = 'ended'

  console.log('[Webhook] Updating session status to:', sessionStatus)

  await supabase
    .from('coaching_sessions')
    .update({ status: sessionStatus, updated_at: new Date().toISOString() })
    .eq('id', session.id)

  return NextResponse.json({ received: true, newStatus: sessionStatus }, { headers: corsHeaders })
}

// GET endpoint for webhook verification and health check
export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get('challenge')
  if (challenge) {
    return NextResponse.json({ challenge }, { headers: corsHeaders })
  }
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    openai_configured: !!process.env.OPENAI_API_KEY,
    supabase_configured: !!supabaseUrl && !!supabaseServiceKey,
  }, { headers: corsHeaders })
}
