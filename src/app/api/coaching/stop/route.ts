import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  RECALL_API_KEY,
  RECALL_API_BASE,
  CORS_HEADERS,
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
        { error: 'Unauthorized' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const token = authHeader.split(' ')[1]
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Verify the token
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

    // Get session
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

    // Tell Recall.ai bot to leave if present
    if (session.bot_id && RECALL_API_KEY) {
      try {
        await fetch(`${RECALL_API_BASE}/bot/${session.bot_id}/leave_call`, {
          method: 'POST',
          headers: { 'Authorization': `Token ${RECALL_API_KEY}` },
        })
      } catch (err) {
        console.error('[Coaching] Error removing bot:', err)
      }
    }

    // Calculate session duration
    const startTime = new Date(session.created_at)
    const endTime = new Date()
    const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000)

    // Update session as ended
    await supabase
      .from('coaching_sessions')
      .update({
        status: 'ended',
        ended_at: endTime.toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq('id', sessionId)

    // Save to call_recordings for post-call review if we have transcript
    if (session.transcript) {
      try {
        await supabase
          .from('call_recordings')
          .insert({
            user_id: user.id,
            title: `Zoom Call - ${new Date(session.created_at).toLocaleDateString()}`,
            file_name: `coaching-session-${sessionId}`,
            file_url: `coaching://${sessionId}`,
            duration_seconds: durationSeconds,
            status: 'completed',
            transcript: session.transcript,
            analysis: session.analysis,
            overall_score: session.overall_score,
          })
      } catch (err) {
        console.error('[Coaching] Error saving to call_recordings:', err)
      }
    }

    return NextResponse.json({
      success: true,
      sessionId,
      duration: durationSeconds,
    }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[Coaching] Stop error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
