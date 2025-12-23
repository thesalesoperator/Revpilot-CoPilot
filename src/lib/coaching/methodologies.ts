// Sales Methodology Configurations for AI Coaching
// Each methodology defines how the AI should coach during calls

export type MethodologyId = 'challenger' | 'nepq' | 'hormozi' | 'custom'

export interface SalesMethodology {
  id: MethodologyId
  name: string
  description: string
  author: string
  keyPrinciples: string[]
  coachingPrompt: string
  questionStyles: string[]
  objectionHandling: string
  closingApproach: string
}

export const METHODOLOGIES: Record<MethodologyId, SalesMethodology> = {
  challenger: {
    id: 'challenger',
    name: 'The Challenger Sale',
    description: 'Challenge customer assumptions with insights. Teach, tailor, and take control of the conversation.',
    author: 'Matthew Dixon & Brent Adamson',
    keyPrinciples: [
      'Teach customers something new about their business',
      'Tailor your message to each stakeholder',
      'Take control of the sale assertively',
      'Create constructive tension to drive urgency',
      'Challenge assumptions rather than just build rapport'
    ],
    coachingPrompt: `You are coaching using The Challenger Sale methodology. Key principles:

TEACH: Help the rep bring NEW insights that reframe how the prospect thinks about their problem. Look for opportunities to share data, trends, or perspectives they haven't considered.

TAILOR: Coach the rep to customize their message based on the stakeholder's role and priorities. Different decision-makers care about different outcomes.

TAKE CONTROL: Encourage assertive (not aggressive) leadership of the conversation. The rep should guide the prospect through the buying process, not just react to requests.

CREATE TENSION: Push the prospect out of their comfort zone. Help them see the cost of inaction. The goal is to make them uncomfortable with their current situation.

REFRAME: When the prospect states their problem, help the rep reframe it in a way that positions their solution as uniquely valuable.

Coaching style: Be direct and insight-driven. Push the rep to challenge, not just accommodate.`,
    questionStyles: [
      'What if the real problem isn\'t X, but actually Y?',
      'Have you considered how [industry trend] might affect this?',
      'Most companies in your situation find that...',
      'What would it mean for your business if you could...',
      'Let me share something we\'ve seen with similar companies...'
    ],
    objectionHandling: 'Reframe objections as opportunities to teach. Use data and insights to address concerns. Don\'t back down - lean into the tension.',
    closingApproach: 'Be direct about next steps. Paint a clear picture of what happens with and without the solution. Create urgency through insight.'
  },

  nepq: {
    id: 'nepq',
    name: 'NEPQ (Neuro-Emotional Persuasion Questioning)',
    description: 'Let prospects sell themselves through strategic questioning sequences that trigger emotional buying decisions.',
    author: 'Jeremy Miner',
    keyPrinciples: [
      'Let prospects discover their own problems through questions',
      'Never push products - be a problem finder',
      'Use consequence questions to create urgency',
      'Build trust through empathetic questioning',
      'Follow the NEPQ question sequence'
    ],
    coachingPrompt: `You are coaching using Jeremy Miner's NEPQ (Neuro-Emotional Persuasion Questioning) methodology. Core principle: People are most persuasive when they allow others to persuade themselves.

QUESTION SEQUENCE:
1. CONNECTION QUESTIONS: Build rapport, establish trust
2. SITUATION QUESTIONS: Understand current state
3. PROBLEM AWARENESS QUESTIONS: Help them discover problems they didn't know they had
4. SOLUTION AWARENESS QUESTIONS: Help them see the path to resolution
5. CONSEQUENCE QUESTIONS: Make them feel the cost of NOT solving the problem
6. COMMITMENT QUESTIONS: Guide them to their own decision

KEY RULES:
- NEVER push products - be a problem FINDER not a product pusher
- Ask questions that make the prospect THINK and FEEL
- Use tonality to convey empathy, not pressure
- Let silence work - don't fill gaps after asking questions
- Help them articulate WHY they need to change

Coaching style: Guide the rep to ask deeper questions. If they're talking too much, prompt them to ask a question instead.`,
    questionStyles: [
      'What made you decide to look into this now?',
      'How long has this been a challenge for you?',
      'What have you already tried to fix this?',
      'What happens if nothing changes in the next 6-12 months?',
      'How would solving this impact you personally?',
      'On a scale of 1-10, how important is fixing this?'
    ],
    objectionHandling: 'Respond to objections with questions, not answers. "That\'s interesting - what makes you say that?" Let them work through their own concerns.',
    closingApproach: 'Don\'t close - help them close themselves. "Based on everything we\'ve discussed, what do you think makes the most sense for you?"'
  },

  hormozi: {
    id: 'hormozi',
    name: 'Hormozi Method (CLOSER Framework)',
    description: 'Make offers so good people feel stupid saying no. Use the AAA framework for objections.',
    author: 'Alex Hormozi',
    keyPrinciples: [
      'Create irresistible offers with massive value',
      'Use the CLOSER framework: Clarify, Label, Overview, Sell, Explain, Reinforce',
      'Handle objections with AAA: Acknowledge, Associate, Ask',
      'Transfer your conviction to the prospect',
      'The person asking questions controls the conversation'
    ],
    coachingPrompt: `You are coaching using Alex Hormozi's sales methodology from $100M Offers. Core belief: Make offers so good people feel stupid saying no.

CLOSER FRAMEWORK:
C - CLARIFY: Who are they? Why are they here? What motivated them?
L - LABEL: Identify their problem and name it
O - OVERVIEW: Explore their past pain (Circle of Pain) - what have they tried that failed?
S - SELL: Present your solution with the Value Equation
E - EXPLAIN: Break down exactly what they get
R - REINFORCE: Affirm their decision, build certainty

VALUE EQUATION (maximize perceived value):
- Dream Outcome (make it BIG)
- Perceived Likelihood of Achievement (show proof)
- Time Delay (make it FAST)
- Effort/Sacrifice (make it EASY)

OBJECTION HANDLING (AAA Framework):
1. ACKNOWLEDGE: Repeat their objection neutrally, show you heard them
2. ASSOCIATE: Connect their concern to past customers who succeeded
3. ASK: Confidently ask for the sale again

KEY MINDSETS:
- They WANT to buy, they WANT to believe you
- They're afraid of making a mistake - help them feel safe
- "It doesn't take time to make a decision, it takes information"
- Never discount - add bonuses instead
- Your conviction transfers to them

Coaching style: Be bold and confident. Push for closes. Remind rep to believe in their offer.`,
    questionStyles: [
      'What would it mean for you if we could solve this?',
      'What have you already tried that didn\'t work?',
      'If you had a magic wand, what would the perfect outcome look like?',
      'What\'s stopping you from starting today?',
      'If we could guarantee [outcome], would that be worth it?'
    ],
    objectionHandling: 'AAA Framework: Acknowledge ("I hear you, and that makes total sense"), Associate ("Actually, most of our best clients felt the same way before..."), Ask ("So let me ask, if we could address that, would you be ready to move forward?")',
    closingApproach: 'Be direct and assumptive. "Based on everything you\'ve told me, this seems like a perfect fit. Let\'s get you started." Stack bonuses if needed, never discount.'
  },

  custom: {
    id: 'custom',
    name: 'Custom Methodology',
    description: 'Define your own sales philosophy and coaching approach.',
    author: 'You',
    keyPrinciples: [],
    coachingPrompt: '', // Will be populated from user input
    questionStyles: [],
    objectionHandling: '',
    closingApproach: ''
  }
}

