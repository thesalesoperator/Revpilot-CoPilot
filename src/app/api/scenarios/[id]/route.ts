import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  AIScenario,
  ScenarioAttempt,
  ScenarioDetailsResponse,
} from '@/types/scenarios'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

// GET /api/scenarios/[id] - Get scenario details with attempts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const token = authHeader.split(' ')[1]
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    // Get scenario
    const { data: scenario, error: scenarioError } = await supabase
      .from('ai_scenarios')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (scenarioError || !scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    // Get attempts for this scenario
    const { data: attempts, error: attemptsError } = await supabase
      .from('scenario_attempts')
      .select('*')
      .eq('scenario_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (attemptsError) {
      console.error('[Scenarios] Error fetching attempts:', attemptsError)
    }

    // Calculate improvement trend
    const completedAttempts = (attempts || [])
      .filter((a: ScenarioAttempt) => a.status === 'completed' && a.total_score !== null)
      .reverse() // Oldest first for trend

    const attemptNumbers = completedAttempts.map((_: ScenarioAttempt, i: number) => i + 1)
    const scores = completedAttempts.map((a: ScenarioAttempt) => a.total_score || 0)

    // Calculate average improvement per attempt
    let averageImprovement = 0
    if (scores.length >= 2) {
      const improvements = []
      for (let i = 1; i < scores.length; i++) {
        improvements.push(scores[i] - scores[i - 1])
      }
      averageImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length
    }

    const response: ScenarioDetailsResponse = {
      scenario: scenario as AIScenario,
      attempts: (attempts || []) as ScenarioAttempt[],
      improvement_trend: {
        attempts: attemptNumbers,
        scores,
        average_improvement: Math.round(averageImprovement * 10) / 10,
      },
    }

    return NextResponse.json(response, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[Scenarios] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

// PATCH /api/scenarios/[id] - Update scenario (archive/unarchive, rename)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const token = authHeader.split(' ')[1]
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const body = await request.json()
    const { status, name } = body as { status?: 'active' | 'archived'; name?: string }

    // Verify ownership
    const { data: existing, error: existingError } = await supabase
      .from('ai_scenarios')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (existingError || !existing) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    // If trying to activate, check limit
    if (status === 'active' && existing.status === 'archived') {
      const { count: activeCount } = await supabase
        .from('ai_scenarios')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active')

      if ((activeCount || 0) >= 5) {
        return NextResponse.json(
          { error: 'Maximum of 5 active scenarios allowed. Please archive another scenario first.' },
          { status: 400, headers: CORS_HEADERS }
        )
      }
    }

    // Build update object
    const updates: Record<string, unknown> = {}
    if (status) updates.status = status
    if (name) updates.name = name

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const { data: scenario, error: updateError } = await supabase
      .from('ai_scenarios')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[Scenarios] Error updating scenario:', updateError)
      return NextResponse.json(
        { error: 'Failed to update scenario' },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    return NextResponse.json({ scenario: scenario as AIScenario }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[Scenarios] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

// DELETE /api/scenarios/[id] - Delete scenario permanently
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const token = authHeader.split(' ')[1]
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    // Verify ownership before delete
    const { data: existing, error: existingError } = await supabase
      .from('ai_scenarios')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (existingError || !existing) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    // Delete scenario (attempts will be cascade deleted)
    const { error: deleteError } = await supabase
      .from('ai_scenarios')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[Scenarios] Error deleting scenario:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete scenario' },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    return NextResponse.json({ success: true }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[Scenarios] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
