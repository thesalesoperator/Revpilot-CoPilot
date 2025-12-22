import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const RECALL_API_KEY = process.env.RECALL_API_KEY
const RECALL_API_REGION = process.env.RECALL_API_REGION || 'us-east-1'

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

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// GET /api/coaching/status?session_id=xxx - Check bot and session status
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400, headers: corsHeaders })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get session from DB
    const { data: session, error: sessionError } = await supabase
      .from('coaching_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found', sessionError }, { status: 404, headers: corsHeaders })
    }

    // Get suggestions count
    const { count: suggestionsCount } = await supabase
      .from('coaching_suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)

    // If we have a bot ID, check its status with Recall.ai
    let recallBotStatus = null
    if (session.bot_id && RECALL_API_KEY) {
      try {
        const botResponse = await fetch(`${RECALL_API_BASE}/bot/${session.bot_id}/`, {
          headers: {
            'Authorization': `Token ${RECALL_API_KEY}`,
          },
        })

        if (botResponse.ok) {
          recallBotStatus = await botResponse.json()
        } else {
          recallBotStatus = { error: await botResponse.text(), status: botResponse.status }
        }
      } catch (e) {
        recallBotStatus = { error: String(e) }
      }
    }

    return NextResponse.json({
      session: {
        id: session.id,
        status: session.status,
        bot_id: session.bot_id,
        meeting_id: session.meeting_id,
        transcript_length: session.transcript?.length || 0,
        created_at: session.created_at,
        updated_at: session.updated_at,
      },
      suggestions_count: suggestionsCount || 0,
      recall_bot: recallBotStatus,
      config: {
        region: RECALL_API_REGION,
        api_base: RECALL_API_BASE,
        has_api_key: !!RECALL_API_KEY,
      }
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json({ error: 'Status check failed', details: String(error) }, { status: 500, headers: corsHeaders })
  }
}