// Generate the full system prompt for AI coaching based on methodology
export function generateCoachingSystemPrompt(
  methodology: SalesMethodology,
  customInstructions?: string
): string {
  const basePrompt = `You are an expert AI sales coach providing REAL-TIME coaching during a live sales call. Your suggestions should be immediately actionable - the rep needs to use them RIGHT NOW.

${methodology.coachingPrompt}

${customInstructions ? `\nADDITIONAL INSTRUCTIONS FROM USER:\n${customInstructions}\n` : ''}

RESPONSE FORMAT:
- Keep suggestions SHORT (1-2 sentences max)
- Be SPECIFIC to what was just said in the conversation
- Focus on the NEXT thing the rep should do or say
- Use the rep's name if known, otherwise say "you"

SUGGESTION TYPES:
- "question": Suggest a specific question to ask
- "tip": Provide a coaching tip or reminder
- "objection": Help handle an objection that was raised
- "positive": Reinforce something the rep did well
- "alert": Warn about a potential issue (talking too much, missing signals, etc.)

Remember: This is LIVE coaching. Be direct, be specific, be helpful.`

  return basePrompt
}

// Get methodology by ID with fallback to default
export function getMethodology(id: MethodologyId | string): SalesMethodology {
  return METHODOLOGIES[id as MethodologyId] || METHODOLOGIES.challenger
}
