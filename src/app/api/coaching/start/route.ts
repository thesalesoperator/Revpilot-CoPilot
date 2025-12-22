import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const RECALL_API_KEY = process.env.RECALL_API_KEY
const RECALL_API_BASE = 'https://api.recall.ai/api/v1'

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
    }

    const token = authHeader.split(' ')[1]
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders })
    }

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
    if (RECALL_API_KEY) {
      try {
        const botResponse = await fetch(`${RECALL_API_BASE}/bot`, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${RECALL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            meeting_url: meetingUrl,
            bot_name: 'RevPilot Coach',
            transcription_options: {
              provider: 'deepgram',
            },
            real_time_transcription: {
              destination_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://revpilot-commission-calculator.netlify.app'}/api/coaching/webhook`,
              partial_results: true,
            },
          }),
        })

        if (botResponse.ok) {
          const botData = await botResponse.json()
          botId = botData.id

          // Update session with bot ID
          await supabase
            .from('coaching_sessions')
            .update({
              bot_id: botId,
              status: 'bot_joining'
            })
            .eq('id', session.id)
        } else {
          console.error('Recall.ai bot error:', await botResponse.text())
        }
      } catch (botError) {
        console.error('Recall.ai error:', botError)
        // Continue without bot - we'll use demo mode
      }
    }

    // Update session to active
    await supabase
      .from('coaching_sessions')
      .update({ status: 'active' })
      .eq('id', session.id)

    // Start demo coaching if no bot (for testing)
    if (!botId) {
      startDemoCoaching(session.id, supabase)
    }

    return NextResponse.json({
      id: session.id,
      status: 'active',
      botId,
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
