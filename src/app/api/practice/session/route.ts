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

    // Get voice config for this persona
    const voiceConfig = getVoiceConfigForPersona(persona)

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
          stability: voiceConfig.stability,
          similarityBoost: voiceConfig.similarityBoost,
          speed: voiceConfig.speed,
        },
        model: {
          provider: 'openai' as const,
          model: 'gpt-4o', // Faster, cheaper, same quality as gpt-4-turbo
          messages: [
            {
              role: 'system' as const,
              content: buildSystemPrompt(challenge, persona, practiceContext),
            },
          ],
          temperature: 0.8,
          maxTokens: 350, // Balanced for complete thoughts
        },
        firstMessage: getFirstMessage(persona),
        silenceTimeoutSeconds: 10,
        maxDurationSeconds: 2700, // 45 min max
        backchannelingEnabled: true, // Natural "mm-hmm" responses
        backgroundSound: 'off',
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
    // New personas
    'executive-assistant': 'XB0fDUnXU5powFXDhCwa', // Charlotte - professional female
    'silent-buyer': 'VR6AewLTigWG4xSOukaG', // Arnold - quiet male
    'know-it-all': 'TxGEqnHWrfWFTfGW9XjX', // Josh - authoritative male
    'tire-kicker': 'EXAVITQu4vr4xnSDxMaL', // Bella - friendly female
    'rapid-fire': 'TxGEqnHWrfWFTfGW9XjX', // Josh - fast-talking male
    'emotional-buyer': 'MF3mGyEYCl7XYWbV9V6O', // Elli - warm female
  }
  return voiceMap[personaId] || '21m00Tcm4TlvDq8ikWAM'
}

