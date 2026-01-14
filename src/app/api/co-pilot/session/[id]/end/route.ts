/**
 * Unified Co-Pilot Session End Endpoint
 * POST /api/co-pilot/session/[id]/end
 *
 * Finalizes a co-pilot session:
 * - Updates session status to 'analyzing' then 'completed'
 * - Calculates final duration
 * - Generates comprehensive call analysis with AI
 * - Calculates XP earned (for practice sessions)
 * - Saves to call_recordings for post-call review
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import type { KeyInfo, CallAnalysis, XPBreakdown, SessionContext } from '@/lib/unified/types'

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

// CORS headers for Chrome extension requests
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params

    // Verify auth token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const token = authHeader.split(' ')[1]

    // Verify user token
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401, headers: CORS_HEADERS }
      )
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

    // Verify session belongs to user
    if (session.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - session belongs to another user' },
        { status: 403, headers: CORS_HEADERS }
      )
    }

    // Check if session is already ended
    if (session.status === 'completed') {
      return NextResponse.json({
        success: true,
        message: 'Session already completed',
        sessionId,
        analysis: session.analysis,
        overallScore: session.overall_score,
        xpEarned: session.xp_earned,
      }, { headers: CORS_HEADERS })
    }

    // Calculate duration
    const startTime = new Date(session.started_at || session.created_at)
    const endTime = new Date()
    const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000)

    // Update status to analyzing
    await supabase
      .from('co_pilot_sessions')
      .update({
        status: 'analyzing',
        ended_at: endTime.toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq('id', sessionId)

    console.log(`[CoPilot] Session ${sessionId} ending. Duration: ${durationSeconds}s`)

    // Generate comprehensive analysis
    let analysis: CallAnalysis | null = null
    let overallScore = 0
    let xpEarned = 0
    let xpBreakdown: XPBreakdown | null = null

    const keyInfo = session.key_info as KeyInfo
    const transcript = session.transcript || ''

    if (OPENAI_API_KEY && transcript.length > 100) {
      const analysisResult = await generateCallAnalysis(
        transcript,
        keyInfo,
        session.context as SessionContext,
        {
          durationSeconds,
          challengeId: session.challenge_id,
          objectivesCompleted: session.objectives_completed || [],
        }
      )

      analysis = analysisResult.analysis
      overallScore = analysisResult.overallScore
      xpEarned = analysisResult.xpEarned
      xpBreakdown = analysisResult.xpBreakdown
    } else {
      // Basic scoring without AI
      overallScore = calculateBasicScore(keyInfo, durationSeconds)
      xpEarned = Math.round(overallScore * 0.5)
      xpBreakdown = {
        base: xpEarned,
        objectives: 0,
        bonus: 0,
        difficulty: 1,
        streak: 0,
        total: xpEarned,
      }
    }

    // Update session with final data
    const { error: updateError } = await supabase
      .from('co_pilot_sessions')
      .update({
        status: 'completed',
        analysis,
        overall_score: overallScore,
        xp_earned: xpEarned,
        xp_breakdown: xpBreakdown,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('[CoPilot] Session update error:', updateError)
    }

    // Save to call_recordings for post-call review (live_coaching and real_call_analysis)
    if (transcript && (session.context === 'live_coaching' || session.context === 'real_call_analysis')) {
      try {
        await supabase
          .from('call_recordings')
          .insert({
            user_id: user.id,
            title: `${session.context === 'live_coaching' ? 'Coaching Session' : 'Call Analysis'} - ${new Date(session.created_at).toLocaleDateString()}`,
            file_name: `copilot-session-${sessionId}`,
            file_url: `copilot://${sessionId}`,
            duration_seconds: durationSeconds,
            status: 'completed',
            transcript,
            analysis,
            overall_score: overallScore,
          })
      } catch (err) {
        console.error('[CoPilot] Error saving to call_recordings:', err)
      }
    }

    // Update user XP if earned (for practice mode)
    if (xpEarned > 0 && session.context === 'practice') {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('total_xp, level')
          .eq('id', user.id)
          .single()

        if (userData) {
          const newTotalXP = (userData.total_xp || 0) + xpEarned
          const newLevel = calculateLevel(newTotalXP)

          await supabase
            .from('users')
            .update({
              total_xp: newTotalXP,
              level: newLevel,
            })
            .eq('id', user.id)

          console.log(`[CoPilot] User ${user.id} earned ${xpEarned} XP. Total: ${newTotalXP}, Level: ${newLevel}`)
        }
      } catch (err) {
        console.error('[CoPilot] Error updating user XP:', err)
      }
    }

    console.log(`[CoPilot] Session ${sessionId} completed. Score: ${overallScore}, XP: ${xpEarned}`)

    return NextResponse.json({
      success: true,
      sessionId,
      duration: durationSeconds,
      overallScore,
      xpEarned,
      xpBreakdown,
      analysis,
      keyInfo,
    }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[CoPilot] End error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

/**
 * Generate comprehensive call analysis using AI
 */
