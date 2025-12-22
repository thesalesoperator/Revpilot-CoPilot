import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const RECALL_API_KEY = process.env.RECALL_API_KEY
const RECALL_API_BASE = 'https://api.recall.ai/api/v1'

export async function POST(request: NextRequest) {
  try {
    // Verify auth token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('coaching_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // If there's a Recall.ai bot, tell it to leave
    if (session.bot_id && RECALL_API_KEY) {
      try {
        await fetch(`${RECALL_API_BASE}/bot/${session.bot_id}/leave_call`, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${RECALL_API_KEY}`,
          },
        })
      } catch (botError) {
        console.error('Error removing bot:', botError)
      }
    }

    // Get all suggestions for this session to build transcript
    const { data: suggestions } = await supabase
      .from('coaching_suggestions')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    // Calculate session duration
    const startTime = new Date(session.created_at)
    const endTime = new Date()
    const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000)

    // Update session as ended
    const { error: updateError } = await supabase
      .from('coaching_sessions')
      .update({
        status: 'ended',
        ended_at: endTime.toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Session update error:', updateError)
    }

    // Save to call_recordings for post-call review
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
      } catch (e) {
        console.error('Error saving to call_recordings:', e)
      }
    }

    return NextResponse.json({
      success: true,
      sessionId,
      duration: durationSeconds,
    })

  } catch (error) {
    console.error('Coaching stop error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
