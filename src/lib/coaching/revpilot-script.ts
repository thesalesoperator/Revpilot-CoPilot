/**
 * RevPilot Sales Script - Custom Coaching Script Definition
 *
 * This is a consultative B2B sales script for Close CRM optimization services.
 * The script follows a problem-first, permission-based approach with deep discovery.
 */

export interface ScriptSection {
  id: string
  name: string
  shortName: string
  order: number
  description: string
  objective: string
  keyQuestions: string[]
  transitionSignals: string[]  // Signals that indicate readiness to move to next section
  staySignals: string[]        // Signals that indicate need to stay in this section
  coachingTips: string[]
  warningPatterns: string[]    // Patterns that indicate going off-track
  successPatterns: string[]    // Patterns that indicate doing well
  minDuration?: number         // Minimum suggested time in seconds
  criticalMoments?: string[]   // Key phrases/moments to highlight
}

export interface ScriptDefinition {
  id: string
  name: string
  version: string
  targetProduct: string
  sections: ScriptSection[]
  globalRules: string[]
  objectionHandlers: Record<string, string[]>
  closingTechniques: string[]
}

export const REVPILOT_SCRIPT: ScriptDefinition = {
  id: 'revpilot-close-crm',
  name: 'RevPilot Sales Script',
  version: '1.0',
  targetProduct: 'Close CRM Optimization Services',

  sections: [
    {
      id: 'set_expectations',
      name: 'Set Expectations',
      shortName: 'Expectations',
      order: 1,
      description: 'Open the call with transparency about the agenda and set collaborative tone',
      objective: 'Get permission to ask questions and establish consultative dynamic',
      keyQuestions: [
        "Thanks for taking the time to chat with me today. I've got some questions to ask you to get some context and see if we're a fit to work together.",
        "Before we get started, is there anything you'd like to know about me or RevPilot?"
      ],
      transitionSignals: [
        'ready to start',
        'sounds good',
        'let\'s go',
        'no questions',
        'go ahead',
        'I\'m good'
      ],
      staySignals: [
        'tell me more about',
        'what do you do',
        'how does this work',
        'who are you'
      ],
      coachingTips: [
        'Keep this brief - 30-60 seconds max',
        'Sound relaxed and confident, not scripted',
        'If they have questions about you/RevPilot, answer briefly then redirect to discovery'
      ],
      warningPatterns: [
        'jumping into pitch',
        'talking about features',
        'skipping questions'
      ],
      successPatterns: [
        'permission granted',
        'prospect engaged',
        'collaborative tone set'
      ],
      minDuration: 30
    },
    {
      id: 'isolate_problem',
      name: 'Isolate the Problem',
      shortName: 'Problem',
      order: 2,
      description: 'Identify the core sales operations problem to anchor the conversation',
      objective: 'Find a specific sales ops problem you can solve - STAY HERE until you find one',
      keyQuestions: [
        "What made you book this call today?",
        "What's going on in your sales operations that prompted this conversation?",
        "What specific challenge are you hoping to solve?"
      ],
      transitionSignals: [
        'data problem',
        'pipeline issue',
        'reporting challenge',
        'CRM mess',
        'can\'t track',
        'losing deals',
        'no visibility',
        'forecasting issues',
        'team not using CRM',
        'duplicate records',
        'manual processes',
        'integration problems'
      ],
      staySignals: [
        'just exploring',
        'not sure',
        'general interest',
        'someone told me',
        'vague response'
      ],
      coachingTips: [
        'CRITICAL: Stay in this section until you hear a specific sales ops problem',
        'If response is vague, probe deeper: "Can you tell me more about that?"',
        'Listen for pain points around: data, reporting, pipeline, team adoption, integrations',
        'This is your anchor for the rest of the call - don\'t rush it'
      ],
      warningPatterns: [
        'moving on without clear problem',
        'accepting vague answer',
        'talking more than listening'
      ],
      successPatterns: [
        'specific problem identified',
        'prospect emotionally engaged with problem',
        'clear anchor point established'
      ],
      criticalMoments: [
        'Stay here until you hear a sales ops problem you can anchor on'
      ],
      minDuration: 60
    },
    {
      id: 'background_questions',
      name: 'Background Questions',
      shortName: 'Background',
      order: 3,
      description: 'Understand the B2B context: company, team, product, market',
      objective: 'Build complete picture of their business context for tailored recommendations',
      keyQuestions: [
        "Tell me a bit about your company – what do you sell and who do you sell to?",
        "How big is your sales team?",
        "What's your typical deal size and sales cycle?",
        "What CRM are you currently using? How long have you been on it?"
      ],
      transitionSignals: [
        'company context clear',
        'team size known',
        'deal size mentioned',
        'sales cycle understood',
        'market clarified'
      ],
      staySignals: [
        'unclear on business model',
        'team structure unknown',
        'market not defined'
      ],
      coachingTips: [
        'Take notes - these details matter for your pitch later',
        'Listen for company stage: startup vs. scale-up vs. established',
        'Understand their sales motion: inbound vs. outbound, transactional vs. enterprise',
        'Note team size - this affects pricing and implementation approach'
      ],
      warningPatterns: [
        'skipping context questions',
        'not noting key details',
        'rushing through'
      ],
      successPatterns: [
        'clear picture of business',
        'relevant follow-ups asked',
        'notes being taken'
      ],
      minDuration: 90
    },
    {
      id: 'current_situation',
      name: 'Current Situation',
      shortName: 'Current State',
      order: 4,
      description: 'Deep dive into their current sales operations reality',
      objective: 'Understand exactly how they work today - processes, tools, pain points',
      keyQuestions: [
        "Walk me through your current sales process from lead to close.",
        "How are you tracking your pipeline right now?",
        "What does your reporting look like? How do you know if you're on track?",
        "What tools are you using besides Close/your CRM?",
        "How is data flowing between systems?"
      ],
      transitionSignals: [
        'process explained',
        'tools listed',
        'pain points emerging',
        'frustration expressed',
        'gaps identified'
      ],
      staySignals: [
        'unclear process',
        'tools not mentioned',
        'surface-level answers'
      ],
      coachingTips: [
        'Listen for manual processes - these are optimization opportunities',
        'Note tool stack - important for integration discussions',
        'Identify data silos and broken workflows',
        'Ask "show me" questions if on video: "Can you show me how you do X?"'
      ],
      warningPatterns: [
        'accepting surface answers',
        'not probing on pain',
        'missing tool stack details'
      ],
      successPatterns: [
        'detailed process understanding',
        'pain points documented',
        'tool integrations mapped'
      ],
      minDuration: 120
    },
    {
      id: 'assess_efforts',
      name: 'Assess Previous Efforts',
      shortName: 'Past Efforts',
      order: 5,
      description: 'Understand what they\'ve tried before and why it didn\'t work',
      objective: 'Learn from their past attempts to avoid same mistakes and differentiate',
      keyQuestions: [
        "What have you tried so far to fix this?",
        "Have you worked with consultants or agencies before? How did that go?",
        "What's worked? What hasn't?",
        "Why do you think previous attempts didn't stick?"
      ],
      transitionSignals: [
        'past attempts explained',
        'failures understood',
        'clear on what didn\'t work',
        'ready to try different approach'
      ],
      staySignals: [
        'haven\'t tried anything',
        'vague on past efforts',
        'defensive about failures'
      ],
      coachingTips: [
        'This reveals buying history and skepticism level',
        'If they\'ve been burned before, acknowledge it and differentiate your approach',
        'Learn what "success" looks like to them from past experiences',
        'Note objections that might come up based on past failures'
      ],
      warningPatterns: [
        'skipping this section',
        'not addressing past failures',
        'missing competitor intel'
      ],
      successPatterns: [
        'clear picture of what failed',
        'differentiation opportunity found',
        'trust building happening'
      ],
      minDuration: 60
    },
    {
      id: 'chunking_down',
      name: 'Chunking Down',
      shortName: 'Deep Dive',
      order: 6,
      description: 'Go deeper on the specific problem identified earlier',
      objective: 'Get granular detail on the core problem - make it concrete and measurable',
      keyQuestions: [
        "Let's dig into [PROBLEM]. How often does this happen?",
        "Can you give me a specific example from the last week?",
        "Who else is affected by this?",
        "What does this look like day-to-day for your team?",
        "How long has this been going on?"
      ],
      transitionSignals: [
        'specific examples given',
        'frequency quantified',
        'impact on team clear',
        'emotional response evident'
      ],
      staySignals: [
        'general descriptions',
        'no specific examples',
        'can\'t quantify impact'
      ],
      coachingTips: [
        'Use the anchor problem from Section 2',
        'Get specific numbers: "How many hours per week?"',
        'Ask for recent examples - vague = not urgent',
        'Note emotional language - this reveals true pain level'
      ],
      warningPatterns: [
        'staying too abstract',
        'accepting general answers',
        'not connecting to anchor problem'
      ],
      successPatterns: [
        'concrete examples obtained',
        'impact quantified',
        'emotion surfaced'
      ],
      minDuration: 90
    },
    {
      id: 'financial_qualifier',
      name: 'Financial Qualifier',
      shortName: 'Budget',
      order: 7,
      description: 'Understand the financial impact and their investment capacity',
      objective: 'Quantify the cost of the problem and gauge budget expectations',
      keyQuestions: [
        "What do you think this problem is costing you?",
        "If you had to put a number on it – in lost deals, wasted time, missed opportunities – what would that be?",
        "What kind of budget do you have allocated for solving this?",
        "Have you invested in sales ops improvements before? What was that investment?"
      ],
      transitionSignals: [
        'cost quantified',
        'budget mentioned',
        'investment discussed',
        'ROI thinking evident'
      ],
      staySignals: [
        'can\'t quantify cost',
        'no budget allocated',
        'price sensitive signals'
      ],
      coachingTips: [
        'Help them calculate if they can\'t: "If each rep wastes 5 hours/week at $X/hour..."',
        'Tie cost to the specific problem from earlier sections',
        'Listen for budget signals without being pushy',
        'If no budget allocated, explore: "What would need to happen to allocate budget?"'
      ],
      warningPatterns: [
        'skipping financial discussion',
        'not quantifying impact',
        'avoiding budget topic'
      ],
      successPatterns: [
        'clear cost of problem',
        'budget conversation had',
        'ROI framework established'
      ],
      minDuration: 60
    },
    {
      id: 'doubt_questions',
      name: 'Doubt Questions',
      shortName: 'Doubt',
      order: 8,
      description: 'Surface hidden concerns and create urgency through reflection',
      objective: 'Help them feel the weight of inaction and surface unspoken concerns',
      keyQuestions: [
        "What happens if you don't fix this in the next 6 months?",
        "What's the risk of doing nothing?",
        "Is there anything that makes you doubt this is solvable?",
        "What would your team say if I asked them about this problem?"
      ],
      transitionSignals: [
        'urgency expressed',
        'consequences acknowledged',
        'doubt addressed',
        'commitment to change evident'
      ],
      staySignals: [
        'minimizing problem',
        'no urgency',
        'can live with status quo'
      ],
      coachingTips: [
        'This creates urgency without being pushy',
        'Let them talk - silence is powerful here',
        'If they minimize, revisit the cost from previous section',
        'The team question often reveals hidden politics'
      ],
      warningPatterns: [
        'rushing past doubt',
        'not creating urgency',
        'filling silence'
      ],
      successPatterns: [
        'urgency created',
        'consequences internalized',
        'commitment building'
      ],
      minDuration: 60
    },
    {
      id: 'solution_questions',
      name: 'Solution Questions',
      shortName: 'Solution',
      order: 9,
      description: 'Explore what they think the solution looks like',
      objective: 'Understand their vision and align your solution to their mental model',
      keyQuestions: [
        "In an ideal world, what does this look like when it's fixed?",
        "What would need to be true for you to say 'this is solved'?",
        "How would your day-to-day change if this was working perfectly?",
        "What's the most important thing to get right in the solution?"
      ],
      transitionSignals: [
        'vision articulated',
        'success criteria clear',
        'outcome defined',
        'priorities stated'
      ],
      staySignals: [
        'can\'t envision solution',
        'unclear on outcomes',
        'conflicting priorities'
      ],
      coachingTips: [
        'Their answer shapes your pitch - listen carefully',
        'Note specific outcomes they mention - use these words back',
        'If vision is unclear, help them: "Some clients want X, others want Y..."',
        'Align your solution to their priorities, not yours'
      ],
      warningPatterns: [
        'imposing your vision',
        'not listening to their priorities',
        'skipping to pitch'
      ],
      successPatterns: [
        'clear success criteria',
        'shared vision established',
        'pitch aligned to their needs'
      ],
      minDuration: 60
    },
    {
      id: 'why_now',
      name: 'Why Now',
      shortName: 'Why Now',
      order: 10,
      description: 'Understand timing and urgency for making a change',
      objective: 'Confirm urgency and understand the cost of waiting',
      keyQuestions: [
        "Why is now the right time to solve this?",
        "What's changed that makes this a priority now?",
        "What's the cost of waiting another quarter to address this?"
      ],
      transitionSignals: [
        'urgency confirmed',
        'timing explained',
        'catalyst identified',
        'deadline mentioned'
      ],
      staySignals: [
        'no urgency',
        'can wait',
        'just exploring',
        'no timeline'
      ],
      coachingTips: [
        'CRITICAL: Use pause after cost of waiting question',
        'If no urgency, this might not be a qualified opportunity',
        'Listen for external drivers: new leadership, board pressure, competitor threat',
        'The pause after "cost of waiting" lets them feel the weight'
      ],
      warningPatterns: [
        'not pausing',
        'filling silence',
        'accepting "just exploring"'
      ],
      successPatterns: [
        'urgency confirmed',
        'timeline established',
        'catalyst identified'
      ],
      criticalMoments: [
        '(Pause.) - Use silence after asking about cost of waiting'
      ],
      minDuration: 45
    },
    {
      id: 'support_questions',
      name: 'Support Questions',
      shortName: 'Support',
      order: 11,
      description: 'Understand decision-making process and stakeholders',
      objective: 'Map the buying committee and decision process',
      keyQuestions: [
        "Who else would be involved in making this decision?",
        "What does your decision-making process typically look like?",
        "Who would need to sign off on this?",
        "Is there anyone who might push back on making a change?"
      ],
      transitionSignals: [
        'decision makers identified',
        'process explained',
        'timeline for decision known',
        'champions identified'
      ],
      staySignals: [
        'unclear on process',
        'many stakeholders',
        'political complexity'
      ],
      coachingTips: [
        'This is MEDDIC\'s "Decision Process" and "Champion" in action',
        'If complex buying committee, strategize on how to engage them',
        'Ask about potential blockers early - easier to address now',
        'Identify your champion and coach them on selling internally'
      ],
      warningPatterns: [
        'skipping stakeholder mapping',
        'not addressing politics',
        'assuming single decision maker'
      ],
      successPatterns: [
        'buying committee mapped',
        'champion identified',
        'blockers anticipated'
      ],
      minDuration: 60
    },
    {
      id: 'desired_situation',
      name: 'Desired Situation',
      shortName: 'Future State',
      order: 12,
      description: 'Paint the picture of success and get them emotionally invested',
      objective: 'Create vivid vision of the future state to drive commitment',
      keyQuestions: [
        "Let me paint a picture – imagine 90 days from now, this is all working. What does that look like for you?",
        "How would your role change if this was solved?",
        "What would you be able to do that you can't do today?",
        "How would your team feel about coming to work?"
      ],
      transitionSignals: [
        'vision embraced',
        'emotional engagement',
        'excitement about future',
        'buy-in evident'
      ],
      staySignals: [
        'skepticism',
        'can\'t envision',
        'detached response'
      ],
      coachingTips: [
        'This is the emotional peak before the pitch',
        'Use their words from earlier - "You mentioned X was frustrating..."',
        'Get them to visualize success - this creates commitment',
        'If they\'re not excited, you haven\'t built enough pain earlier'
      ],
      warningPatterns: [
        'skipping emotional connection',
        'being too logical',
        'not using their words'
      ],
      successPatterns: [
        'visible excitement',
        'emotional buy-in',
        'ready for solution'
      ],
      minDuration: 60
    },
    {
      id: 'transition',
      name: 'Transition to Pitch',
      shortName: 'Transition',
      order: 13,
      description: 'Permission-based bridge from discovery to presentation',
      objective: 'Get explicit permission to share your solution',
      keyQuestions: [
        "Based on everything you've shared, I think there's a clear path forward. Would you like me to walk you through how we'd approach this?"
      ],
      transitionSignals: [
        'yes',
        'please',
        'go ahead',
        'I\'d love to hear',
        'tell me more'
      ],
      staySignals: [
        'not sure',
        'need to think',
        'have more questions'
      ],
      coachingTips: [
        'This is a permission checkpoint - essential for consultative selling',
        'If they say no, ask what questions they still have',
        'A "yes" here means they\'re ready to hear your solution',
        'Don\'t pitch without permission - it breaks trust'
      ],
      warningPatterns: [
        'skipping permission',
        'pitching without asking',
        'ignoring hesitation'
      ],
      successPatterns: [
        'clear yes received',
        'enthusiasm for solution',
        'ready to listen'
      ],
      minDuration: 15
    },
    {
      id: 'pitch',
      name: 'The Pitch',
      shortName: 'Pitch',
      order: 14,
      description: '5-step framework presentation tailored to their discovery',
      objective: 'Present your solution mapped to their specific problems and vision',
      keyQuestions: [
        "Here's how we'd approach your situation. We have a 5-step framework...",
        "Step 1: CRM Audit - We'd start by auditing your current Close setup...",
        "Step 2: Process Mapping - Document your ideal sales process...",
        "Step 3: System Design - Build the workflows, automations, and integrations...",
        "Step 4: Implementation - Roll it out with your team...",
        "Step 5: Optimization - Ongoing refinement based on data..."
      ],
      transitionSignals: [
        'makes sense',
        'sounds good',
        'I like that',
        'how much',
        'what\'s next',
        'nodding along'
      ],
      staySignals: [
        'confused',
        'questions about process',
        'skepticism',
        'objections'
      ],
      coachingTips: [
        'Connect each step to their specific problems from discovery',
        'Use their words: "You mentioned [X], so in Step 2 we\'d..."',
        'Keep it high-level - don\'t get into weeds',
        'Watch for buying signals - if they\'re asking "how much" they\'re ready to move'
      ],
      warningPatterns: [
        'generic pitch',
        'not referencing discovery',
        'too much detail',
        'monologuing'
      ],
      successPatterns: [
        'personalized presentation',
        'using their words',
        'buying signals emerging'
      ],
      minDuration: 180
    },
    {
      id: 'commitment',
      name: 'Commitment Scale',
      shortName: 'Commitment',
      order: 15,
      description: 'Gauge commitment level before discussing investment',
      objective: 'Get a read on their commitment before price conversation',
      keyQuestions: [
        "On a scale of 1-10, where 1 is 'this isn't for me' and 10 is 'let's start tomorrow', where are you right now?",
        "What would it take to get you to a 10?",
        "What's holding you back from being higher on the scale?"
      ],
      transitionSignals: [
        '8 or above',
        'ready to move forward',
        'just need to know price',
        'how do we start'
      ],
      staySignals: [
        '6 or below',
        'lots of concerns',
        'need to think about it',
        'need to talk to others'
      ],
      coachingTips: [
        'The number matters less than the follow-up conversation',
        'If below 7, dig into concerns before discussing price',
        '"What would it take to get to 10?" reveals hidden objections',
        'Don\'t move to investment until you\'ve addressed concerns'
      ],
      warningPatterns: [
        'ignoring low score',
        'not exploring concerns',
        'rushing to price'
      ],
      successPatterns: [
        'high commitment score',
        'concerns addressed',
        'ready for investment talk'
      ],
      minDuration: 60
    },
    {
      id: 'onboarding',
      name: 'Onboarding Overview',
      shortName: 'Onboarding',
      order: 16,
      description: 'Walk through what working together looks like',
      objective: 'Reduce uncertainty by explaining the process',
      keyQuestions: [
        "Let me walk you through what onboarding looks like...",
        "Week 1: Kickoff call and CRM audit...",
        "Week 2-3: Process mapping and design...",
        "Week 4-6: Build and implementation...",
        "Ongoing: Support and optimization..."
      ],
      transitionSignals: [
        'sounds good',
        'makes sense',
        'what\'s the investment',
        'ready to start'
      ],
      staySignals: [
        'questions about process',
        'timeline concerns',
        'resource questions'
      ],
      coachingTips: [
        'This reduces perceived risk - they know what to expect',
        'Mention quick wins they\'ll see early',
        'Address any timeline concerns from discovery',
        'Make it feel achievable and low-friction'
      ],
      warningPatterns: [
        'skipping onboarding',
        'making it sound complex',
        'creating uncertainty'
      ],
      successPatterns: [
        'clarity on process',
        'timeline accepted',
        'ready for investment'
      ],
      minDuration: 60
    },
    {
      id: 'investment',
      name: 'Investment',
      shortName: 'Investment',
      order: 17,
      description: 'Present the investment and close',
      objective: 'Present pricing confidently and close the deal',
      keyQuestions: [
        "The investment for this engagement is [PRICE].",
        "This includes [SCOPE].",
        "How does that land with you?"
      ],
      transitionSignals: [
        'let\'s do it',
        'how do we start',
        'where do I sign',
        'can we begin',
        'I\'m in'
      ],
      staySignals: [
        'too expensive',
        'need to think',
        'need approval',
        'can we negotiate'
      ],
      coachingTips: [
        'CRITICAL: After stating price, SHUT UP. Let them respond first.',
        'The first one to talk after price loses negotiating position',
        'If objection, acknowledge and address - don\'t defend',
        'If they need time, schedule specific follow-up'
      ],
      warningPatterns: [
        'talking after price',
        'justifying immediately',
        'discounting without pushback'
      ],
      successPatterns: [
        'confident delivery',
        'silence after price',
        'deal closed'
      ],
      criticalMoments: [
        '(Shut up.) - Do not speak after stating the investment'
      ],
      minDuration: 60
    }
  ],

  globalRules: [
    'Listen more than you talk - aim for 30/70 split (you/them)',
    'Use their exact words back to them - builds trust and shows listening',
    'Never skip the permission-based transition before pitching',
    'If you don\'t have a clear anchor problem from Section 2, go back',
    'Pause after important questions - let them think',
    'Take notes - reference specifics in your pitch',
    'Address objections with curiosity, not defense'
  ],

  objectionHandlers: {
    'price': [
      'I understand. Let me ask - what were you expecting the investment to be?',
      'What would need to be true for this to feel like a good investment?',
      'If we could demonstrate [X] ROI in [Y] timeframe, would that change things?'
    ],
    'timing': [
      'What would need to change for the timing to feel right?',
      'What\'s the cost of waiting another quarter?',
      'Is there a smaller starting point that would work better for now?'
    ],
    'need_approval': [
      'Totally understand. What does that process look like?',
      'How can I help you make the case internally?',
      'What questions will they have that I can help you answer?'
    ],
    'competition': [
      'What are you comparing us to?',
      'What\'s most important to you in making this decision?',
      'What would need to be true for us to be the clear choice?'
    ],
    'status_quo': [
      'What\'s changed that made you take this call?',
      'What happens if you don\'t address this in the next 6 months?',
      'What\'s the cost of the current situation?'
    ]
  },

  closingTechniques: [
    'Assumptive: "Let\'s get you scheduled for kickoff. Does next week work?"',
    'Alternative: "Would you prefer to start this quarter or next?"',
    'Summary: "So to recap - [problem], [solution], [investment]. Ready to move forward?"',
    'Urgency: "We have capacity starting [date]. Should I hold that slot?"'
  ]
}

