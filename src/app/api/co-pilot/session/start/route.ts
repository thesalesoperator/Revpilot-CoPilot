/**
 * Unified Co-Pilot Session Start API
 *
 * Creates a new co-pilot session for any context:
 * - live_coaching: Real sales calls with real-time coaching
 * - practice: AI roleplay practice sessions
 * - real_call_analysis: Post-call analysis of recordings
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  SUPABASE_ANON_KEY,
  CORS_HEADERS,
} from '@/lib/coaching/config'
import { SessionContext, CaptureMethod } from '@/lib/unified/types'

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

export async function POST(request: NextRequest) {
  try {
    // Support both token-based auth (extension) and cookie-based auth (web app)
    const authHeader = request.headers.get('Authorization')
    let userId: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      // Token-based auth from Chrome extension
      const token = authHeader.split(' ')[1]
      if (!token || token === 'undefined' || token === 'null') {
        return NextResponse.json(
          { error: 'Unauthorized - token is empty' },
          { status: 401, headers: CORS_HEADERS }
        )
      }

      const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      const { data: { user }, error: authError } = await authClient.auth.getUser(token)

      if (authError || !user) {
        return NextResponse.json(
          { error: authError?.message || 'Invalid token' },
          { status: 401, headers: CORS_HEADERS }
        )
      }
      userId = user.id
    } else {
      // Try to get userId from request body (for server-side calls)
      const body = await request.clone().json()
      if (body.userId) {
        userId = body.userId
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - no user identified' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    // Use service key for database operations (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const body = await request.json()
    const {
      context,
      captureMethod,
      meetingUrl,
      challengeId,
      personaId,
      uploadedFileUrl,
    } = body as {
      context: SessionContext
      captureMethod?: CaptureMethod
      meetingUrl?: string
      challengeId?: string
      personaId?: string
      uploadedFileUrl?: string
    }

    // Validate required fields
    if (!context) {
      return NextResponse.json(
        { error: 'context is required (live_coaching, practice, or real_call_analysis)' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Validate context-specific fields
    if (context === 'live_coaching' && !meetingUrl && !captureMethod) {
      return NextResponse.json(
        { error: 'meetingUrl or captureMethod required for live_coaching' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    if (context === 'practice' && !challengeId) {
      return NextResponse.json(
        { error: 'challengeId required for practice' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Check for existing active session and close it
    const { data: existingSession } = await supabase
      .from('co_pilot_sessions')
      .select('id, status')
      .eq('user_id', userId)
      .in('status', ['starting', 'active'])
      .single()

    if (existingSession) {
      await supabase
        .from('co_pilot_sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
        })
        .eq('id', existingSession.id)
    }

    // Create unified session
    const { data: session, error } = await supabase
      .from('co_pilot_sessions')
      .insert({
        user_id: userId,
        context,
        capture_method: captureMethod || (context === 'practice' ? 'vapi' : 'tab_audio'),
        meeting_url: meetingUrl,
        challenge_id: challengeId,
        persona_id: personaId,
        uploaded_file_url: uploadedFileUrl,
        status: 'starting',
        started_at: new Date().toISOString(),
        key_info: {},
        transcript: '',
        script_progress: 0,
        current_section: 'set_expectations',
      })
      .select()
      .single()

    if (error) {
      console.error('[CoPilot] Session creation error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    // Return session with context-specific config
    const config = getContextConfig(context, { challengeId, personaId })

    console.log(`[CoPilot] Session created: ${session.id} (${context})`)

    return NextResponse.json({
      sessionId: session.id,
      session,
      config,
    }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[CoPilot] Start error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

/**
 * Returns context-specific configuration for the session.
 */
function getContextConfig(
  context: SessionContext,
  options: { challengeId?: string; personaId?: string }
) {
  if (context === 'live_coaching') {
    return {
      analysisInterval: 3000, // 3 seconds between analyses
      suggestionTypes: ['question', 'tip', 'objection', 'alert', 'transition'],
      showScriptProgress: true,
      showKeyInfo: true,
      enableStreaming: true,
    }
  }

  if (context === 'practice') {
    return {
      analysisInterval: 10000, // 10 seconds
      suggestionTypes: ['tip', 'positive'],
      showObjectives: true,
      showPersonaMood: true,
      challengeId: options.challengeId,
      personaId: options.personaId,
    }
  }

  // real_call_analysis
  return {
    analysisInterval: 0, // No real-time analysis
    suggestionTypes: ['tip'],
    postCallOnly: true,
  }
}
