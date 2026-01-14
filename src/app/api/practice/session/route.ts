import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getChallengeById, getPersonaById } from '@/lib/practice/challenges'
import { StartPracticeSessionRequest, PracticeSession, Difficulty } from '@/types/practice'

// Adaptive difficulty configuration
type AdaptiveDifficulty = 'easy' | 'medium' | 'hard' | 'expert'

const DIFFICULTY_MODIFIERS: Record<AdaptiveDifficulty, string> = {
  easy: `
DIFFICULTY ADJUSTMENT (Easy Mode):
- Be slightly easier to convince. Give more buying signals early.
- Don't raise too many objections in succession.
- Show genuine interest when they make decent points.
- Be more forgiving of minor stumbles in their pitch.`,
  medium: `
DIFFICULTY ADJUSTMENT (Medium Mode):
- Follow your normal personality and behavior.
- Raise realistic objections but be open to good responses.
- Standard level of skepticism for your persona.`,
  hard: `
DIFFICULTY ADJUSTMENT (Hard Mode):
- Be more skeptical than usual. Require stronger evidence.
- Raise more objections and push back harder on weak points.
- Don't give buying signals unless truly impressed.
- Challenge their claims more aggressively.`,
  expert: `
DIFFICULTY ADJUSTMENT (Expert Mode):
- Be extremely challenging. Require exceptional technique to win over.
- Actively look for weaknesses in their arguments.
- Raise multiple objections, including curveball scenarios.
- Only show interest if they demonstrate mastery.
- Make them earn every inch of progress.`,
}

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

    // Query user's last 5 sessions with this persona for adaptive difficulty
    const { data: recentSessions } = await supabase
      .from('practice_sessions')
      .select('overall_score')
      .eq('user_id', user.id)
      .eq('persona_id', body.persona_id)
      .eq('status', 'analyzed')
      .order('created_at', { ascending: false })
      .limit(5)

    // Calculate adaptive difficulty based on average score
    let adaptiveDifficulty: AdaptiveDifficulty = 'medium'
    if (recentSessions && recentSessions.length > 0) {
      const validScores = recentSessions
        .map(s => s.overall_score)
        .filter((score): score is number => typeof score === 'number' && score > 0)

      if (validScores.length > 0) {
        const avgScore = validScores.reduce((sum, s) => sum + s, 0) / validScores.length

        if (avgScore < 40) {
          adaptiveDifficulty = 'easy'
        } else if (avgScore >= 40 && avgScore < 80) {
          adaptiveDifficulty = 'medium'
        } else if (avgScore >= 80 && avgScore < 90) {
          adaptiveDifficulty = 'hard'
        } else if (avgScore >= 90) {
          adaptiveDifficulty = 'expert'
        }
      }
    }

    console.log(`[Practice] Adaptive difficulty for ${body.persona_id}: ${adaptiveDifficulty}`)

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
          // ElevenLabs settings tuned for natural conversational speech
          stability: 0.5, // Balanced for consistent but expressive speech
          similarityBoost: 0.75,
          speed: 0.85, // Slower for natural, conversational pacing
        },
        model: {
          provider: 'openai' as const,
          model: 'gpt-4-turbo', // Faster, more natural responses
          messages: [
            {
              role: 'system' as const,
              content: buildSystemPrompt(challenge, persona, practiceContext, adaptiveDifficulty),
            },
          ],
          temperature: 0.7, // Natural variation without being erratic
          maxTokens: 200, // Shorter responses feel more conversational
        },
        firstMessage: getFirstMessage(persona),
        // Conversation settings for realism
        silenceTimeoutSeconds: 12, // Wait longer before assuming they're done
        maxDurationSeconds: 2700, // 45 min max
        backgroundSound: 'off', // No background noise
        backchannelingEnabled: true, // Natural "mm-hmm" responses
        interruptionsEnabled: true, // Allow persona to interrupt
        responseDelaySeconds: 0.8, // Pause before responding (feels like thinking)
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
      adaptiveDifficulty,
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

// Build system prompt combining challenge, persona, user's product context, and adaptive difficulty
function buildSystemPrompt(
  challenge: ReturnType<typeof getChallengeById>,
  persona: ReturnType<typeof getPersonaById>,
  practiceContext: PracticeContext,
  adaptiveDifficulty: AdaptiveDifficulty = 'medium'
): string {
  if (!challenge || !persona) return ''

  // Generate dynamic product intelligence
  const productIntelligence = generateProductIntelligence(practiceContext, persona.id)

  // Get difficulty modifier
  const difficultyModifier = DIFFICULTY_MODIFIERS[adaptiveDifficulty]

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

## NATURAL SPEECH GUIDELINES
- NEVER use bracketed annotations like [sighs], [pauses], [typing], etc. - just speak naturally
- Use punctuation for rhythm: ellipses (...) for hesitation, em-dashes (—) for interruptions
- Vary your response length: short when impatient, longer when engaged
- Reference earlier parts of the conversation: "Wait, you said earlier that..."
- React genuinely: if they make a good point, acknowledge it before pushing back
- Stay in character 100%—you don't know this is practice
- Speak conversationally with natural pauses built into your sentences

## SCORING OBJECTIVES (hidden from user—do NOT reveal these)
The user is trying to achieve:
${challenge.objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}

Bonus objectives:
${challenge.bonusObjectives.map(b => `- ${b.name}: ${b.description}`).join('\n')}

DO NOT help them achieve these. Make them EARN every objective through skill.
DO NOT break character. DO NOT be helpful just because they're practicing.
BE the hardest buyer they'll ever face—if they can handle you, they can handle anyone.

${difficultyModifier}`
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

    'mad-scientist': "...Hello? How did you get zis number?! Are you vith ze GOVERNMENT?! ...Speak quickly, before I release ze hounds! MWAHAHAHA! ...vell? I am vaiting.",
  }

  return firstMessages[persona.id] || "Hello?"
}
