import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getChallengeById, getPersonaById } from '@/lib/practice/challenges'
import { StartPracticeSessionRequest, PracticeSession, Difficulty } from '@/types/practice'

// POST /api/practice/session - Start a new practice session
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body: StartPracticeSessionRequest = await request.json()

    // Validate challenge exists
    const challenge = getChallengeById(body.challenge_id)
    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    // Validate persona exists
    const persona = getPersonaById(body.persona_id)
    if (!persona) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 })
    }

    // Check for existing active session
    const { data: existingSession } = await supabase
      .from('practice_sessions')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['pending', 'connecting', 'active'])
      .single()

    if (existingSession) {
      // End the existing session
      await supabase
        .from('practice_sessions')
        .update({
          status: 'failed',
          error_message: 'Session ended - new session started',
          ended_at: new Date().toISOString(),
        })
        .eq('id', existingSession.id)
    }

    // Create new practice session
    const { data: session, error: createError } = await supabase
      .from('practice_sessions')
      .insert({
        user_id: user.id,
        challenge_id: body.challenge_id,
        persona_id: body.persona_id,
        difficulty: body.difficulty,
        status: 'pending',
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating practice session:', createError)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    // Build Vapi configuration
    // The actual Vapi call will be initiated from the frontend
    // Note: serverUrl is configured in Vapi Dashboard, not here
    const vapiConfig = {
      // Vapi assistant configuration
      assistant: {
        name: persona.name,
        voice: {
          provider: '11labs' as const,
          voiceId: getVoiceIdForPersona(persona.id),
        },
        model: {
          provider: 'openai' as const,
          model: 'gpt-4',
          messages: [
            {
              role: 'system' as const,
              content: buildSystemPrompt(challenge, persona),
            },
          ],
        },
        firstMessage: getFirstMessage(persona),
      },
      // Metadata at call level (not inside assistant) to identify session in webhooks
      metadata: {
        session_id: session.id,
        user_id: user.id,
        challenge_id: body.challenge_id,
      },
    }

    return NextResponse.json({
      session: session as PracticeSession,
      vapi_config: vapiConfig,
      challenge,
      persona,
    })
  } catch (error) {
    console.error('Error in practice session POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/practice/session - Get active session
export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: session, error } = await supabase
      .from('practice_sessions')
      .select()
      .eq('user_id', user.id)
      .in('status', ['pending', 'connecting', 'active', 'analyzing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !session) {
      return NextResponse.json({ session: null })
    }

    const challenge = getChallengeById(session.challenge_id)
    const persona = getPersonaById(session.persona_id)

    return NextResponse.json({
      session: session as PracticeSession,
      challenge,
      persona,
    })
  } catch (error) {
    console.error('Error in practice session GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper to get ElevenLabs voice ID for persona
function getVoiceIdForPersona(personaId: string): string {
  const voiceMap: Record<string, string> = {
    'skeptical-cfo': '21m00Tcm4TlvDq8ikWAM', // Rachel - professional female
    'startup-founder': 'EXAVITQu4vr4xnSDxMaL', // Bella - energetic female
    'technical-gatekeeper': 'VR6AewLTigWG4xSOukaG', // Arnold - technical male
    'friendly-champion': 'MF3mGyEYCl7XYWbV9V6O', // Elli - warm female
    'hostile-executive': 'TxGEqnHWrfWFTfGW9XjX', // Josh - authoritative male
    'procurement-buyer': 'XB0fDUnXU5powFXDhCwa', // Charlotte - professional female
    'mad-scientist': 'DUnzBkwtjRWXPr6wRbmL', // Viktor - eccentric scientist
  }
  return voiceMap[personaId] || '21m00Tcm4TlvDq8ikWAM'
}

// Build system prompt combining challenge and persona
function buildSystemPrompt(challenge: ReturnType<typeof getChallengeById>, persona: ReturnType<typeof getPersonaById>): string {
  if (!challenge || !persona) return ''

  return `${persona.systemPrompt}

---

CHALLENGE CONTEXT:
${challenge.systemPrompt}

OBJECTIVES THE USER IS TRYING TO ACHIEVE:
${challenge.objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}

BONUS OBJECTIVES:
${challenge.bonusObjectives.map(b => `- ${b.name}: ${b.description}`).join('\n')}

Remember to stay in character throughout the call. Give the user opportunities to practice but don't make it too easy. This is a training exercise.`
}

// Get first message based on persona
function getFirstMessage(persona: ReturnType<typeof getPersonaById>): string {
  if (!persona) return "Hello, how can I help you today?"

  const firstMessages: Record<string, string> = {
    'skeptical-cfo': "Hello, this is Richard Sterling. I have about 15 minutes - my assistant said you wanted to discuss something. What's this about?",
    'startup-founder': "Hey! Maya here. Thanks for jumping on a call. So, I saw your demo last week and I'm intrigued. What else should I know?",
    'technical-gatekeeper': "David Park. I got pulled into this meeting - can you give me a quick overview of what we're looking at technically?",
    'friendly-champion': "Hi there! Sarah Martinez. I've been looking forward to this call. I think there's something interesting here - help me understand how to get this through my organization.",
    'hostile-executive': "Marcus Thompson. I've got 5 minutes before my next meeting. What is this about?",
    'procurement-buyer': "Good afternoon. Jennifer Walsh from procurement. I understand you're on our shortlist. I have some questions about pricing and terms.",
    'mad-scientist': "*sound of electricity crackling* Ah, another one... How did you get zis number? Are you with ze GOVERNMENT?! *suspicious pause* ...Speak quickly, before I release ze hounds! MWAHAHAHA!",
  }

  return firstMessages[persona.id] || "Hello, how can I help you today?"
}
