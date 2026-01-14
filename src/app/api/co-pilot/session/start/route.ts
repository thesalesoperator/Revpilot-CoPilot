/**
 * Unified Co-Pilot Session Start Endpoint
 * POST /api/co-pilot/session/start
 *
 * Creates a unified co-pilot session supporting all contexts:
 * - live_coaching: Real-time coaching during actual sales calls
 * - practice: AI roleplay practice sessions
 * - real_call_analysis: Post-call analysis of recordings
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { SessionContext, CaptureMethod } from '@/lib/unified/types'

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// CORS headers for Chrome extension requests
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

interface StartSessionRequest {
  context: SessionContext
  captureMethod?: CaptureMethod
  meetingUrl?: string
  challengeId?: string
  personaId?: string
  userId?: string
  uploadedFileUrl?: string
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

    const body: StartSessionRequest = await request.json()
    const {
      context,
      captureMethod,
      meetingUrl,
      challengeId,
      personaId,
      userId,
      uploadedFileUrl,
    } = body

    // Validate required fields
    if (!context) {
      return NextResponse.json(
        { error: 'context is required' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Validate context value
    const validContexts: SessionContext[] = ['live_coaching', 'practice', 'real_call_analysis']
    if (!validContexts.includes(context)) {
      return NextResponse.json(
        { error: `Invalid context. Must be one of: ${validContexts.join(', ')}` },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Use authenticated user ID, fall back to provided userId for backward compatibility
    const sessionUserId = user.id || userId
    if (!sessionUserId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Context-specific validation
    if (context === 'live_coaching' && !meetingUrl && captureMethod !== 'tab_audio') {
      console.log('[CoPilot] Warning: live_coaching without meetingUrl')
    }

    if (context === 'practice' && !challengeId) {
      console.log('[CoPilot] Warning: practice without challengeId')
    }

    // Initialize empty key_info structure
    const initialKeyInfo = {
      anchorProblem: { identified: false },
      painPoints: [],
      decisionMakers: [],
      buyingSignals: [],
      objections: [],
      competitorsMentioned: [],
    }

    // Create unified session
    const { data: session, error: sessionError } = await supabase
      .from('co_pilot_sessions')
      .insert({
        user_id: sessionUserId,
        context,
        capture_method: captureMethod || (context === 'practice' ? 'vapi' : 'tab_audio'),
        meeting_url: meetingUrl || null,
        challenge_id: challengeId || null,
        persona_id: personaId || null,
        uploaded_file_url: uploadedFileUrl || null,
        status: 'starting',
        transcript: '',
        key_info: initialKeyInfo,
        script_progress: 0,
        sections_covered: [],
        objectives_completed: [],
        bonus_objectives_completed: [],
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (sessionError) {
      console.error('[CoPilot] Session creation error:', sessionError)
      return NextResponse.json(
        { error: sessionError.message },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    console.log(`[CoPilot] Session created: ${session.id} (${context})`)

    // Update status to active
    await supabase
      .from('co_pilot_sessions')
      .update({ status: 'active' })
      .eq('id', session.id)

    // Return session with context-specific config
    const config = getContextConfig(context, { challengeId, personaId })

    return NextResponse.json({
      sessionId: session.id,
      session: {
        ...session,
        status: 'active',
      },
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
 * Get context-specific configuration for the session
 */
function getContextConfig(
  context: SessionContext,
  options: { challengeId?: string; personaId?: string }
): Record<string, unknown> {
  if (context === 'live_coaching') {
    return {
      analysisInterval: 3000, // 3 seconds between analyses
      suggestionTypes: ['question', 'tip', 'objection', 'alert', 'positive', 'transition'],
      showScriptProgress: true,
      showKeyInfo: true,
      showTalkRatio: true,
      enableStreaming: true,
    }
  }

  if (context === 'practice') {
    return {
      analysisInterval: 10000, // 10 seconds for practice
      suggestionTypes: ['tip', 'positive', 'alert'],
      showObjectives: true,
      showPersonaMood: true,
      showScriptProgress: true,
      challengeId: options.challengeId,
      personaId: options.personaId,
      enableXP: true,
    }
  }

  if (context === 'real_call_analysis') {
    return {
      analysisInterval: 0, // No real-time analysis needed
      suggestionTypes: ['tip'],
      showFullAnalysis: true,
      enableScoring: true,
    }
  }

  // Default config
  return {
    analysisInterval: 5000,
    suggestionTypes: ['tip'],
  }
}