// Detection patterns for each section
export const SECTION_DETECTION_PATTERNS: Record<string, RegExp[]> = {
  set_expectations: [
    /thanks for (?:taking|joining|hopping on)/i,
    /appreciate you (?:taking|making) the time/i,
    /before we (?:get started|begin|dive in)/i,
    /is there anything you'd like to know/i
  ],
  isolate_problem: [
    /what (?:made you|prompted you|brought you)/i,
    /what's going on (?:in|with)/i,
    /what (?:challenge|problem|issue)/i,
    /tell me (?:about|more about) (?:the|your) (?:problem|challenge|issue)/i
  ],
  background_questions: [
    /tell me (?:a bit )?about your company/i,
    /how big is your (?:sales )?team/i,
    /what(?:'s| is) your typical deal/i,
    /what (?:crm|tools?) are you/i,
    /who do you sell to/i
  ],
  current_situation: [
    /walk me through/i,
    /how are you (?:currently|right now)/i,
    /what does your (?:process|reporting|tracking)/i,
    /what tools are you using/i,
    /how is data flowing/i
  ],
  assess_efforts: [
    /what have you tried/i,
    /have you worked with (?:consultants|agencies)/i,
    /what(?:'s| has) worked/i,
    /why (?:do you think|didn't)/i,
    /previous attempts/i
  ],
  chunking_down: [
    /let's dig into/i,
    /how often does this/i,
    /can you give me a specific example/i,
    /who else is affected/i,
    /how long has this been/i
  ],
  financial_qualifier: [
    /what do you think this (?:is costing|costs)/i,
    /put a number on it/i,
    /what kind of budget/i,
    /have you invested in/i,
    /lost deals|wasted time|missed opportunities/i
  ],
  doubt_questions: [
    /what happens if you don't/i,
    /what's the risk of doing nothing/i,
    /anything that makes you doubt/i,
    /what would your team say/i
  ],
  solution_questions: [
    /in an ideal world/i,
    /what would need to be true/i,
    /how would your day-to-day change/i,
    /what's the most important thing to get right/i
  ],
  why_now: [
    /why is now the right time/i,
    /what's changed that makes this/i,
    /cost of waiting/i,
    /another quarter/i
  ],
  support_questions: [
    /who else would be involved/i,
    /decision-making process/i,
    /who would need to sign off/i,
    /anyone who might push back/i
  ],
  desired_situation: [
    /paint a picture/i,
    /imagine (?:\d+ )?days from now/i,
    /how would your role change/i,
    /what would you be able to do/i
  ],
  transition: [
    /based on everything you've shared/i,
    /would you like me to walk you through/i,
    /clear path forward/i,
    /how we'd approach this/i
  ],
  pitch: [
    /here's how we'd approach/i,
    /(?:5|five)[ -]step (?:framework|process)/i,
    /step (?:one|1|two|2|three|3|four|4|five|5)/i,
    /crm audit/i,
    /process mapping/i,
    /implementation/i
  ],
  commitment: [
    /on a scale of/i,
    /1[ -](?:to[ -])?10/i,
    /where are you right now/i,
    /what would it take to get/i,
    /what's holding you back/i
  ],
  onboarding: [
    /what onboarding looks like/i,
    /week (?:one|1|two|2|three|3)/i,
    /kickoff call/i,
    /support and optimization/i
  ],
  investment: [
    /the investment (?:for|is)/i,
    /this includes/i,
    /how does that land/i,
    /(?:price|pricing|cost) (?:is|for)/i
  ]
}

// Function to detect current script section
export function detectScriptSection(
  transcript: string,
  previousSection?: string
): { section: string; confidence: number; indicators: string[] } {
  const recentText = transcript.slice(-2000).toLowerCase()
  const indicators: string[] = []
  let bestMatch = previousSection || 'set_expectations'
  let bestScore = 0

  for (const [sectionId, patterns] of Object.entries(SECTION_DETECTION_PATTERNS)) {
    let score = 0
    for (const pattern of patterns) {
      if (pattern.test(recentText)) {
        score++
        indicators.push(`Matched: ${pattern.source.slice(0, 30)}...`)
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestMatch = sectionId
    }
  }

  // Apply progression logic - can't jump too far ahead
  const sections = REVPILOT_SCRIPT.sections
  const currentIndex = sections.findIndex(s => s.id === bestMatch)
  const previousIndex = sections.findIndex(s => s.id === previousSection)

  // If jumping more than 2 sections ahead, stay at previous + 1
  if (previousSection && currentIndex > previousIndex + 2) {
    bestMatch = sections[previousIndex + 1]?.id || bestMatch
  }

  return {
    section: bestMatch,
    confidence: Math.min(bestScore / 3, 1),
    indicators
  }
}

// Function to get section-specific coaching
export function getScriptCoaching(
  sectionId: string,
  transcript: string,
  keyInfo: {
    painPoints: string[]
    budget: string | null
    timeline: string | null
    decisionMakers: string[]
  }
): {
  currentSection: ScriptSection
  suggestedQuestions: string[]
  coachingTip: string
  warningMessage?: string
  progressPercentage: number
} {
  const section = REVPILOT_SCRIPT.sections.find(s => s.id === sectionId)
  if (!section) {
    return {
      currentSection: REVPILOT_SCRIPT.sections[0],
      suggestedQuestions: REVPILOT_SCRIPT.sections[0].keyQuestions,
      coachingTip: REVPILOT_SCRIPT.sections[0].coachingTips[0],
      progressPercentage: 0
    }
  }

  const sectionIndex = REVPILOT_SCRIPT.sections.findIndex(s => s.id === sectionId)
  const progressPercentage = Math.round((sectionIndex / REVPILOT_SCRIPT.sections.length) * 100)

  // Check for warnings
  let warningMessage: string | undefined
  const recentText = transcript.slice(-1000).toLowerCase()

  for (const warning of section.warningPatterns) {
    if (recentText.includes(warning.toLowerCase())) {
      warningMessage = `Warning: ${warning}`
      break
    }
  }

  // Special section warnings
  if (sectionId === 'isolate_problem' && keyInfo.painPoints.length === 0) {
    warningMessage = 'Stay in this section until you identify a specific sales ops problem'
  }
  if (sectionId === 'why_now') {
    warningMessage = 'Remember to PAUSE after asking about the cost of waiting'
  }
  if (sectionId === 'investment') {
    warningMessage = 'After stating price: SHUT UP. Let them respond first.'
  }

  // Get contextual suggested questions
  let suggestedQuestions = [...section.keyQuestions]

  // Personalize pitch questions with discovered info
  if (sectionId === 'pitch' && keyInfo.painPoints.length > 0) {
    suggestedQuestions = suggestedQuestions.map(q =>
      q.replace('[PROBLEM]', keyInfo.painPoints[0] || 'the challenge you mentioned')
    )
  }

  return {
    currentSection: section,
    suggestedQuestions: suggestedQuestions.slice(0, 3),
    coachingTip: section.coachingTips[Math.floor(Math.random() * section.coachingTips.length)],
    warningMessage,
    progressPercentage
  }
}

// Export helper to get section by order
export function getSectionByOrder(order: number): ScriptSection | undefined {
  return REVPILOT_SCRIPT.sections.find(s => s.order === order)
}

// Export helper to get next section
export function getNextSection(currentSectionId: string): ScriptSection | undefined {
  const currentIndex = REVPILOT_SCRIPT.sections.findIndex(s => s.id === currentSectionId)
  return REVPILOT_SCRIPT.sections[currentIndex + 1]
}
