import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  RECALL_API_KEY,
  RECALL_API_REGION,
  RECALL_API_BASE,
  OPENAI_API_KEY,
  CORS_HEADERS,
} from '@/lib/coaching/config'

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'session_id required' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Get session from DB
    const { data: session, error: sessionError } = await supabase
      .from('coaching_sessions')
      .select('id, user_id, meeting_url, meeting_id, bot_id, status, transcript, last_suggestion_at, created_at, updated_at')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found', sessionError },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    // Get suggestions count
    const { count: suggestionsCount } = await supabase
      .from('coaching_suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)

    // Check bot status with Recall.ai if available
    let recallBotStatus = null
    if (session.bot_id && RECALL_API_KEY) {
      try {
        const botResponse = await fetch(`${RECALL_API_BASE}/bot/${session.bot_id}/`, {
          headers: { 'Authorization': `Token ${RECALL_API_KEY}` },
        })

        recallBotStatus = botResponse.ok
          ? await botResponse.json()
          : { error: await botResponse.text(), status: botResponse.status }
      } catch (err) {
        recallBotStatus = { error: String(err) }
      }
    }

    return NextResponse.json({
      session: {
        id: session.id,
        status: session.status,
        bot_id: session.bot_id,
        meeting_id: session.meeting_id,
        transcript_length: session.transcript?.length || 0,
        transcript_preview: session.transcript?.slice(-200) || null,
        last_suggestion_at: session.last_suggestion_at,
        created_at: session.created_at,
        updated_at: session.updated_at,
      },
      suggestions_count: suggestionsCount || 0,
      recall_bot: recallBotStatus,
      config: {
        region: RECALL_API_REGION,
        api_base: RECALL_API_BASE,
        has_api_key: !!RECALL_API_KEY,
        has_openai_key: !!OPENAI_API_KEY,
      }
    }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[Coaching] Status check error:', error)
    return NextResponse.json(
      { error: 'Status check failed', details: String(error) },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
