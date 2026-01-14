/**
 * Unified Co-Pilot Session End API
 *
 * Ends a session and triggers comprehensive post-call analysis:
 * - Generates overall scores across multiple dimensions
 * - Identifies strengths, improvements, and missed opportunities
 * - Calculates XP earned for gamification
 * - Updates user stats and leaderboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  SUPABASE_ANON_KEY,
  CORS_HEADERS,
} from '@/lib/coaching/config'
import {
  analyzeCall,
  extractKeyInfo,
} from '@/lib/unified/intelligence'
import { KeyInfo } from '@/lib/unified/types'

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params

    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      if (token && token !== 'undefined' && token !== 'null') {
        const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
        const { error: authError } = await authClient.auth.getUser(token)
        if (authError) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401, headers: CORS_HEADERS }
          )
        }
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('co_pilot_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    // Check if already completed
    if (session.status === 'completed') {
      return NextResponse.json({
        status: 'already_completed',
        session,
      }, { headers: CORS_HEADERS })
    }

    // Parse request body for any final transcript data
    let finalTranscript = (session.transcript as string) || ''
    try {
      const body = await request.json()
      if (body.transcript) {
        finalTranscript = body.transcript
      } else if (body.transcripts) {
        const additionalText = body.transcripts
          .map((t: { text: string; speaker?: number }) =>
            `[Speaker ${t.speaker ?? 0}]: ${t.text}`
          )
          .join('\n')
        finalTranscript += '\n' + additionalText
      }
    } catch {
      // No body or invalid JSON - use existing transcript
    }

    // Update status to analyzing
    await supabase
      .from('co_pilot_sessions')
      .update({ status: 'analyzing' })
      .eq('id', sessionId)

    // Calculate final duration
    const startedAt = session.started_at ? new Date(session.started_at) : new Date(session.created_at)
    const endedAt = new Date()
    const durationSeconds = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)

    // Final key info extraction
    const existingKeyInfo = (session.key_info as Partial<KeyInfo>) || {}
    const keyInfo = extractKeyInfo(finalTranscript, existingKeyInfo)

    // Get objectives for practice mode
    let objectives: string[] = []
    if (session.context === 'practice' && session.challenge_id) {
      // Could fetch objectives from challenge definition
      objectives = (session.objectives_completed as string[]) || []
    }

    // Perform comprehensive analysis
    const { overallScore, analysis, xpEarned, xpBreakdown } = await analyzeCall(
      finalTranscript,
      keyInfo,
      session.context,
      {
        challengeId: session.challenge_id,
        objectives,
        duration: durationSeconds,
      }
    )

    // Update session with final results
    const { error: updateError } = await supabase
      .from('co_pilot_sessions')
      .update({
        status: 'completed',
        transcript: finalTranscript,
        key_info: keyInfo,
        analysis: analysis,
        overall_score: overallScore,
        xp_earned: xpEarned,
        xp_breakdown: xpBreakdown,
        objectives_completed: analysis.strengths?.slice(0, 3) || [], // Map strengths to objectives
        ended_at: endedAt.toISOString(),
        duration_seconds: durationSeconds,
        updated_at: endedAt.toISOString(),
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('[CoPilot] Session end update error:', updateError)
    }

    // Update user's XP and stats
    if (xpEarned > 0) {
      await updateUserStats(supabase, session.user_id, xpEarned, session.context)
    }

    console.log(`[CoPilot] Session ended: ${sessionId} | Score: ${overallScore} | XP: ${xpEarned}`)

    return NextResponse.json({
      status: 'completed',
      sessionId,
      overallScore,
      analysis,
      xpEarned,
      xpBreakdown,
      keyInfo,
      durationSeconds,
    }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[CoPilot] End session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

/**
 * Updates user stats with XP earned from the session.
 */
async function updateUserStats(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  xpEarned: number,
  context: string
): Promise<void> {
  try {
    // Get current user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('xp, level, total_sessions, coaching_sessions, practice_sessions')
      .eq('id', userId)
      .single()

    if (!profile) return

    // Calculate new XP and level
    const newXP = (profile.xp || 0) + xpEarned
    const newLevel = calculateLevel(newXP)

    // Update stats based on context
    const updates: Record<string, number> = {
      xp: newXP,
      level: newLevel,
      total_sessions: (profile.total_sessions || 0) + 1,
    }

    if (context === 'live_coaching') {
      updates.coaching_sessions = (profile.coaching_sessions || 0) + 1
    } else if (context === 'practice') {
      updates.practice_sessions = (profile.practice_sessions || 0) + 1
    }

    await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)

  } catch (error) {
    console.error('[CoPilot] Error updating user stats:', error)
  }
}

/**
 * Calculates user level based on total XP.
 * Level thresholds increase exponentially.
 */
function calculateLevel(totalXP: number): number {
  // Level thresholds: 0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, ...
  // Formula: threshold(n) = 50 * n * (n + 1)
  let level = 1
  let threshold = 100

  while (totalXP >= threshold) {
    level++
    threshold = 50 * level * (level + 1)
  }

  return level
}
