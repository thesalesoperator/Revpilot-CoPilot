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
    throw new Error('OPENAI_API_KEY is not configured')
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

// Store recent transcript chunks for context
const transcriptBuffer: Map<string, { text: string; lastUpdate: number }> = new Map()

// Coaching system prompt
const COACHING_PROMPT = `You are a real-time sales coach providing brief, actionable suggestions during a live sales call.

Your job is to analyze the latest transcript and provide ONE suggestion if appropriate. Not every piece of transcript needs a response.

RESPOND WITH JSON ONLY:
{
  "suggestion": {
    "type": "question" | "tip" | "objection" | "positive" | "alert" | null,
    "content": "Brief actionable suggestion (max 2 sentences)" | null
  },
  "talk_ratio": <estimated % the sales rep is talking, 0-100>
}

Types explained:
- question: Suggest a discovery question to ask
- tip: General coaching tip for the moment
- objection: Detected objection, provide response strategy
- positive: Reinforce something done well
- alert: Urgent - rep talking too much, missing opportunity, etc.
- null: No suggestion needed right now

Rules:
1. Only suggest when truly helpful (not every 5 seconds)
2. Keep suggestions SHORT and actionable
3. If prospect raises concern/objection, always respond
4. Track talk ratio - alert if rep exceeds 60%
5. Encourage discovery questions early in call
6. Watch for buying signals

Current transcript (last 60 seconds):
`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Handle different webhook event types from Recall.ai
    const eventType = body.event || body.type

    if (eventType === 'bot.status_change') {
      return handleBotStatusChange(body)
    }

    if (eventType === 'transcription' || body.transcript) {
      return handleTranscription(body)
    }

    // Unknown event type
    return NextResponse.json({ received: true }, { headers: corsHeaders })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500, headers: corsHeaders })
  }
}

async function handleBotStatusChange(body: any) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const botId = body.data?.bot_id || body.bot_id

  if (!botId) return NextResponse.json({ received: true }, { headers: corsHeaders })

  const status = body.data?.status || body.status

  // Find session by bot ID
  const { data: session } = await supabase
    .from('coaching_sessions')
    .select('id')
    .eq('bot_id', botId)
    .single()

  if (!session) return NextResponse.json({ received: true }, { headers: corsHeaders })

  // Map Recall status to our status
  let sessionStatus = 'active'
  if (status === 'joining') sessionStatus = 'bot_joining'
  if (status === 'in_call') sessionStatus = 'active'
  if (status === 'done' || status === 'error') sessionStatus = 'ended'

  await supabase
    .from('coaching_sessions')
    .update({ status: sessionStatus })
    .eq('id', session.id)

  return NextResponse.json({ received: true }, { headers: corsHeaders })
}

async function handleTranscription(body: any) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Extract transcript data
  const botId = body.bot_id || body.data?.bot_id
  const transcript = body.transcript || body.data?.transcript
  const words = body.words || body.data?.words

  if (!botId || (!transcript && !words)) {
    return NextResponse.json({ received: true }, { headers: corsHeaders })
  }

  // Find session
  const { data: session } = await supabase
    .from('coaching_sessions')
    .select('id, user_id')
    .eq('bot_id', botId)
    .eq('status', 'active')
    .single()

  if (!session) {
    return NextResponse.json({ received: true }, { headers: corsHeaders })
  }

  // Build transcript text
  let transcriptText = ''
  if (typeof transcript === 'string') {
    transcriptText = transcript
  } else if (Array.isArray(words)) {
    transcriptText = words.map((w: any) => w.text || w.word).join(' ')
  } else if (transcript?.text) {
    transcriptText = transcript.text
  }

  if (!transcriptText.trim()) {
    return NextResponse.json({ received: true }, { headers: corsHeaders })
  }

  // Update transcript buffer
  const bufferKey = session.id
  const existing = transcriptBuffer.get(bufferKey) || { text: '', lastUpdate: 0 }
  existing.text += ' ' + transcriptText
  existing.lastUpdate = Date.now()

  // Keep only last ~500 words
  const words_arr = existing.text.split(' ')
  if (words_arr.length > 500) {
    existing.text = words_arr.slice(-500).join(' ')
  }
  transcriptBuffer.set(bufferKey, existing)

  // Update session transcript in DB
  await supabase
    .from('coaching_sessions')
    .update({
      transcript: existing.text,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id)

  // Rate limit coaching suggestions (every 10 seconds)
  const lastSuggestionKey = `last_${session.id}`
  const lastSuggestion = transcriptBuffer.get(lastSuggestionKey)
  if (lastSuggestion && Date.now() - lastSuggestion.lastUpdate < 10000) {
    return NextResponse.json({ received: true }, { headers: corsHeaders })
  }
  transcriptBuffer.set(lastSuggestionKey, { text: '', lastUpdate: Date.now() })

  // Generate coaching suggestion
  try {
    const openai = getOpenAIClient()

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Use faster model for real-time
      messages: [
        {
          role: 'system',
          content: 'You are a real-time sales coach. Respond with JSON only.'
        },
        {
          role: 'user',
          content: COACHING_PROMPT + existing.text.slice(-2000)
        }
      ],
      temperature: 0.7,
      max_tokens: 200,
    })

    const responseText = completion.choices[0]?.message?.content || ''
    const cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    const coaching = JSON.parse(cleanedResponse)

    // Insert suggestion if provided
    if (coaching.suggestion?.type && coaching.suggestion?.content) {
      await supabase
        .from('coaching_suggestions')
        .insert({
          session_id: session.id,
          type: coaching.suggestion.type,
          content: coaching.suggestion.content,
        })
    }

    // Insert stats update
    if (coaching.talk_ratio !== undefined) {
      await supabase
        .from('coaching_suggestions')
        .insert({
          session_id: session.id,
          type: 'stats',
          content: JSON.stringify({ talk_ratio: coaching.talk_ratio }),
        })
    }

  } catch (aiError) {
    console.error('AI coaching error:', aiError)
  }

  return NextResponse.json({ received: true }, { headers: corsHeaders })
}

// Also support GET for webhook verification
export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get('challenge')
  if (challenge) {
    return NextResponse.json({ challenge }, { headers: corsHeaders })
  }
  return NextResponse.json({ status: 'ok' }, { headers: corsHeaders })
}
