import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  AIScenario,
  ScenarioAttempt,
  StartScenarioAttemptResponse,
} from '@/types/scenarios'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

// POST /api/scenarios/[id]/attempt - Start a new practice attempt
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scenarioId } = await params

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
      .eq('id', scenarioId)
      .eq('user_id', user.id)
      .single()

    if (scenarioError || !scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    if (scenario.status !== 'active') {
      return NextResponse.json(
        { error: 'Cannot practice archived scenarios. Please activate the scenario first.' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Check for existing active attempt
    const { data: existingAttempt } = await supabase
      .from('scenario_attempts')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['pending', 'connecting', 'active'])
      .single()

    if (existingAttempt) {
      // End the existing attempt
      await supabase
        .from('scenario_attempts')
        .update({
          status: 'failed',
          error_message: 'Attempt ended - new attempt started',
          ended_at: new Date().toISOString(),
        })
        .eq('id', existingAttempt.id)
    }

    // Create new attempt
    const { data: attempt, error: createError } = await supabase
      .from('scenario_attempts')
      .insert({
        scenario_id: scenarioId,
        user_id: user.id,
        status: 'pending',
        improvements_made: [],
        remaining_improvements: scenario.improvement_areas || [],
      })
      .select()
      .single()

    if (createError) {
      console.error('[Scenarios] Error creating attempt:', createError)
      return NextResponse.json(
        { error: 'Failed to create attempt' },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    // Build Vapi configuration for this scenario
    const vapiConfig = {
      assistant: {
        name: scenario.prospect_name || 'Practice Prospect',
        voice: {
          provider: '11labs' as const,
          voiceId: scenario.voice_id || '21m00Tcm4TlvDq8ikWAM',
        },
        model: {
          provider: 'openai' as const,
          model: 'gpt-4o', // Use GPT-4o for quality persona responses
          messages: [
            {
              role: 'system' as const,
              content: scenario.system_prompt,
            },
          ],
        },
        firstMessage: scenario.first_message || "Hello, thanks for reaching out. What did you want to discuss today?",
      },
      metadata: {
        attempt_id: attempt.id,
        scenario_id: scenarioId,
        user_id: user.id,
        type: 'scenario_attempt',
      },
    }

    const response: StartScenarioAttemptResponse = {
      attempt: attempt as ScenarioAttempt,
      scenario: scenario as AIScenario,
      vapi_config: vapiConfig,
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