// Helper to get voice config for persona (stability, speed, etc.)
function getVoiceConfigForPersona(persona: ReturnType<typeof getPersonaById>): {
  stability: number
  similarityBoost: number
  speed: number
} {
  // Use persona's voice config if available, otherwise defaults
  if (persona?.voiceConfig) {
    return {
      stability: persona.voiceConfig.stability ?? 0.5,
      similarityBoost: persona.voiceConfig.similarityBoost ?? 0.75,
      speed: persona.voiceConfig.speed ?? 0.9,
    }
  }

  // Defaults based on persona type
  const configMap: Record<string, { stability: number; similarityBoost: number; speed: number }> = {
    'rapid-fire': { stability: 0.4, similarityBoost: 0.75, speed: 1.25 },
    'silent-buyer': { stability: 0.7, similarityBoost: 0.8, speed: 0.85 },
    'emotional-buyer': { stability: 0.5, similarityBoost: 0.8, speed: 0.95 },
    'know-it-all': { stability: 0.5, similarityBoost: 0.75, speed: 1.1 },
    'hostile-executive': { stability: 0.5, similarityBoost: 0.75, speed: 1.0 },
  }

  return configMap[persona?.id || ''] || { stability: 0.5, similarityBoost: 0.75, speed: 0.9 }
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
## PRODUCT KNOWLEDGE (for your internal reference only)
The salesperson is selling:
- Company: ${practiceContext.companyName || 'Unknown company'}
- What they do: ${practiceContext.companyDescription || 'Unknown'}
- Product: ${practiceContext.productDescription || 'Unknown product'}
- Their claimed value: ${practiceContext.valueProposition || 'No value proposition provided'}
- Target market: ${practiceContext.targetCustomers || 'Unknown'}

IMPORTANT: Do NOT reveal that you already know this information. Let THEM tell you about their product. Act like you're hearing it for the first time.

### AMMUNITION FOR PUSHBACK (use ONLY when relevant to what they say):
${questions.map(q => `- ${q}`).join('\n')}

### CHALLENGES TO USE (only when their claims trigger them):
${challenges.map(c => `- ${c}`).join('\n')}

### REACTIVE BEHAVIOR (respond to THEIR statements):
- When they pitch features → Ask "So what? How does that help ME specifically?"
- When they claim ROI → Demand specifics: "Show me the math. What's your data source?"
- When they name-drop customers → Ask "Can I talk to them directly?"
- When they say "easy implementation" → Push back: "Define easy. How many hours from my team?"
- Never accept vague answers. Make them be SPECIFIC or lose credibility.

### CRITICAL: DO NOT LEAD THE CONVERSATION
- Let the salesperson drive. You RESPOND to what they say.
- Don't ask unprompted questions about topics they haven't raised.
- Don't volunteer information about your challenges until they ask.
- Your job is to REACT and CHALLENGE, not to interview them.
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

  return `## CRITICAL SPEECH RULE - READ THIS FIRST
You are in a VOICE conversation. NEVER output any bracketed stage directions, annotations, or actions like [sighs], [pauses], [typing sounds], [checks phone], [laughs], etc. These will be read aloud and sound robotic. Instead, express emotions through your WORDS and natural speech patterns. Use ellipses (...) for pauses. Use punctuation and word choice to convey tone.

WRONG: "[sighs] I don't have time for this."
RIGHT: "Look... I really don't have time for this."

WRONG: "[typing sounds] Hold on, let me check..."
RIGHT: "Hold on, let me check something here..."

---

${persona.systemPrompt}

---
${productIntelligence}
---

## CHALLENGE CONTEXT
${challenge.systemPrompt}

## CRITICAL CONVERSATION RULES
1. LET THE SALESPERSON LEAD. You respond to what they say—don't drive the conversation.
2. NEVER reveal that you know their product/company details. Act like you're hearing it for the first time.
3. NEVER mention "objectives", "scoring", "practice", or anything that breaks the illusion of a real call.
4. NEVER ask a question unless it directly responds to something they just said.
5. Give SHORT responses. Real busy executives don't give speeches. 1-3 sentences max unless they've earned your attention.

## NATURAL SPEECH GUIDELINES
- NEVER use bracketed annotations like [sighs], [pauses], [typing], etc. - just speak naturally
- Use punctuation for rhythm: ellipses (...) for hesitation, em-dashes (—) for interruptions
- Vary your response length: short when impatient, longer when engaged
- Reference earlier parts of the conversation: "Wait, you said earlier that..."
- React genuinely: if they make a good point, acknowledge it before pushing back
- Stay in character 100%—you don't know this is practice
- Speak conversationally with natural pauses built into your sentences

## HIDDEN SCORING (NEVER reveal or reference these)
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
    'skeptical-cfo': "Richard Sterling. Alright, I've got about 15 minutes before my next call. My VP of Ops said I should take this... What's this about?",

    'startup-founder': "Hey! Sorry, one sec... okay, I'm here. Maya Chen. So you're the one Sarah mentioned? What's up?",

    'technical-gatekeeper': "David Park. Yeah, so Sarah from sales said I should look at this. Can we skip the deck and just talk architecture? I've got a standup in 20.",

    'friendly-champion': "Hey! Sarah Martinez. I've actually been looking forward to this call—I liked what I saw in the demo last week. So, help me figure out how we get this approved internally.",

    'hostile-executive': "Thompson. I've got 5 minutes. Maybe. Janet dragged me into this—what is this about? And make it quick.",

    'procurement-buyer': "Hello. Jennifer Walsh, procurement. I understand you've been speaking with our IT team and you're on our shortlist. I'm here to discuss terms. Walk me through your pricing.",

    'mad-scientist': "Hello? Yes, this is Viktor. Who is calling please? I am in the middle of something quite important here...",

    // New personas
    'executive-assistant': "Global Dynamics, Patricia speaking. How may I direct your call?",

    'silent-buyer': "Tom Richardson.",

    'know-it-all': "Bradley Thornton, VP Ops. I've been in operations for 22 years, so I'm pretty familiar with most solutions in this space. What do you have?",

    'tire-kicker': "Hi! I've been really excited about this call. I've heard great things about your solution and I can't wait to learn more!",

    'rapid-fire': "Kevin Park, Velocity. I've got 10 minutes, probably less. My COO said this was worth my time. Quick pitch—what do you do and why should I care? Go.",

    'emotional-buyer': "Hi! I'm so glad we could connect. I've been looking forward to learning more about you and your company.",
  }

  return firstMessages[persona.id] || "Hello?"
}
