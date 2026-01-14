/**
 * Practice Session Real-Time Tips API
 *
 * Provides coaching tips during active practice sessions.
 * Uses the unified intelligence module for consistent coaching
 * across practice and live coaching modes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getChallengeById, getPersonaById } from '@/lib/practice/challenges'
import {
  generateSuggestion,
  extractKeyInfo,
  generateQuickTip,
} from '@/lib/unified/intelligence'

// POST /api/practice/session/[id]/tip - Get a coaching tip during practice
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: sessionId } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get the session
    const { data: session, error: sessionError } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Only provide tips for active sessions
    if (session.status !== 'active') {
      return NextResponse.json({ tip: null, reason: 'Session not active' })
    }

    // Get request body for recent transcript
    const body = await request.json().catch(() => ({}))
    const recentTranscript = body.transcript || (session.transcript as string) || ''
    const personaState = body.personaState || 'neutral'

    // Get challenge and persona for context
    const challenge = getChallengeById(session.challenge_id)
    const persona = getPersonaById(session.persona_id)

    if (!challenge || !persona) {
      return NextResponse.json({ error: 'Challenge or persona not found' }, { status: 404 })
    }

    // Extract key info from transcript
    const existingKeyInfo = (session.key_info as Record<string, unknown>) || {}
    const keyInfo = extractKeyInfo(recentTranscript, {
      painPoints: (existingKeyInfo.painPoints as string[]) || [],
      decisionMakers: (existingKeyInfo.decisionMakers as string[]) || [],
      buyingSignals: (existingKeyInfo.buyingSignals as string[]) || [],
      objections: (existingKeyInfo.objections as string[]) || [],
      competitorsMentioned: (existingKeyInfo.competitorsMentioned as string[]) || [],
    })

    // Get previous suggestions to avoid repetition
    const { data: prevTips } = await supabase
      .from('co_pilot_suggestions')
      .select('content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(5)

    const previousSuggestions = prevTips?.map(t => t.content) || []

    // Try quick tip first (faster, cheaper)
    let tip = await generateQuickTip(recentTranscript, personaState)

    // If no quick tip, try full suggestion generation
    if (!tip) {
      const suggestion = await generateSuggestion(
        'practice',
        recentTranscript,
        keyInfo,
        previousSuggestions,
        {
          personaId: session.persona_id,
          objectives: challenge.objectives,
        }
      )

      if (suggestion) {
        tip = suggestion.content

        // Save suggestion to database
        await supabase
          .from('co_pilot_suggestions')
          .insert({
            session_id: sessionId,
            context: 'practice',
            type: suggestion.type,
            content: suggestion.content,
            priority: suggestion.priority,
            metadata: {
              ...suggestion.metadata,
              challengeId: session.challenge_id,
              personaId: session.persona_id,
              personaState,
            },
          })
      }
    }

    // Update session with latest key info
    if (Object.keys(keyInfo).length > 0) {
      await supabase
        .from('practice_sessions')
        .update({ key_info: keyInfo })
        .eq('id', sessionId)
    }

    return NextResponse.json({
      tip,
      keyInfo: {
        painPoints: keyInfo.painPoints,
        objections: keyInfo.objections,
        buyingSignals: keyInfo.buyingSignals,
      },
      personaName: persona.name,
      challengeName: challenge.name,
    })

  } catch (error) {
    console.error('[Practice Tip] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
