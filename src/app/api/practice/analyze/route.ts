import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { getChallengeById, getPersonaById } from '@/lib/practice/challenges'
import { calculateSessionXP, PracticeSession } from '@/types/practice'
import { CallAnalysis } from '@/types/database'
import { extractKeyInfo } from '@/lib/unified/intelligence'

// ============================================================
// UNIFIED CO-PILOT INTEGRATION
// Adds key info extraction and optional unified routing
// ============================================================
const USE_UNIFIED_COPILOT = process.env.ENABLE_UNIFIED_COPILOT === 'true'

// Create OpenAI client lazily (not at module load time)
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required')
  }
  return new OpenAI({ apiKey })
}

// POST /api/practice/analyze - Analyze a completed practice session
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { session_id } = await request.json()

    if (!session_id) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Get the session
    const { data: session, error: sessionError } = await supabase
      .from('practice_sessions')
      .select()
      .eq('id', session_id)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (!session.transcript) {
      return NextResponse.json({ error: 'No transcript to analyze' }, { status: 400 })
    }

    // Get challenge and persona
    const challenge = getChallengeById(session.challenge_id)
    const persona = getPersonaById(session.persona_id)

    if (!challenge || !persona) {
      return NextResponse.json({ error: 'Challenge or persona not found' }, { status: 404 })
    }

    // Mark session as analyzing
    await supabase
      .from('practice_sessions')
      .update({ status: 'analyzing' })
      .eq('id', session_id)

    // =========================================================================
    // UNIFIED KEY INFO EXTRACTION
    // Extract the same key info as coaching for consistency
    // =========================================================================
    const keyInfo = extractKeyInfo(session.transcript as string, {})
    console.log(`[Practice] Key info extracted: ${keyInfo.painPoints.length} pain points, budget: ${keyInfo.budget || 'none'}`)

    // Build analysis prompt
    const analysisPrompt = buildAnalysisPrompt(session, challenge, persona)

    // Call OpenAI for analysis
    const openai = getOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert sales coach analyzing a practice call. Provide structured, actionable feedback.

You must respond with valid JSON matching this exact structure:
{
  "overall_score": <number 0-100>,
  "objectives_completed": [<array of objective strings that were completed>],
  "bonus_objectives_completed": [<array of bonus objective IDs that were achieved>],
  "analysis": {
    "opening_rapport": { "score": <0-100>, "feedback": "<string>", "highlights": [<strings>] },
    "discovery_questions": { "score": <0-100>, "feedback": "<string>", "highlights": [<strings>] },
    "pain_identification": { "score": <0-100>, "feedback": "<string>", "highlights": [<strings>] },
    "value_proposition": { "score": <0-100>, "feedback": "<string>", "highlights": [<strings>] },
    "objection_handling": { "score": <0-100>, "feedback": "<string>", "highlights": [<strings>] },
    "closing_techniques": { "score": <0-100>, "feedback": "<string>", "highlights": [<strings>] },
    "talk_listen_ratio": { "rep_percentage": <number>, "prospect_percentage": <number>, "feedback": "<string>" },
    "key_improvements": [<array of specific improvement suggestions>],
    "strengths": [<array of things done well>],
    "summary": "<2-3 sentence overall summary>"
  }
}`,
        },
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const analysisText = completion.choices[0].message.content
    if (!analysisText) {
      throw new Error('No analysis returned from OpenAI')
    }

    const analysisResult = JSON.parse(analysisText)

    // Get user's current streak for XP calculation
    const { data: userStats } = await supabase
      .from('user_practice_stats')
      .select('current_streak')
      .eq('user_id', user.id)
      .single()

    const currentStreak = userStats?.current_streak || 0

    // Calculate XP
    const xpBreakdown = calculateSessionXP({
      difficulty: session.difficulty,
      objectivesCompleted: analysisResult.objectives_completed?.length || 0,
      totalObjectives: challenge.objectives.length,
      bonusObjectivesCompleted: analysisResult.bonus_objectives_completed?.length || 0,
      overallScore: analysisResult.overall_score || 0,
      currentStreak: currentStreak + 1,
    })

    // Update session with results (including key_info for unified consistency)
    const { data: updatedSession, error: updateError } = await supabase
      .from('practice_sessions')
      .update({
        status: 'completed',
        analysis: analysisResult.analysis as CallAnalysis,
        overall_score: analysisResult.overall_score,
        objectives_completed: analysisResult.objectives_completed || [],
        bonus_objectives_completed: analysisResult.bonus_objectives_completed || [],
        xp_earned: xpBreakdown.total,
        xp_breakdown: xpBreakdown,
        key_info: keyInfo, // Unified key info extraction
      })
      .eq('id', session_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating session with analysis:', updateError)
      return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 })
    }

    // Get updated user stats (trigger should have updated them)
    const { data: updatedStats } = await supabase
      .from('user_practice_stats')
      .select()
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      session: updatedSession as PracticeSession,
      analysis: analysisResult.analysis,
      objectives_completed: analysisResult.objectives_completed,
      bonus_objectives_completed: analysisResult.bonus_objectives_completed,
      overall_score: analysisResult.overall_score,
      xp_breakdown: xpBreakdown,
      user_stats: updatedStats,
      // Unified key info for consistent coaching data
      keyInfo: {
        painPoints: keyInfo.painPoints,
        budget: keyInfo.budget,
        timeline: keyInfo.timeline,
        decisionMakers: keyInfo.decisionMakers,
        objections: keyInfo.objections,
        buyingSignals: keyInfo.buyingSignals,
      },
    })
  } catch (error) {
    console.error('Error analyzing practice session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function buildAnalysisPrompt(
  session: Record<string, unknown>,
  challenge: NonNullable<ReturnType<typeof getChallengeById>>,
  persona: NonNullable<ReturnType<typeof getPersonaById>>
): string {
  const durationSeconds = session.duration_seconds as number || 0
  const transcript = session.transcript as string || ''
  const wordCount = transcript.split(/\s+/).filter(w => w.length > 0).length

  return `Analyze this sales practice call.

CHALLENGE: ${challenge.name}
DESCRIPTION: ${challenge.description}
DIFFICULTY: ${challenge.difficulty}

PERSONA PLAYED BY AI: ${persona.name} - ${persona.title} at ${persona.company}
PERSONA DESCRIPTION: ${persona.description}
PERSONA TRAITS: ${persona.personality.join(', ')}

OBJECTIVES TO EVALUATE:
${challenge.objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}

BONUS OBJECTIVES:
${challenge.bonusObjectives.map(b => `- ${b.id}: ${b.name} - ${b.description}`).join('\n')}

CALL DURATION: ${durationSeconds} seconds
TRANSCRIPT WORD COUNT: ${wordCount} words

TRANSCRIPT:
${transcript}

---

CRITICAL SCORING RULES:
1. If the call was under 60 seconds, the overall_score should be MAX 30.
2. If the call was under 30 seconds, the overall_score should be MAX 15.
3. Only mark an objective as completed if there is CLEAR EVIDENCE in the transcript that it was achieved.
4. Do NOT give credit for objectives that were not explicitly demonstrated.
5. An empty or near-empty transcript means score of 0-10.
6. If the rep hung up early or the call ended abruptly, penalize heavily.

Analyze the sales rep's performance on this practice call. For each objective, determine if it was ACTUALLY completed based on the transcript evidence. Score each category 0-100 and provide specific, actionable feedback.

Be STRICT and HONEST. This is practice - giving inflated scores doesn't help the user improve. If they didn't do something well, say so. Only mark objectives_completed if there's clear transcript evidence.`
}