async function generateCallAnalysis(
  transcript: string,
  keyInfo: KeyInfo,
  context: SessionContext,
  options: {
    durationSeconds: number
    challengeId?: string | null
    objectivesCompleted?: string[]
  }
): Promise<{
  analysis: CallAnalysis
  overallScore: number
  xpEarned: number
  xpBreakdown: XPBreakdown
}> {
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

  const prompt = `Analyze this sales call and score it comprehensively.

CONTEXT: ${context}
DURATION: ${options.durationSeconds} seconds (${Math.round(options.durationSeconds / 60)} minutes)
${options.objectivesCompleted?.length ? `OBJECTIVES COMPLETED: ${options.objectivesCompleted.join(', ')}` : ''}

TRANSCRIPT:
${transcript.slice(-8000)} ${transcript.length > 8000 ? '\n[...earlier conversation truncated...]' : ''}

KEY INFO EXTRACTED:
${JSON.stringify(keyInfo, null, 2)}

Provide a comprehensive JSON analysis:
{
  "overallScore": 0-100,
  "scores": {
    "discovery": 0-100,
    "qualification": 0-100,
    "valueArticulation": 0-100,
    "objectionHandling": 0-100,
    "closing": 0-100,
    "rapport": 0-100
  },
  "strengths": ["specific strength 1", "specific strength 2", "..."],
  "improvements": ["specific improvement 1", "specific improvement 2", "..."],
  "keyMoments": ["key moment 1", "key moment 2", "..."],
  "missedOpportunities": ["missed opportunity 1", "..."],
  "suggestedNextSteps": ["next step 1", "next step 2", "..."],
  "followUpQuestions": ["question 1", "question 2", "..."],
  "objectivesCompleted": ["objective 1", "..."],
  "bonusObjectivesCompleted": ["bonus 1", "..."]
}

SCORING RULES:
- Very short calls (<30 seconds): Max score 15
- Short calls (<60 seconds): Max score 30
- Incomplete discovery (no pain points): Max score 50
- Missing qualification (no budget/timeline): Max score 70
- No clear next steps: Reduce score by 10

Be specific in strengths/improvements - reference actual things said in the call.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Use full GPT-4o for comprehensive analysis
      messages: [
        {
          role: 'system',
          content: 'You are an expert sales coach analyzing call recordings. Provide detailed, actionable feedback.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content || '{}'
    const result = JSON.parse(content)

    const overallScore = result.overallScore || 0

    // Build CallAnalysis object
    const analysis: CallAnalysis = {
      overallScore,
      discovery: result.scores?.discovery || 0,
      qualification: result.scores?.qualification || 0,
      valueArticulation: result.scores?.valueArticulation || 0,
      objectionHandling: result.scores?.objectionHandling || 0,
      closing: result.scores?.closing || 0,
      rapport: result.scores?.rapport || 0,
      strengths: result.strengths || [],
      improvements: result.improvements || [],
      keyMoments: result.keyMoments || [],
      missedOpportunities: result.missedOpportunities || [],
      suggestedNextSteps: result.suggestedNextSteps || [],
      followUpQuestions: result.followUpQuestions || [],
    }

    // Calculate XP
    const xpBreakdown = calculateXP(
      overallScore,
      options.durationSeconds,
      context,
      result.objectivesCompleted?.length || 0,
      result.bonusObjectivesCompleted?.length || 0
    )

    return {
      analysis,
      overallScore,
      xpEarned: xpBreakdown.total,
      xpBreakdown,
    }
  } catch (error) {
    console.error('[CoPilot] Analysis generation error:', error)

    // Return basic analysis on error
    const basicScore = calculateBasicScore(keyInfo, options.durationSeconds)
    return {
      analysis: {
        overallScore: basicScore,
        discovery: basicScore,
        qualification: basicScore,
        valueArticulation: basicScore,
        objectionHandling: basicScore,
        closing: basicScore,
        rapport: basicScore,
        strengths: [],
        improvements: ['Analysis unavailable - please try again'],
        keyMoments: [],
        missedOpportunities: [],
        suggestedNextSteps: [],
        followUpQuestions: [],
      },
      overallScore: basicScore,
      xpEarned: Math.round(basicScore * 0.5),
      xpBreakdown: {
        base: Math.round(basicScore * 0.5),
        objectives: 0,
        bonus: 0,
        difficulty: 1,
        streak: 0,
        total: Math.round(basicScore * 0.5),
      },
    }
  }
}

/**
 * Calculate XP breakdown
 */
function calculateXP(
  overallScore: number,
  duration: number,
  context: SessionContext,
  objectivesCount: number,
  bonusCount: number
): XPBreakdown {
  // Base XP from score (0-50)
  const base = Math.round(overallScore * 0.5)

  // Objectives XP (25 each)
  const objectives = objectivesCount * 25

  // Bonus objectives (50 each)
  const bonus = bonusCount * 50

  // Duration bonus (encourages longer, more complete calls)
  let durationBonus = 0
  if (duration > 300) durationBonus = 25 // 5+ minutes
  else if (duration > 120) durationBonus = 10 // 2+ minutes

  // Difficulty multiplier (for future use)
  const difficulty = 1

  // Calculate total
  let total = base + objectives + bonus + durationBonus

  // Practice gets slightly less XP than real calls
  if (context === 'practice') {
    total = Math.round(total * 0.8)
  }

  return {
    base,
    objectives,
    bonus,
    difficulty,
    streak: 0, // TODO: Implement streak tracking
    total,
  }
}

/**
 * Calculate basic score without AI
 */
function calculateBasicScore(keyInfo: KeyInfo, duration: number): number {
  let score = 0

  // Duration-based base score
  if (duration > 300) score += 30
  else if (duration > 120) score += 20
  else if (duration > 60) score += 10
  else score += 5

  // Pain points discovered
  score += Math.min(keyInfo.painPoints.length * 10, 30)

  // Anchor problem identified
  if (keyInfo.anchorProblem?.identified) score += 15

  // Qualification info
  if (keyInfo.budget) score += 10
  if (keyInfo.timeline) score += 10
  if (keyInfo.decisionMakers.length > 0) score += 5

  return Math.min(score, 100)
}

/**
 * Calculate user level from total XP
 */
function calculateLevel(totalXP: number): number {
  // Level thresholds (exponential growth)
  const thresholds = [
    0,      // Level 1
    100,    // Level 2
    300,    // Level 3
    600,    // Level 4
    1000,   // Level 5
    1500,   // Level 6
    2100,   // Level 7
    2800,   // Level 8
    3600,   // Level 9
    4500,   // Level 10
    5500,   // Level 11
    6600,   // Level 12
    7800,   // Level 13
    9100,   // Level 14
    10500,  // Level 15
  ]

  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (totalXP >= thresholds[i]) {
      return i + 1
    }
  }

  return 1
}
