import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getChallengeById, getPersonaById } from '@/lib/practice/challenges'
import { PracticeSession, calculateSessionXP } from '@/types/practice'

// GET /api/practice/session/[id] - Get session details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: session, error } = await supabase
      .from('practice_sessions')
      .select()
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const challenge = getChallengeById(session.challenge_id)
    const persona = getPersonaById(session.persona_id)

    return NextResponse.json({
      session: session as PracticeSession,
      challenge,
      persona,
    })
  } catch (error) {
    console.error('Error in session GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/practice/session/[id] - Update session (e.g., mark as active, ended)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Get existing session
    const { data: existing, error: existError } = await supabase
      .from('practice_sessions')
      .select()
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (existError || !existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    // Handle status updates
    if (body.status) {
      updateData.status = body.status

      if (body.status === 'active' && !existing.started_at) {
        updateData.started_at = new Date().toISOString()
      }

      if (body.status === 'ended' && !existing.ended_at) {
        updateData.ended_at = new Date().toISOString()
        if (existing.started_at) {
          updateData.duration_seconds = Math.round(
            (new Date().getTime() - new Date(existing.started_at).getTime()) / 1000
          )
        }
      }
    }

    // Handle Vapi call ID
    if (body.vapi_call_id) {
      updateData.vapi_call_id = body.vapi_call_id
    }

    // Handle transcript update
    if (body.transcript) {
      updateData.transcript = body.transcript
    }

    // Handle analysis results
    if (body.analysis) {
      updateData.analysis = body.analysis
    }

    // Handle scoring
    if (body.overall_score !== undefined) {
      updateData.overall_score = body.overall_score
    }

    if (body.objectives_completed) {
      updateData.objectives_completed = body.objectives_completed
    }

    if (body.bonus_objectives_completed) {
      updateData.bonus_objectives_completed = body.bonus_objectives_completed
    }

    // Handle error
    if (body.error_message) {
      updateData.error_message = body.error_message
    }

    const { data: session, error: updateError } = await supabase
      .from('practice_sessions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating session:', updateError)
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
    }

    const challenge = getChallengeById(session.challenge_id)
    const persona = getPersonaById(session.persona_id)

    return NextResponse.json({
      session: session as PracticeSession,
      challenge,
      persona,
    })
  } catch (error) {
    console.error('Error in session PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/practice/session/[id] - End and analyze session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const action = body.action as string

    // Get existing session
    const { data: existing, error: existError } = await supabase
      .from('practice_sessions')
      .select()
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (existError || !existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (action === 'end') {
      // Mark session as ended, trigger analysis
      const endedAt = new Date().toISOString()
      const durationSeconds = existing.started_at
        ? Math.round((new Date().getTime() - new Date(existing.started_at).getTime()) / 1000)
        : 0

      await supabase
        .from('practice_sessions')
        .update({
          status: 'analyzing',
          ended_at: endedAt,
          duration_seconds: durationSeconds,
        })
        .eq('id', id)

      // TODO: Trigger async analysis job
      // For now, we'll do inline analysis in the analyze endpoint

      return NextResponse.json({ success: true, status: 'analyzing' })
    }

    if (action === 'complete') {
      // Complete session with final results
      const challenge = getChallengeById(existing.challenge_id)
      const objectivesCompleted = body.objectives_completed || existing.objectives_completed || []
      const bonusObjectivesCompleted = body.bonus_objectives_completed || existing.bonus_objectives_completed || []
      const overallScore = body.overall_score || existing.overall_score || 0

      // Get user's current streak
      const { data: userStats } = await supabase
        .from('user_practice_stats')
        .select('current_streak')
        .eq('user_id', user.id)
        .single()

      const currentStreak = userStats?.current_streak || 0

      // Calculate XP
      const xpBreakdown = calculateSessionXP({
        difficulty: existing.difficulty,
        objectivesCompleted: objectivesCompleted.length,
        totalObjectives: challenge?.objectives.length || 0,
        bonusObjectivesCompleted: bonusObjectivesCompleted.length,
        overallScore,
        currentStreak: currentStreak + 1, // +1 because this session counts
      })

      const { data: session, error: updateError } = await supabase
        .from('practice_sessions')
        .update({
          status: 'completed',
          overall_score: overallScore,
          objectives_completed: objectivesCompleted,
          bonus_objectives_completed: bonusObjectivesCompleted,
          xp_earned: xpBreakdown.total,
          xp_breakdown: xpBreakdown,
          analysis: body.analysis || existing.analysis,
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error('Error completing session:', updateError)
        return NextResponse.json({ error: 'Failed to complete session' }, { status: 500 })
      }

      // Get updated user stats
      const { data: updatedStats } = await supabase
        .from('user_practice_stats')
        .select()
        .eq('user_id', user.id)
        .single()

      return NextResponse.json({
        session: session as PracticeSession,
        xp_breakdown: xpBreakdown,
        user_stats: updatedStats,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error in session POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
