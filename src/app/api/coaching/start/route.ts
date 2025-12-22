import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const RECALL_API_KEY = process.env.RECALL_API_KEY
const RECALL_API_REGION = process.env.RECALL_API_REGION || 'us-east-1'

// Recall.ai regional API endpoints
function getRecallApiBase(region: string): string {
  const regionMap: Record<string, string> = {
    'us-east-1': 'https://us-east-1.recall.ai/api/v1',
    'us-west-2': 'https://us-west-2.recall.ai/api/v1',
    'eu-central-1': 'https://eu-central-1.recall.ai/api/v1',
    'ap-northeast-1': 'https://api.recall.ai/api/v1',
  }
  return regionMap[region] || regionMap['us-east-1']
}

const RECALL_API_BASE = getRecallApiBase(RECALL_API_REGION)

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Handle CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    // Verify auth token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Coaching start: No auth header')
      return NextResponse.json({ error: 'Unauthorized - no token provided' }, { status: 401, headers: corsHeaders })
    }

    const token = authHeader.split(' ')[1]
    if (!token || token === 'undefined' || token === 'null') {
      console.error('Coaching start: Empty or invalid token value')
      return NextResponse.json({ error: 'Unauthorized - token is empty' }, { status: 401, headers: corsHeaders })
    }

    // Use anon key to verify user tokens
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const authClient = createClient(supabaseUrl, supabaseAnonKey)

    // Verify the token with Supabase
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)
    if (authError) {
      console.error('Coaching start auth error:', authError.message)
      return NextResponse.json({ error: `Invalid token: ${authError.message}` }, { status: 401, headers: corsHeaders })
    }
    if (!user) {
      console.error('Coaching start: No user returned')
      return NextResponse.json({ error: 'Invalid token - no user' }, { status: 401, headers: corsHeaders })
    }

    // Use service key for database operations (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { meetingUrl, userId } = await request.json()

    if (!meetingUrl) {
      return NextResponse.json({ error: 'Meeting URL required' }, { status: 400, headers: corsHeaders })
    }

    // Extract meeting ID from Zoom URL
    const meetingId = extractZoomMeetingId(meetingUrl)
    if (!meetingId) {
      return NextResponse.json({ error: 'Invalid Zoom meeting URL' }, { status: 400, headers: corsHeaders })
    }

    // Create coaching session in database
    const { data: session, error: sessionError } = await supabase
      .from('coaching_sessions')
      .insert({
        user_id: userId,
        meeting_url: meetingUrl,
        meeting_id: meetingId,
        status: 'starting',
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Session creation error:', sessionError)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500, headers: corsHeaders })
    }

    // If Recall.ai is configured, send bot to join
    let botId = null
    let botError = null
    if (RECALL_API_KEY) {
      // Normalize the URL to standard Zoom format for Recall.ai
      const normalizedMeetingUrl = normalizeZoomUrl(meetingUrl)
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://revpilot-commission-calculator.netlify.app'}/api/coaching/webhook`

      console.log(`[Recall.ai] Creating bot:`)
      console.log(`  - Region: ${RECALL_API_REGION}`)
      console.log(`  - API Base: ${RECALL_API_BASE}`)
      console.log(`  - Meeting URL: ${normalizedMeetingUrl}`)
      console.log(`  - Webhook URL: ${webhookUrl}`)
      console.log(`  - Session ID: ${session.id}`)

      try {
        // Use the current Recall.ai API format (recording_config structure)
        // Docs: https://docs.recall.ai/docs/recallai-transcription
        const botPayload = {
          meeting_url: normalizedMeetingUrl,
          bot_name: 'RevPilot Coach',
          recording_config: {
            transcript: {
              provider: {
                // Use Recall's streaming transcription with low latency mode
                // Must use prioritize_low_latency for real-time webhooks (otherwise 3-10 min delay)
                recallai_streaming: {
                  mode: 'prioritize_low_latency'
                }
              }
            },
            realtime_endpoints: [
              {
                type: 'webhook',
                url: `${webhookUrl}?session_id=${session.id}`,
                // transcript.data = final utterances, transcript.partial_data = interim results
                events: ['transcript.data', 'transcript.partial_data']
              }
            ]
          },
          // Also set webhook_url for bot status events (joining, in_call, done, etc.)
          webhook_url: `${webhookUrl}?session_id=${session.id}&type=status`
        }

        console.log(`[Recall.ai] Request payload:`, JSON.stringify(botPayload, null, 2))

        const botResponse = await fetch(`${RECALL_API_BASE}/bot/`, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${RECALL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(botPayload),
        })

        if (botResponse.ok) {
          const botData = await botResponse.json()
          botId = botData.id
          console.log(`[Recall.ai] Bot created successfully with ID: ${botId}`)

          // Update session with bot ID
          await supabase
            .from('coaching_sessions')
            .update({
              bot_id: botId,
              status: 'bot_joining'
            })
            .eq('id', session.id)
        } else {
          const errorText = await botResponse.text()
          console.error(`[Recall.ai] Bot creation failed (${botResponse.status}):`, errorText)
          botError = `Recall.ai error: ${errorText}`
          // Check for auth errors which indicate wrong region
          if (errorText.includes('authentication_failed') || errorText.includes('Invalid API token')) {
            console.error('[Recall.ai] API key may be invalid or for wrong region. Current region:', RECALL_API_REGION)
            botError = `Invalid Recall.ai API key or wrong region. Current region: ${RECALL_API_REGION}. Try: us-east-1, us-west-2, eu-central-1, or ap-northeast-1`
          }
        }
      } catch (err) {
        console.error('[Recall.ai] Network error:', err)
        botError = `Recall.ai network error: ${err}`
        // Continue without bot - we'll use demo mode
      }
    } else {
      console.log('[Recall.ai] No API key configured - using demo mode')
    }

    // Update session to active
    await supabase
      .from('coaching_sessions')
      .update({ status: 'active' })
      .eq('id', session.id)

    // Note: Demo mode is handled client-side since serverless can't run background timers

    return NextResponse.json({
      id: session.id,
      status: 'active',
      botId,
      botError: botError || undefined,
      demoMode: !botId, // Client knows to use demo mode if no bot
      meetingId,
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Coaching start error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}

function extractZoomMeetingId(url: string): string | null {
  // Handle various Zoom URL formats
  const patterns = [
    /zoom\.us\/j\/(\d+)/,
    /zoom\.us\/wc\/(\d+)/,
    /zoom\.us\/my\/([^/?]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }

  return null
}

// Convert various Zoom URL formats to standard format for Recall.ai
function normalizeZoomUrl(url: string): string {
  // Extract meeting ID
  const meetingIdMatch = url.match(/\/(?:j|wc)\/(\d+)/)
  if (!meetingIdMatch) return url

  const meetingId = meetingIdMatch[1]

  // Extract password if present
  const pwdMatch = url.match(/pwd=([^&]+)/)
  const password = pwdMatch ? pwdMatch[1] : null

  // Build standard Zoom URL
  let normalizedUrl = `https://zoom.us/j/${meetingId}`
  if (password) {
    normalizedUrl += `?pwd=${password}`
  }

  console.log(`[Recall.ai] Normalized URL: ${url} -> ${normalizedUrl}`)
  return normalizedUrl
}

// Demo coaching for testing without Recall.ai
async function startDemoCoaching(sessionId: string, supabase: any) {
  const demoSuggestions = [
    { type: 'tip', content: 'Start with a warm greeting and build rapport before diving into business.', delay: 5000 },
    { type: 'question', content: 'Ask: "What prompted you to take this call today?"', delay: 15000 },
    { type: 'tip', content: 'Listen actively - they mentioned a pain point. Dig deeper.', delay: 30000 },
    { type: 'question', content: 'Try: "Can you tell me more about how that affects your team?"', delay: 45000 },
    { type: 'positive', content: 'Great job asking open-ended questions!', delay: 60000 },
    { type: 'objection', content: 'They seem hesitant. Address their concerns directly.', delay: 75000 },
    { type: 'tip', content: 'Now is a good time to present your solution.', delay: 90000 },
    { type: 'question', content: 'Ask: "What would success look like for you?"', delay: 120000 },
  ]

  for (const suggestion of demoSuggestions) {
    setTimeout(async () => {
      try {
        await supabase
          .from('coaching_suggestions')
          .insert({
            session_id: sessionId,
            type: suggestion.type,
            content: suggestion.content,
          })
      } catch (e) {
        console.error('Demo suggestion error:', e)
      }
    }, suggestion.delay)
  }

  // Update talk ratio periodically
  let talkRatio = 50
  const statsInterval = setInterval(async () => {
    talkRatio = Math.max(20, Math.min(80, talkRatio + (Math.random() - 0.5) * 10))

    try {
      const { data: currentSession } = await supabase
        .from('coaching_sessions')
        .select('status')
        .eq('id', sessionId)
        .single()

      if (currentSession?.status !== 'active') {
        clearInterval(statsInterval)
        return
      }

      await supabase
        .from('coaching_suggestions')
        .insert({
          session_id: sessionId,
          type: 'stats',
          content: JSON.stringify({ talk_ratio: Math.round(talkRatio) }),
        })
    } catch (e) {
      console.error('Stats update error:', e)
    }
  }, 10000)
}
