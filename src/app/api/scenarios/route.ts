import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import {
  AIScenario,
  CreateScenarioRequest,
  CreateScenarioResponse,
  ListScenariosResponse,
} from '@/types/scenarios'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const MAX_ACTIVE_SCENARIOS = 5
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM' // Rachel - professional female

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

// GET /api/scenarios - List user's scenarios
export async function GET(request: NextRequest) {
  try {
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

    // Get status filter from query params
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') // 'active', 'archived', or null for all

    let query = supabase
      .from('ai_scenarios')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data: scenarios, error } = await query

    if (error) {
      console.error('[Scenarios] Error fetching scenarios:', error)
      return NextResponse.json(
        { error: 'Failed to fetch scenarios' },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    // Count active scenarios
    const activeCount = (scenarios || []).filter(s => s.status === 'active').length

    const response: ListScenariosResponse = {
      scenarios: (scenarios || []) as AIScenario[],
      active_count: activeCount,
      max_active: MAX_ACTIVE_SCENARIOS,
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

// POST /api/scenarios - Create a new scenario from a coaching session
export async function POST(request: NextRequest) {
  try {
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

    const body: CreateScenarioRequest = await request.json()
    const { source_session_id, name } = body

    if (!source_session_id) {
      return NextResponse.json(
        { error: 'Source session ID required' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Check active scenario count
    const { count: activeCount } = await supabase
      .from('ai_scenarios')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active')

    if ((activeCount || 0) >= MAX_ACTIVE_SCENARIOS) {
      return NextResponse.json(
        {
          error: `Maximum of ${MAX_ACTIVE_SCENARIOS} active scenarios allowed. Please archive an existing scenario first.`,
          active_count: activeCount,
          max_active: MAX_ACTIVE_SCENARIOS,
        },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Try to get source from coaching_sessions first, then call_recordings
    let session: Record<string, unknown> | null = null

    // Try coaching sessions
    const { data: coachingSession } = await supabase
      .from('coaching_sessions')
      .select('*')
      .eq('id', source_session_id)
      .eq('user_id', user.id)
      .single()

    if (coachingSession) {
      session = coachingSession
    } else {
      // Try call recordings
      const { data: callRecording } = await supabase
        .from('call_recordings')
        .select('*')
        .eq('id', source_session_id)
        .eq('user_id', user.id)
        .single()

      if (callRecording) {
        session = callRecording
      }
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Source session or recording not found' },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    const transcript = String(session.transcript || '')
    if (transcript.length < 200) {
      return NextResponse.json(
        { error: 'Transcript too short to create scenario' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Extract scenario details using AI
    const scenarioDetails = await extractScenarioFromSession(session)

    // Create the scenario
    const { data: scenario, error: createError } = await supabase
      .from('ai_scenarios')
      .insert({
        user_id: user.id,
        source_session_id,
        name: name || scenarioDetails.name,
        description: scenarioDetails.description,
        prospect_name: scenarioDetails.prospect_name,
        prospect_title: scenarioDetails.prospect_title,
        prospect_company: scenarioDetails.prospect_company,
        prospect_personality: scenarioDetails.prospect_personality,
        anchor_problem: scenarioDetails.anchor_problem,
        pain_points: scenarioDetails.pain_points,
        objections: scenarioDetails.objections,
        buying_signals: scenarioDetails.buying_signals,
        improvement_areas: scenarioDetails.improvement_areas,
        missed_opportunities: scenarioDetails.missed_opportunities,
        system_prompt: scenarioDetails.system_prompt,
        first_message: scenarioDetails.first_message,
        voice_id: DEFAULT_VOICE_ID,
        status: 'active',
      })
      .select()
      .single()

    if (createError) {
      console.error('[Scenarios] Error creating scenario:', createError)
      return NextResponse.json(
        { error: 'Failed to create scenario' },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    const response: CreateScenarioResponse = {
      scenario: scenario as AIScenario,
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

interface ScenarioExtractionResult {
  name: string
  description: string
  prospect_name: string | null
  prospect_title: string | null
  prospect_company: string | null
  prospect_personality: string
  anchor_problem: { problem: string; category: string; severity: string } | null
  pain_points: string[]
  objections: string[]
  buying_signals: string[]
  improvement_areas: string[]
  missed_opportunities: string[]
  system_prompt: string
  first_message: string
}

async function extractScenarioFromSession(session: Record<string, unknown>): Promise<ScenarioExtractionResult> {
  // Default fallback if AI extraction fails
  const defaultResult: ScenarioExtractionResult = {
    name: 'Practice Scenario',
    description: 'AI-generated practice scenario from a real call',
    prospect_name: null,
    prospect_title: null,
    prospect_company: null,
    prospect_personality: 'Professional and direct. Asks good questions and is genuinely interested in solving their problems.',
    anchor_problem: null,
    pain_points: [],
    objections: [],
    buying_signals: [],
    improvement_areas: [],
    missed_opportunities: [],
    system_prompt: '',
    first_message: "Hello, thanks for reaching out. What did you want to discuss today?",
  }

  if (!OPENAI_API_KEY) {
    return {
      ...defaultResult,
      system_prompt: buildBasicSystemPrompt(defaultResult),
    }
  }

  try {
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

    // Parse existing analysis if available
    const existingAnalysis = session.analysis as Record<string, unknown> | null

    const extractionPrompt = `Analyze this sales call transcript and extract detailed information to create a realistic AI practice scenario.

The goal is to create an AI persona that can replicate this prospect's behavior so the sales rep can practice handling this type of call better.

Extract the following in JSON format:
{
  "name": "<Short descriptive name for this scenario, e.g., 'Skeptical CFO at Tech Startup'>",
  "description": "<2-3 sentence description of the scenario challenge>",
  "prospect_name": "<Name mentioned in call or null>",
  "prospect_title": "<Title/role mentioned or inferred>",
  "prospect_company": "<Company name mentioned or null>",
  "prospect_personality": "<Detailed personality description: communication style, pace, attitude, concerns, what motivates them>",
  "anchor_problem": {
    "problem": "<The main problem/pain point they're trying to solve>",
    "category": "<Category: pipeline, forecasting, data, coaching, etc.>",
    "severity": "<low/medium/high/critical based on urgency expressed>"
  },
  "pain_points": ["<specific pain point 1>", "<pain point 2>", ...],
  "objections": ["<objection raised 1>", "<objection 2>", ...],
  "buying_signals": ["<positive signal 1>", "<signal 2>", ...],
  "improvement_areas": ["<what the rep should practice improving>", ...],
  "missed_opportunities": ["<opportunities the rep missed>", ...],
  "first_message": "<How this prospect would typically start the call - match their tone and style>"
}

Be specific and use actual details from the transcript. The AI will use this to roleplay as this prospect.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: extractionPrompt },
        {
          role: 'user',
          content: `Transcript:\n${String(session.transcript).substring(0, 12000)}${existingAnalysis ? `\n\nExisting Analysis:\n${JSON.stringify(existingAnalysis, null, 2)}` : ''}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 2000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    const extracted = JSON.parse(content)

    // Build the system prompt for the AI persona
    const systemPrompt = buildDetailedSystemPrompt(extracted)

    return {
      name: String(extracted.name || defaultResult.name),
      description: String(extracted.description || defaultResult.description),
      prospect_name: extracted.prospect_name || null,
      prospect_title: extracted.prospect_title || null,
      prospect_company: extracted.prospect_company || null,
      prospect_personality: String(extracted.prospect_personality || defaultResult.prospect_personality),
      anchor_problem: extracted.anchor_problem || null,
      pain_points: ensureStringArray(extracted.pain_points),
      objections: ensureStringArray(extracted.objections),
      buying_signals: ensureStringArray(extracted.buying_signals),
      improvement_areas: ensureStringArray(extracted.improvement_areas),
      missed_opportunities: ensureStringArray(extracted.missed_opportunities),
      system_prompt: systemPrompt,
      first_message: String(extracted.first_message || defaultResult.first_message),
    }

  } catch (error) {
    console.error('[Scenarios] Error extracting scenario:', error)
    return {
      ...defaultResult,
      system_prompt: buildBasicSystemPrompt(defaultResult),
    }
  }
}

function buildBasicSystemPrompt(details: ScenarioExtractionResult): string {
  return `You are a prospect in a sales call practice scenario. You are professional and direct.

Your role is to challenge the sales rep and help them practice their skills. Be realistic but fair.

Guidelines:
- Stay in character throughout the call
- Ask probing questions about their product
- Raise realistic objections
- Don't make it too easy - this is practice
- Eventually be open to next steps if they do well

Start the call professionally and see how they handle it.`
}

function buildDetailedSystemPrompt(details: Record<string, unknown>): string {
  const name = details.prospect_name || 'the prospect'
  const title = details.prospect_title || 'a decision-maker'
  const company = details.prospect_company || 'your company'
  const personality = details.prospect_personality || 'Professional and direct'

  const painPoints = ensureStringArray(details.pain_points)
  const objections = ensureStringArray(details.objections)
  const buyingSignals = ensureStringArray(details.buying_signals)
  const anchorProblem = details.anchor_problem as Record<string, string> | null

  return `You are ${name}, ${title} at ${company}. You are participating in a sales call where someone is trying to sell you their product/solution.

PERSONALITY & COMMUNICATION STYLE:
${personality}

YOUR SITUATION:
${anchorProblem ? `Main Problem: ${anchorProblem.problem} (${anchorProblem.severity} priority)` : 'You have general interest but no urgent problem.'}

YOUR PAIN POINTS (what's bothering you):
${painPoints.length > 0 ? painPoints.map(p => `- ${p}`).join('\n') : '- General curiosity about solutions in this space'}

OBJECTIONS YOU WILL RAISE:
${objections.length > 0 ? objections.map(o => `- ${o}`).join('\n') : '- Budget concerns\n- Timeline questions\n- Competitive alternatives'}

POSITIVE SIGNALS (if they handle things well):
${buyingSignals.length > 0 ? buyingSignals.map(s => `- ${s}`).join('\n') : '- Interest in demos\n- Questions about implementation\n- Asking about other customers'}

ROLEPLAY GUIDELINES:
1. Stay completely in character - you ARE this prospect
2. Start with your typical skepticism and concerns
3. Raise the objections naturally during conversation
4. If the rep handles objections well, show gradually increasing interest
5. Ask tough but fair questions about pricing, implementation, competitors
6. Don't volunteer information - make them ask good discovery questions
7. If they fail to uncover your pain points, hint at them subtly
8. Be realistic - eventually agree to next steps if they do a good job
9. Mirror the communication style described above
10. This is practice - challenge them but don't be impossible

Remember: Your job is to help this sales rep improve by giving them a realistic practice experience.`
}

function ensureStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(v => typeof v === 'string').slice(0, 10)
  }
  return []
}
