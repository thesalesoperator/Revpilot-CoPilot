import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  SUPABASE_ANON_KEY,
  RECALL_API_KEY,
  RECALL_API_REGION,
  RECALL_API_BASE,
  APP_URL,
  CORS_HEADERS,
  extractZoomMeetingId,
  normalizeZoomUrl,
} from '@/lib/coaching/config'

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

export async function POST(request: NextRequest) {
  try {
    // Verify auth token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - no token provided' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const token = authHeader.split(' ')[1]
    if (!token || token === 'undefined' || token === 'null') {
      return NextResponse.json(
        { error: 'Unauthorized - token is empty' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    // Verify user token
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: authError?.message || 'Invalid token' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    // Use service key for database operations (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { meetingUrl, userId } = await request.json()

    if (!meetingUrl) {
      return NextResponse.json(
        { error: 'Meeting URL required' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const meetingId = extractZoomMeetingId(meetingUrl)
    if (!meetingId) {
      return NextResponse.json(
        { error: 'Invalid Zoom meeting URL' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Create coaching session
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
      console.error('[Coaching] Session creation error:', sessionError)
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    // Create Recall.ai bot if configured
    let botId = null
    let botError = null

    if (RECALL_API_KEY) {
      const normalizedMeetingUrl = normalizeZoomUrl(meetingUrl)
      const webhookUrl = `${APP_URL}/api/coaching/webhook`

      console.log('[Recall.ai] Creating bot for session:', session.id)

      try {
        const botPayload = {
          meeting_url: normalizedMeetingUrl,
          bot_name: 'RevPilot Coach',
          recording_config: {
            transcript: {
              provider: {
                recallai_streaming: {
                  mode: 'prioritize_low_latency',
                  language_code: 'en'
                }
              }
            },
            realtime_endpoints: [{
              type: 'webhook',
              url: `${webhookUrl}?session_id=${session.id}`,
              events: ['transcript.data', 'transcript.partial_data']
            }]
          },
          webhook_url: `${webhookUrl}?session_id=${session.id}&type=status`
        }

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
          console.log('[Recall.ai] Bot created:', botId)

          await supabase
            .from('coaching_sessions')
            .update({ bot_id: botId, status: 'bot_joining' })
            .eq('id', session.id)
        } else {
          const errorText = await botResponse.text()
          console.error('[Recall.ai] Bot creation failed:', errorText)
          botError = `Recall.ai error: ${errorText}`

          if (errorText.includes('authentication_failed') || errorText.includes('Invalid API token')) {
            botError = `Invalid API key or wrong region. Current: ${RECALL_API_REGION}`
          }
        }
      } catch (err) {
        console.error('[Recall.ai] Network error:', err)
        botError = `Network error: ${err}`
      }
    }

    // Update session to active
    await supabase
      .from('coaching_sessions')
      .update({ status: 'active' })
      .eq('id', session.id)

    return NextResponse.json({
      id: session.id,
      status: 'active',
      botId,
      botError: botError || undefined,
      demoMode: !botId,
      meetingId,
    }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[Coaching] Start error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
