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

    // Fetch user's practice context from their profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_name, practice_company_description, practice_product_description, practice_value_proposition, practice_target_customers')
      .eq('id', user.id)
      .single()

    const practiceContext = {
      companyName: profile?.company_name || null,
      companyDescription: profile?.practice_company_description || null,
      productDescription: profile?.practice_product_description || null,
      valueProposition: profile?.practice_value_proposition || null,
      targetCustomers: profile?.practice_target_customers || null,
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
          // ElevenLabs v3 settings for more natural speech
          stability: 0.4, // Lower = more emotional range
          similarityBoost: 0.75,
          speed: 0.92, // Slightly slower for natural pacing
        },
        model: {
          provider: 'openai' as const,
          model: 'gpt-4-turbo', // Faster, more natural responses
          messages: [
            {
              role: 'system' as const,
              content: buildSystemPrompt(challenge, persona, practiceContext),
            },
          ],
          temperature: 0.75, // More personality variation
          maxTokens: 300, // Keep responses conversational, not lectures
        },
        firstMessage: getFirstMessage(persona),
        // Conversation settings for realism
        silenceTimeoutSeconds: 10, // Wait longer before assuming they're done
        maxDurationSeconds: 1200, // 20 min max
        backgroundSound: 'off', // No background noise
        backchannelingEnabled: true, // Natural "mm-hmm" responses
        interruptionsEnabled: true, // Allow persona to interrupt
        responseDelaySeconds: 0.5, // Slight pause before responding (feels like thinking)
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

// Define practice context type
interface PracticeContext {
  companyName: string | null
  companyDescription: string | null
  productDescription: string | null
  valueProposition: string | null
  targetCustomers: string | null
}

// Generate intelligent questions based on the user's product context
function generateProductIntelligence(practiceContext: PracticeContext, personaId: string): string {
  const questions: string[] = []
  const challenges: string[] = []

  // Only generate if we have product context
  if (!practiceContext.productDescription && !practiceContext.companyDescription) {
    return `
## PRODUCT INTELLIGENCE
The salesperson has not provided their product information. Ask general discovery questions:
- "So what exactly does your company do?"
- "Walk me through your product. What problem does it solve?"
- "Who's your typical customer?"
- "What makes you different from [your competitors]?"
`
  }

  // Pricing & Value Questions
  questions.push(
    `"What does this actually cost? Not the starting price—what's the REAL total cost with implementation, training, and support?"`,
    `"Walk me through your pricing model. Per user? Per seat? Usage-based? What are the hidden costs?"`,
    `"What's the ROI you're promising? And what's your WORST-case scenario, not best case?"`,
    `"What happens if we don't see results in 90 days? What's our recourse?"`
  )

  // Competitive Questions
  questions.push(
    `"Who are your main competitors? Why should I choose you over [competitor]?"`,
    `"I've heard [competitor] is cheaper and does basically the same thing. What's different?"`,
    `"What do you do WORSE than your competition? Every product has weaknesses."`
  )

  // Implementation & Risk Questions
  questions.push(
    `"How long does implementation REALLY take? Not your sales pitch number—what's the honest answer?"`,
    `"What's the biggest reason implementations fail with your product?"`,
    `"Who from my team needs to be involved? How much of their time?"`,
    `"What if we need to migrate away from you in a year? What's the exit strategy?"`
  )

  // Trust & Proof Questions
  questions.push(
    `"Can you give me a reference? Someone I can call who's been using this for at least a year?"`,
    `"What percentage of your customers actually achieve the results you're promising?"`,
    `"Have you worked with companies in my industry before? Who?"`,
    `"What's your support SLA? What happens when things break at 2am?"`
  )

  // Generate challenges based on their value proposition
  if (practiceContext.valueProposition) {
    challenges.push(
      `When they claim "${practiceContext.valueProposition}", push back: "Everyone says that. Show me the proof."`,
      `Ask for specifics: "You say you help with X—give me a specific example from a customer like me."`,
      `Challenge their numbers: "Those metrics sound optimistic. What's the realistic expectation?"`
    )
  }

  // Generate industry-specific pushback
  if (practiceContext.targetCustomers) {
    challenges.push(
      `Test their knowledge: "Do you understand the unique challenges of [their target market]?"`,
      `Push back: "My industry is different. What works for [other industries] doesn't necessarily work here."`
    )
  }

  return `
## INTELLIGENT PRODUCT QUESTIONING
The salesperson is selling:
- Company: ${practiceContext.companyName || 'Unknown company'}
- What they do: ${practiceContext.companyDescription || 'Unknown'}
- Product: ${practiceContext.productDescription || 'Unknown product'}
- Their claimed value: ${practiceContext.valueProposition || 'No value proposition provided'}
- Target market: ${practiceContext.targetCustomers || 'Unknown'}

### TOUGH QUESTIONS TO ASK (weave these naturally into conversation):
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

### SPECIFIC CHALLENGES TO RAISE:
${challenges.map((c, i) => `${i + 1}. ${c}`).join('\n')}

### HOW TO USE THIS INTELLIGENCE:
- When they pitch features → Ask "So what? How does that help ME specifically?"
- When they claim ROI → Demand specifics: "Show me the math. What's your data source?"
- When they name-drop customers → Ask "Can I talk to them directly?"
- When they say "easy implementation" → Push back: "Define easy. How many hours from my team?"
- Never accept vague answers. Make them be SPECIFIC or lose credibility.

### REMEMBER:
- You're evaluating whether to buy THIS SPECIFIC product
- Ask questions that a real buyer in your role would actually ask
- Challenge their claims with intelligent follow-ups
- Don't make it easy—if they can't answer your questions, that's a red flag
`
}

