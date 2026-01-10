import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import {
  UnifiedScoringResult,
  UnifiedScoreBreakdown,
  ScoreCategoryDetail,
  AnalyzeCallRequest,
  AnalyzeCallResponse,
  SCORE_WEIGHTS,
  getPerformanceLevel,
} from '@/types/scenarios'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

// POST /api/scoring/analyze - Unified call scoring
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

    const body: AnalyzeCallRequest = await request.json()
    const { transcript, call_type, context } = body

    if (!transcript || transcript.length < 100) {
      return NextResponse.json(
        { error: 'Transcript too short for meaningful analysis' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI not configured' },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

    // Build context-aware prompt
    const contextSection = context ? `
KNOWN CONTEXT:
${context.prospect_name ? `- Prospect Name: ${context.prospect_name}` : ''}
${context.prospect_company ? `- Prospect Company: ${context.prospect_company}` : ''}
${context.known_objections?.length ? `- Known Objections to Watch For: ${context.known_objections.join(', ')}` : ''}
${context.known_pain_points?.length ? `- Known Pain Points to Address: ${context.known_pain_points.join(', ')}` : ''}
${context.improvement_areas?.length ? `- Areas User Should Improve: ${context.improvement_areas.join(', ')}` : ''}
` : ''

    const scoringPrompt = `You are an expert sales call analyst. Analyze this ${call_type} sales call transcript and provide detailed scoring.

${contextSection}

SCORING CATEGORIES (100 points total):

1. DISCOVERY (25 points max)
   - Quality and depth of discovery questions
   - Uncovering prospect's situation, challenges, and needs
   - Active listening and follow-up questions
   - Understanding decision-making process

2. OBJECTION HANDLING (25 points max)
   - Recognizing objections early
   - Addressing concerns effectively
   - Turning objections into opportunities
   - Not being defensive or dismissive

3. VALUE ARTICULATION (20 points max)
   - Clear communication of product/service value
   - Connecting value to prospect's specific needs
   - Differentiating from alternatives
   - Quantifying benefits when possible

4. CALL CONTROL (15 points max)
   - Managing the conversation flow
   - Appropriate talk/listen ratio (aim for 30-40% talk)
   - Setting and following agendas
   - Handling tangents appropriately

5. CLOSE EXECUTION (15 points max)
   - Moving toward clear next steps
   - Trial closes throughout
   - Asking for commitments
   - Establishing timeline and follow-up

Return a JSON object with this exact structure:
{
  "total_score": <number 0-100>,
  "score_breakdown": {
    "discovery": <number 0-25>,
    "objection_handling": <number 0-25>,
    "value_articulation": <number 0-20>,
    "call_control": <number 0-15>,
    "close_execution": <number 0-15>
  },
  "category_details": {
    "discovery": {
      "score": <number>,
      "feedback": "<2-3 sentences>",
      "highlights": ["<specific positive example from call>"],
      "improvements": ["<specific actionable improvement>"]
    },
    "objection_handling": {
      "score": <number>,
      "feedback": "<2-3 sentences>",
      "highlights": ["<specific positive example>"],
      "improvements": ["<specific improvement>"]
    },
    "value_articulation": {
      "score": <number>,
      "feedback": "<2-3 sentences>",
      "highlights": ["<specific positive example>"],
      "improvements": ["<specific improvement>"]
    },
    "call_control": {
      "score": <number>,
      "feedback": "<2-3 sentences>",
      "highlights": ["<specific positive example>"],
      "improvements": ["<specific improvement>"]
    },
    "close_execution": {
      "score": <number>,
      "feedback": "<2-3 sentences>",
      "highlights": ["<specific positive example>"],
      "improvements": ["<specific improvement>"]
    }
  },
  "overall_feedback": "<3-4 sentence overall assessment>",
  "key_strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "key_improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "next_steps": ["<recommended action 1>", "<recommended action 2>"]
}

Be specific with examples from the transcript. Be honest but constructive.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: scoringPrompt },
        { role: 'user', content: `Analyze this transcript:\n\n${transcript.substring(0, 15000)}` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    const rawScoring = JSON.parse(content)

    // Validate and normalize scores
    const scoring = validateAndNormalizeScoring(rawScoring)

    // Calculate XP earned
    const xpEarned = calculateXPFromScore(scoring.total_score, call_type)

    const result: AnalyzeCallResponse = {
      scoring,
      xp_earned: xpEarned.total,
      xp_breakdown: xpEarned,
    }

    return NextResponse.json(result, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[Scoring] Error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze call' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

function validateAndNormalizeScoring(raw: Record<string, unknown>): UnifiedScoringResult {
  // Ensure score breakdown values are within bounds
  const rawBreakdown = raw.score_breakdown as Record<string, unknown> || {}
  const breakdown: UnifiedScoreBreakdown = {
    discovery: Math.min(SCORE_WEIGHTS.discovery, Math.max(0, Number(rawBreakdown.discovery) || 0)),
    objection_handling: Math.min(SCORE_WEIGHTS.objection_handling, Math.max(0, Number(rawBreakdown.objection_handling) || 0)),
    value_articulation: Math.min(SCORE_WEIGHTS.value_articulation, Math.max(0, Number(rawBreakdown.value_articulation) || 0)),
    call_control: Math.min(SCORE_WEIGHTS.call_control, Math.max(0, Number(rawBreakdown.call_control) || 0)),
    close_execution: Math.min(SCORE_WEIGHTS.close_execution, Math.max(0, Number(rawBreakdown.close_execution) || 0)),
  }

  // Recalculate total from breakdown for consistency
  const total_score = breakdown.discovery + breakdown.objection_handling + breakdown.value_articulation + breakdown.call_control + breakdown.close_execution

  // Process category details
  const rawDetails = raw.category_details as Record<string, Record<string, unknown>> || {}
  const category_details = {
    discovery: normalizeCategoryDetail(rawDetails.discovery, breakdown.discovery, SCORE_WEIGHTS.discovery),
    objection_handling: normalizeCategoryDetail(rawDetails.objection_handling, breakdown.objection_handling, SCORE_WEIGHTS.objection_handling),
    value_articulation: normalizeCategoryDetail(rawDetails.value_articulation, breakdown.value_articulation, SCORE_WEIGHTS.value_articulation),
    call_control: normalizeCategoryDetail(rawDetails.call_control, breakdown.call_control, SCORE_WEIGHTS.call_control),
    close_execution: normalizeCategoryDetail(rawDetails.close_execution, breakdown.close_execution, SCORE_WEIGHTS.close_execution),
  }

  return {
    total_score,
    score_breakdown: breakdown,
    category_details,
    overall_feedback: String(raw.overall_feedback || 'Analysis complete.'),
    key_strengths: ensureStringArray(raw.key_strengths),
    key_improvements: ensureStringArray(raw.key_improvements),
    next_steps: ensureStringArray(raw.next_steps),
  }
}

function normalizeCategoryDetail(
  raw: Record<string, unknown> | undefined,
  score: number,
  maxScore: number
): ScoreCategoryDetail {
  return {
    score,
    maxScore,
    percentage: Math.round((score / maxScore) * 100),
    feedback: String(raw?.feedback || 'No detailed feedback available.'),
    highlights: ensureStringArray(raw?.highlights),
    improvements: ensureStringArray(raw?.improvements),
  }
}

function ensureStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(v => typeof v === 'string').slice(0, 5)
  }
  return []
}

function calculateXPFromScore(
  score: number,
  callType: 'live' | 'practice' | 'scenario'
): { base: number; performance: number; improvement: number; streak: number; total: number } {
  // Base XP by call type
  const baseXP = callType === 'live' ? 100 : callType === 'scenario' ? 75 : 50

  // Performance bonus based on score
  let performanceXP = 0
  if (score >= 95) performanceXP = 200
  else if (score >= 90) performanceXP = 150
  else if (score >= 80) performanceXP = 100
  else if (score >= 70) performanceXP = 50
  else if (score >= 60) performanceXP = 25

  // Improvement bonus (would need previous score to calculate)
  const improvementXP = 0

  // Streak bonus (would need streak info to calculate)
  const streakXP = 0

  return {
    base: baseXP,
    performance: performanceXP,
    improvement: improvementXP,
    streak: streakXP,
    total: baseXP + performanceXP + improvementXP + streakXP,
  }
}
