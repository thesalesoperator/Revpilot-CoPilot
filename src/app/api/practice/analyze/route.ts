import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { getChallengeById, getPersonaById } from '@/lib/practice/challenges'
import { calculateSessionXP, PracticeSession } from '@/types/practice'
import { CallAnalysis } from '@/types/database'

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

    // Update session with results
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

CALL DURATION: ${session.duration_seconds} seconds

TRANSCRIPT:
${session.transcript}

---

Analyze the sales rep's performance on this practice call. For each objective, determine if it was completed based on the transcript. Score each category 0-100 and provide specific, actionable feedback.

Be tough but fair. This is practice, so honest feedback helps them improve.`
}