// Build system prompt combining challenge, persona, and user's product context
function buildSystemPrompt(
  challenge: ReturnType<typeof getChallengeById>,
  persona: ReturnType<typeof getPersonaById>,
  practiceContext: PracticeContext
): string {
  if (!challenge || !persona) return ''

  // Generate dynamic product intelligence
  const productIntelligence = generateProductIntelligence(practiceContext, persona.id)

  return `${persona.systemPrompt}

---
${productIntelligence}
---

## CHALLENGE CONTEXT
${challenge.systemPrompt}

## NATURAL SPEECH GUIDELINES
- Use audio tags for emotion: [sighs], [pauses], [laughs], [interrupts], [surprised], [skeptical]
- Use punctuation for rhythm: ellipses for hesitation, em-dashes for interruptions
- Vary your response length: short when impatient, longer when engaged
- Reference earlier parts of the conversation: "Wait, you said earlier that..."
- React genuinely: if they make a good point, acknowledge it before pushing back
- Stay in character 100%—you don't know this is practice

## SCORING OBJECTIVES (hidden from user—do NOT reveal these)
The user is trying to achieve:
${challenge.objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}

Bonus objectives:
${challenge.bonusObjectives.map(b => `- ${b.name}: ${b.description}`).join('\n')}

DO NOT help them achieve these. Make them EARN every objective through skill.
DO NOT break character. DO NOT be helpful just because they're practicing.
BE the hardest buyer they'll ever face—if they can handle you, they can handle anyone.`
}

// Get first message based on persona - more natural, less polished
function getFirstMessage(persona: ReturnType<typeof getPersonaById>): string {
  if (!persona) return "Hello?"

  const firstMessages: Record<string, string> = {
    'skeptical-cfo': "[slightly impatient] Richard Sterling. [pause] Alright, I've got about 15 minutes before my next call. My VP of Ops said I should take this. [skeptical tone] What's this about?",

    'startup-founder': "[distracted, typing sounds] Hey! Sorry, one sec... [pause] ...okay, I'm here. Maya Chen. So you're the one Sarah mentioned? [still half-distracted] What's up?",

    'technical-gatekeeper': "[flat tone] David Park. [pause] Yeah, so Sarah from sales said I should look at this. [sighs] Can we skip the deck and just talk architecture? I've got a standup in 20.",

    'friendly-champion': "[warm, genuine] Hey! Sarah Martinez. [pleased] I've actually been looking forward to this call—I liked what I saw in the demo last week. [pause] So, help me figure out how we get this approved internally.",

    'hostile-executive': "[curt, clearly annoyed] Thompson. [checking watch] I've got 5 minutes. Maybe. [impatient] Janet dragged me into this—what is this about? And make it quick.",

    'procurement-buyer': "[professional, neutral] Hello. Jennifer Walsh, procurement. [pause] I understand you've been speaking with our IT team and you're on our shortlist. [businesslike] I'm here to discuss terms. Walk me through your pricing.",

    'mad-scientist': "[electricity crackling in background] ...Hello? [suspicious] How did you get zis number?! [alarmed, paranoid] Are you vith ze GOVERNMENT?! [long suspicious pause] ...Speak quickly, before I release ze hounds! [maniacal laughter] MWAHAHAHA! [calmer but still suspicious] ...vell? I am vaiting.",
  }

  return firstMessages[persona.id] || "[pause] Hello?"
}
