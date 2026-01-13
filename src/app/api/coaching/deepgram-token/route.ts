import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  SUPABASE_ANON_KEY,
  DEEPGRAM_API_KEY,
  CORS_HEADERS,
} from '@/lib/coaching/config'

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

/**
 * Returns Deepgram API key for client-side streaming
 * This endpoint is called when the extension doesn't receive a key from /start
 */
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

    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Use service key to verify session belongs to user
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data: session, error: sessionError } = await supabase
      .from('coaching_sessions')
      .select('id, user_id, status')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    if (session.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - session belongs to another user' },
        { status: 403, headers: CORS_HEADERS }
      )
    }

    // Check if Deepgram API key is configured
    if (!DEEPGRAM_API_KEY) {
      console.error('[Deepgram Token] No DEEPGRAM_API_KEY configured in environment')
      return NextResponse.json(
        { error: 'Deepgram not configured - please set DEEPGRAM_API_KEY environment variable' },
        { status: 503, headers: CORS_HEADERS }
      )
    }

    console.log('[Deepgram Token] Returning API key for session:', sessionId)

    return NextResponse.json({
      apiKey: DEEPGRAM_API_KEY,
    }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[Deepgram Token] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
