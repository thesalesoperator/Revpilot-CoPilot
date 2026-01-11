/**
 * RevPilot Coaching Intelligence Engine
 *
 * This is the brain of the live coaching system. It provides:
 * - Conversation stage detection
 * - Sales methodology frameworks (MEDDIC, SPIN, Challenger, Sandler, BANT)
 * - Custom script tracking and guidance
 * - Predictive next-question generation
 * - Real-time objection detection
 * - Context-aware coaching suggestions
 */

import {
  REVPILOT_SCRIPT,
  detectScriptSection,
  getScriptCoaching,
  getNextSection,
  type ScriptSection,
} from './revpilot-script'

// =============================================================================
// CONVERSATION STAGES
// =============================================================================

export type ConversationStage =
  | 'opening'           // Initial rapport building, agenda setting
  | 'discovery'         // Understanding pain points, needs, situation
  | 'qualification'     // Budget, authority, need, timeline
  | 'presentation'      // Presenting solution, demo, value prop
  | 'objection_handling' // Addressing concerns
  | 'negotiation'       // Pricing, terms discussion
  | 'closing'           // Asking for commitment, next steps
  | 'wrap_up'           // Summarizing, confirming next steps

export interface StageIndicators {
  stage: ConversationStage
  keywords: string[]
  repBehaviors: string[]
  prospectBehaviors: string[]
}

export const STAGE_INDICATORS: StageIndicators[] = [
  {
    stage: 'opening',
    keywords: ['nice to meet', 'thanks for taking', 'how are you', 'agenda', 'appreciate your time', 'looking forward'],
    repBehaviors: ['introductions', 'small talk', 'setting expectations'],
    prospectBehaviors: ['greeting', 'confirming availability']
  },
  {
    stage: 'discovery',
    keywords: ['tell me about', 'what challenges', 'how do you currently', 'walk me through', 'what\'s your process', 'biggest pain', 'what keeps you up', 'main priorities', 'goals for', 'trying to achieve'],
    repBehaviors: ['asking open questions', 'listening', 'probing deeper'],
    prospectBehaviors: ['sharing problems', 'describing situation', 'explaining workflow']
  },
  {
    stage: 'qualification',
    keywords: ['budget', 'timeline', 'decision', 'stakeholders', 'who else', 'approval', 'when looking', 'by when', 'how soon', 'others involved', 'sign off', 'procurement'],
    repBehaviors: ['qualifying questions', 'understanding buying process'],
    prospectBehaviors: ['discussing constraints', 'mentioning other decision makers']
  },
  {
    stage: 'presentation',
    keywords: ['let me show', 'here\'s how', 'our solution', 'the way we', 'feature', 'benefit', 'demo', 'walkthrough', 'platform', 'product'],
    repBehaviors: ['presenting', 'demonstrating', 'explaining features'],
    prospectBehaviors: ['asking about features', 'requesting demo']
  },
  {
    stage: 'objection_handling',
    keywords: ['concern', 'worried', 'not sure', 'competitor', 'expensive', 'too much', 'don\'t think', 'hesitant', 'but what about', 'how do you handle', 'what if'],
    repBehaviors: ['addressing concerns', 'providing reassurance'],
    prospectBehaviors: ['raising concerns', 'expressing doubt', 'mentioning alternatives']
  },
  {
    stage: 'negotiation',
    keywords: ['price', 'discount', 'cost', 'contract', 'terms', 'pricing', 'package', 'tier', 'annual', 'monthly', 'per seat', 'per user'],
    repBehaviors: ['discussing pricing', 'presenting options'],
    prospectBehaviors: ['asking about pricing', 'negotiating terms']
  },
  {
    stage: 'closing',
    keywords: ['next steps', 'move forward', 'get started', 'sign', 'agreement', 'kick off', 'implementation', 'onboarding', 'ready to', 'commit'],
    repBehaviors: ['asking for commitment', 'proposing next steps'],
    prospectBehaviors: ['agreeing', 'confirming interest', 'asking about process']
  },
  {
    stage: 'wrap_up',
    keywords: ['follow up', 'send over', 'recap', 'summary', 'call again', 'schedule', 'thanks for your time', 'appreciate', 'look forward to'],
    repBehaviors: ['summarizing', 'confirming actions'],
    prospectBehaviors: ['thanking', 'confirming next call']
  }
]

// =============================================================================
// SALES METHODOLOGIES
// =============================================================================

export type SalesMethodology = 'meddic' | 'spin' | 'challenger' | 'sandler' | 'bant' | 'general' | 'revpilot'

export interface MethodologyFramework {
  name: string
  fullName: string
  description: string
  components: MethodologyComponent[]
  stageGuidance: Record<ConversationStage, string[]>
}

export interface MethodologyComponent {
  letter: string
  name: string
  description: string
  discoveryQuestions: string[]
  indicators: string[]  // What to listen for
}

export const METHODOLOGIES: Record<SalesMethodology, MethodologyFramework> = {
  meddic: {
    name: 'MEDDIC',
    fullName: 'Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, Champion',
    description: 'Enterprise sales methodology focused on qualification and understanding the buying process',
    components: [
      {
        letter: 'M',
        name: 'Metrics',
        description: 'Quantifiable measures of success',
        discoveryQuestions: [
          'What metrics are you using to measure success today?',
          'How would you quantify the impact of solving this problem?',
          'What does success look like in terms of numbers?',
          'What KPIs does your team track around this?'
        ],
        indicators: ['ROI', 'percentage', 'revenue', 'cost savings', 'time saved', 'efficiency']
      },
      {
        letter: 'E',
        name: 'Economic Buyer',
        description: 'Person with budget authority',
        discoveryQuestions: [
          'Who has final approval on budget for initiatives like this?',
          'Who would need to sign off on an investment of this size?',
          'How are purchasing decisions typically made for tools like this?',
          'Who controls the budget for your department?'
        ],
        indicators: ['budget', 'approval', 'sign off', 'decision maker', 'VP', 'director', 'C-level']
      },
      {
        letter: 'D',
        name: 'Decision Criteria',
        description: 'Formal criteria for making a decision',
        discoveryQuestions: [
          'What criteria are most important when evaluating solutions?',
          'What must a solution have for you to move forward?',
          'What are the deal-breakers for you?',
          'How will you compare different options?'
        ],
        indicators: ['requirements', 'must have', 'criteria', 'evaluate', 'compare', 'priority']
      },
      {
        letter: 'D',
        name: 'Decision Process',
        description: 'Steps to make a purchasing decision',
        discoveryQuestions: [
          'What does your typical buying process look like?',
          'Who all needs to be involved in this decision?',
          'What are the steps between now and making a decision?',
          'Have you purchased similar solutions before? What was that process like?'
        ],
        indicators: ['process', 'steps', 'timeline', 'approval', 'procurement', 'legal', 'security review']
      },
      {
        letter: 'I',
        name: 'Identify Pain',
        description: 'Understanding the core problem',
        discoveryQuestions: [
          'What\'s the biggest challenge you\'re facing right now?',
          'What happens if this problem doesn\'t get solved?',
          'How is this issue affecting your team day-to-day?',
          'What have you tried before to solve this?'
        ],
        indicators: ['problem', 'challenge', 'frustration', 'pain', 'struggle', 'issue', 'difficult']
      },
      {
        letter: 'C',
        name: 'Champion',
        description: 'Internal advocate who will sell for you',
        discoveryQuestions: [
          'Who on your team is most affected by this problem?',
          'Who would benefit most from solving this?',
          'Is there someone internally who\'s championing this initiative?',
          'Who brought this project to leadership\'s attention?'
        ],
        indicators: ['advocate', 'champion', 'supporter', 'internal sponsor', 'driving this']
      }
    ],
    stageGuidance: {
      opening: ['Set a clear agenda', 'Establish credibility quickly', 'Confirm time available'],
      discovery: ['Focus on identifying PAIN first', 'Dig into metrics and impact', 'Understand who\'s affected'],
      qualification: ['Identify economic buyer early', 'Map out decision process', 'Understand decision criteria'],
      presentation: ['Tie features to their specific pain points', 'Use their metrics to show ROI', 'Address decision criteria directly'],
      objection_handling: ['Reference champion\'s support', 'Use metrics to justify value', 'Address concerns with evidence'],
      negotiation: ['Involve economic buyer', 'Reference agreed-upon value metrics', 'Use champion as ally'],
      closing: ['Confirm all MEDDIC elements are covered', 'Get champion\'s commitment', 'Align on decision process timeline'],
      wrap_up: ['Summarize key pain points addressed', 'Confirm next steps with champion', 'Schedule economic buyer meeting if needed']
    }
  },

  spin: {
    name: 'SPIN',
    fullName: 'Situation, Problem, Implication, Need-Payoff',
    description: 'Consultative selling methodology focused on asking the right questions',
    components: [
      {
        letter: 'S',
        name: 'Situation',
        description: 'Understanding current state',
        discoveryQuestions: [
          'Can you walk me through your current process?',
          'What tools are you using today?',
          'How is your team structured?',
          'What does a typical day look like for you?'
        ],
        indicators: ['currently', 'today', 'right now', 'existing', 'process', 'workflow']
      },
      {
        letter: 'P',
        name: 'Problem',
        description: 'Explicit difficulties and dissatisfactions',
        discoveryQuestions: [
          'What challenges are you experiencing with that?',
          'Where do things break down?',
          'What\'s frustrating about the current approach?',
          'What\'s not working as well as you\'d like?'
        ],
        indicators: ['problem', 'challenge', 'difficult', 'issue', 'frustrating', 'not working']
      },
      {
        letter: 'I',
        name: 'Implication',
        description: 'Consequences of the problem',
        discoveryQuestions: [
          'How does that affect your team\'s productivity?',
          'What happens when that goes wrong?',
          'What\'s the cost of not solving this?',
          'How does this impact your ability to hit targets?'
        ],
        indicators: ['affect', 'impact', 'consequence', 'result', 'leads to', 'causes']
      },
      {
        letter: 'N',
        name: 'Need-Payoff',
        description: 'Value of solving the problem',
        discoveryQuestions: [
          'How would it help if you could solve that?',
          'What would it mean for your team if this was fixed?',
          'If you could wave a magic wand, what would change?',
          'What would success look like?'
        ],
        indicators: ['benefit', 'value', 'help', 'improve', 'save', 'better', 'easier']
      }
    ],
    stageGuidance: {
      opening: ['Keep it brief', 'Transition quickly to Situation questions', 'Establish permission to ask questions'],
      discovery: ['Start with Situation, then Problem', 'Use Implication questions to build urgency', 'End with Need-Payoff to get them talking about value'],
      qualification: ['Implication questions reveal true urgency', 'Need-Payoff confirms they want to solve this'],
      presentation: ['Reference their answers to Need-Payoff questions', 'Show how solution addresses Problems', 'Demonstrate value they described'],
      objection_handling: ['Return to Implication questions', 'Remind them of the cost of inaction', 'Use their own words about value'],
      negotiation: ['Reference Need-Payoff statements', 'Tie price to implications of not solving'],
      closing: ['They should be selling themselves by now', 'Summarize the Need-Payoff they described'],
      wrap_up: ['Confirm understanding of Problem', 'Restate the value they articulated']
    }
  },

  challenger: {
    name: 'Challenger',
    fullName: 'Teach, Tailor, Take Control',
    description: 'Challenge the prospect\'s thinking and bring unique insights',
    components: [
      {
        letter: 'T',
        name: 'Teach',
        description: 'Bring unique insights they haven\'t considered',
        discoveryQuestions: [
          'Have you considered how [industry trend] might affect your approach?',
          'What if I told you most companies in your space are solving this differently?',
          'Are you aware of the hidden costs of [current approach]?',
          'Let me share what we\'re seeing across similar companies...'
        ],
        indicators: ['didn\'t know', 'interesting', 'hadn\'t thought', 'tell me more', 'really?']
      },
      {
        letter: 'T',
        name: 'Tailor',
        description: 'Customize message to their specific situation',
        discoveryQuestions: [
          'Given your role as [title], how does this affect you specifically?',
          'In [their industry], we typically see...',
          'For a company your size, the key challenge is usually...',
          'Based on what you\'ve shared about [specific situation]...'
        ],
        indicators: ['our situation', 'specifically', 'in our case', 'for us']
      },
      {
        letter: 'T',
        name: 'Take Control',
        description: 'Lead the conversation confidently',
        discoveryQuestions: [
          'Based on our conversation, here\'s what I recommend...',
          'The best next step would be...',
          'Let me be direct about what I think you should do...',
          'I\'d push back on that approach because...'
        ],
        indicators: ['what do you think', 'what would you suggest', 'how should we']
      }
    ],
    stageGuidance: {
      opening: ['Lead with an insight or provocative statement', 'Challenge their assumptions early', 'Position yourself as an expert'],
      discovery: ['Ask questions that reveal blind spots', 'Use "Have you considered..." format', 'Share relevant industry insights'],
      qualification: ['Take control of the process discussion', 'Recommend the right stakeholders to involve', 'Set expectations for timeline'],
      presentation: ['Lead with insights, not features', 'Challenge their current thinking', 'Be prescriptive about what they should do'],
      objection_handling: ['Respectfully push back', 'Use data and insights to reframe', 'Don\'t be defensive - be confident'],
      negotiation: ['Control the conversation', 'Don\'t negotiate against yourself', 'Stand firm on value'],
      closing: ['Be direct about asking for the business', 'Recommend specific next steps', 'Take control of timeline'],
      wrap_up: ['Summarize what you taught them', 'Be clear about what you expect from them']
    }
  },

  sandler: {
    name: 'Sandler',
    fullName: 'Sandler Selling System',
    description: 'Focus on disqualifying bad fits and having honest conversations',
    components: [
      {
        letter: 'B',
        name: 'Bonding & Rapport',
        description: 'Build genuine connection',
        discoveryQuestions: [
          'Before we dive in, tell me a bit about your background',
          'How did you end up in this role?',
          'What do you enjoy most about your work?'
        ],
        indicators: ['interesting', 'same here', 'I understand', 'makes sense']
      },
      {
        letter: 'U',
        name: 'Upfront Contract',
        description: 'Set clear expectations',
        discoveryQuestions: [
          'Is it okay if at the end of our call, if it\'s not a fit, you tell me no?',
          'What would make this a good use of your time today?',
          'If this isn\'t right for you, can we agree to be honest about that?'
        ],
        indicators: ['sounds fair', 'agreed', 'yes that works']
      },
      {
        letter: 'P',
        name: 'Pain',
        description: 'Uncover deep emotional pain',
        discoveryQuestions: [
          'What have you tried before that didn\'t work?',
          'How long has this been a problem?',
          'On a scale of 1-10, how urgent is solving this?',
          'What happens if nothing changes?'
        ],
        indicators: ['frustrated', 'tired of', 'have to fix', 'can\'t keep', 'need to change']
      },
      {
        letter: 'B',
        name: 'Budget',
        description: 'Honest budget conversation',
        discoveryQuestions: [
          'Do you have budget set aside for this?',
          'What have you invested in similar solutions before?',
          'Is money going to be the deciding factor here?'
        ],
        indicators: ['budget', 'cost', 'investment', 'afford', 'spend']
      },
      {
        letter: 'D',
        name: 'Decision',
        description: 'Understand decision process',
        discoveryQuestions: [
          'How do decisions like this get made at your company?',
          'Who else needs to be involved?',
          'What\'s your timeline for making a decision?'
        ],
        indicators: ['decide', 'approval', 'committee', 'process', 'timeline']
      }
    ],
    stageGuidance: {
      opening: ['Focus on rapport', 'Set upfront contract', 'Get permission to ask tough questions'],
      discovery: ['Go deep on pain - surface and emotional', 'Don\'t be afraid to ask uncomfortable questions', 'Qualify hard - it\'s okay to disqualify'],
      qualification: ['Have honest budget conversation early', 'Understand decision process completely', 'Be willing to walk away if not a fit'],
      presentation: ['Only present if fully qualified', 'Tie directly to pain they expressed', 'Keep it brief'],
      objection_handling: ['Use negative reverse selling', 'Agree with concerns, don\'t fight them', 'Ask "Is that a deal-breaker?"'],
      negotiation: ['Don\'t discount without getting something', 'If they can\'t afford it, walk away', 'Maintain posture'],
      closing: ['They should be asking to buy', 'Use upfront contract', 'Ask "Where do we go from here?"'],
      wrap_up: ['Reconfirm mutual commitment', 'Clear next steps or clear no']
    }
  },

  bant: {
    name: 'BANT',
    fullName: 'Budget, Authority, Need, Timeline',
    description: 'Classic qualification framework',
    components: [
      {
        letter: 'B',
        name: 'Budget',
        description: 'Do they have money to spend?',
        discoveryQuestions: [
          'What budget do you have allocated for this?',
          'Have you purchased similar solutions before? What did you invest?',
          'Is there budget available, or would this need to be approved?'
        ],
        indicators: ['budget', 'cost', 'price', 'invest', 'afford', 'spend']
      },
      {
        letter: 'A',
        name: 'Authority',
        description: 'Are you talking to the decision maker?',
        discoveryQuestions: [
          'Who else is involved in this decision?',
          'Who has final sign-off on purchases like this?',
          'What\'s your role in the evaluation process?'
        ],
        indicators: ['decide', 'approve', 'sign off', 'boss', 'team', 'committee']
      },
      {
        letter: 'N',
        name: 'Need',
        description: 'Do they have a real problem to solve?',
        discoveryQuestions: [
          'What problem are you trying to solve?',
          'Why is this important right now?',
          'What happens if you don\'t address this?'
        ],
        indicators: ['need', 'problem', 'challenge', 'pain', 'issue', 'must have']
      },
      {
        letter: 'T',
        name: 'Timeline',
        description: 'When do they need to decide/implement?',
        discoveryQuestions: [
          'When are you looking to have a solution in place?',
          'What\'s driving the timeline?',
          'Is there a deadline you\'re working toward?'
        ],
        indicators: ['when', 'timeline', 'deadline', 'date', 'quarter', 'month']
      }
    ],
    stageGuidance: {
      opening: ['Briefly establish credibility', 'Move quickly to qualification'],
      discovery: ['Focus on Need first', 'Understand the urgency'],
      qualification: ['Cover all four BANT elements', 'Don\'t skip any', 'Be direct'],
      presentation: ['Only if BANT is confirmed', 'Focus on solving their Need'],
      objection_handling: ['Return to BANT element being questioned'],
      negotiation: ['Reference Budget discussion', 'Use Timeline to create urgency'],
      closing: ['Align with their Timeline', 'Confirm Authority is present'],
      wrap_up: ['Confirm all BANT elements', 'Lock in timeline']
    }
  },

  general: {
    name: 'General',
    fullName: 'Sales Best Practices',
    description: 'Universal sales principles',
    components: [],
    stageGuidance: {
      opening: ['Build rapport quickly', 'Set agenda', 'Confirm time available'],
      discovery: ['Ask open-ended questions', 'Listen more than you talk', 'Dig into pain points'],
      qualification: ['Understand budget, timeline, decision process', 'Identify all stakeholders'],
      presentation: ['Focus on benefits, not features', 'Tie to their specific needs', 'Use stories and proof points'],
      objection_handling: ['Listen fully before responding', 'Acknowledge the concern', 'Address with evidence'],
      negotiation: ['Know your walk-away point', 'Trade, don\'t cave', 'Protect value'],
      closing: ['Ask for the business', 'Handle final objections', 'Confirm next steps'],
      wrap_up: ['Summarize agreements', 'Confirm action items', 'Set follow-up']
    }
  },

  revpilot: {
    name: 'RevPilot Script',
    fullName: 'RevPilot Consultative B2B Sales Script',
    description: 'Custom 17-section consultative sales script for Close CRM optimization',
    components: [
      {
        letter: '1',
        name: 'Set Expectations',
        description: 'Open with transparency, set consultative tone',
        discoveryQuestions: [
          "Thanks for taking the time to chat. I've got some questions to get context and see if we're a fit.",
          "Before we start, is there anything you'd like to know about me or RevPilot?"
        ],
        indicators: ['thanks for taking', 'appreciate your time', 'before we begin']
      },
      {
        letter: '2',
        name: 'Isolate Problem',
        description: 'Find and anchor on a specific sales ops problem',
        discoveryQuestions: [
          "What made you book this call today?",
          "What's going on in your sales operations that prompted this?",
          "What specific challenge are you hoping to solve?"
        ],
        indicators: ['problem', 'challenge', 'issue', 'pain point', 'struggling']
      },
      {
        letter: '3',
        name: 'Background',
        description: 'Understand company, team, product, market context',
        discoveryQuestions: [
          "Tell me about your company – what do you sell and who do you sell to?",
          "How big is your sales team?",
          "What's your typical deal size and sales cycle?"
        ],
        indicators: ['company', 'team size', 'deal size', 'sales cycle', 'market']
      },
      {
        letter: '4-6',
        name: 'Deep Discovery',
        description: 'Current situation, past efforts, chunking down on problems',
        discoveryQuestions: [
          "Walk me through your current sales process from lead to close.",
          "What have you tried so far to fix this?",
          "Can you give me a specific example from the last week?"
        ],
        indicators: ['process', 'workflow', 'tried before', 'example', 'how often']
      },
      {
        letter: '7',
        name: 'Financial Qualifier',
        description: 'Quantify cost of problem and gauge budget',
        discoveryQuestions: [
          "What do you think this problem is costing you?",
          "If you had to put a number on it – lost deals, wasted time – what would that be?",
          "What kind of budget do you have allocated?"
        ],
        indicators: ['cost', 'budget', 'investment', 'ROI', 'losing']
      },
      {
        letter: '8-10',
        name: 'Urgency Building',
        description: 'Doubt questions, solution vision, why now',
        discoveryQuestions: [
          "What happens if you don't fix this in the next 6 months?",
          "In an ideal world, what does this look like when it's fixed?",
          "Why is now the right time to solve this?"
        ],
        indicators: ['if nothing changes', 'risk', 'ideal', 'timing', 'urgent']
      },
      {
        letter: '11-12',
        name: 'Support & Vision',
        description: 'Map decision makers, paint future state',
        discoveryQuestions: [
          "Who else would be involved in making this decision?",
          "Imagine 90 days from now, this is all working. What does that look like?"
        ],
        indicators: ['decision maker', 'stakeholder', 'future', 'imagine', 'vision']
      },
      {
        letter: '13-17',
        name: 'Close',
        description: 'Permission transition, pitch, commitment, investment',
        discoveryQuestions: [
          "Based on everything you've shared, would you like me to walk you through how we'd approach this?",
          "On a scale of 1-10, where are you right now?",
          "The investment for this engagement is..."
        ],
        indicators: ['how we work', 'approach', 'investment', 'price', 'next steps']
      }
    ],
    stageGuidance: {
      opening: ['Keep brief (30-60 sec)', 'Sound relaxed, not scripted', 'Get permission to ask questions'],
      discovery: ['STAY in problem isolation until you find a specific anchor problem', 'Listen for sales ops pain', 'Take notes on everything'],
      qualification: ['Quantify the cost of their problem', 'Map all decision makers', 'Understand budget capacity'],
      presentation: ['Get explicit permission before pitching', 'Connect each step to their problems', 'Use their words back to them'],
      objection_handling: ['Acknowledge with curiosity, not defense', 'Return to implications if price objection', 'Ask what would change their mind'],
      negotiation: ['Don\'t discount without getting something', 'Reference the cost of inaction', 'Use their ROI numbers'],
      closing: ['Use commitment scale (1-10)', 'SHUT UP after stating investment', 'Let them respond first'],
      wrap_up: ['Confirm specific next steps', 'Schedule follow-up if needed', 'Send recap email']
    }
  }
}

// =============================================================================
// OBJECTION PATTERNS
// =============================================================================

export interface ObjectionPattern {
  category: string
  patterns: string[]
  suggestedResponses: string[]
  frameworkTip: string
}

export const OBJECTION_PATTERNS: ObjectionPattern[] = [
  {
    category: 'price',
    patterns: ['too expensive', 'out of budget', 'can\'t afford', 'cheaper option', 'costs too much', 'price is high'],
    suggestedResponses: [
      'What would the cost be of NOT solving this problem?',
      'Let\'s break down the ROI based on the metrics you mentioned...',
      'If budget weren\'t a constraint, would this be the right solution?',
      'What are you comparing the price to?'
    ],
    frameworkTip: 'Return to the pain and implications. Price objections often mean you haven\'t built enough value.'
  },
  {
    category: 'timing',
    patterns: ['not right now', 'next quarter', 'maybe later', 'too busy', 'bad timing', 'not a priority'],
    suggestedResponses: [
      'What would need to change for this to become a priority?',
      'What\'s the cost of waiting another quarter?',
      'Is there an event or deadline that would make this more urgent?',
      'Help me understand what\'s taking priority right now'
    ],
    frameworkTip: 'Timing objections often mean the pain isn\'t urgent enough. Dig deeper into implications.'
  },
  {
    category: 'authority',
    patterns: ['need to check with', 'my boss', 'not my decision', 'committee', 'need approval', 'let me talk to'],
    suggestedResponses: [
      'That makes sense. What do you think they\'ll want to know?',
      'Would it help if we scheduled a call with them?',
      'What would you recommend to them?',
      'Based on what you know, do you think this is a good fit?'
    ],
    frameworkTip: 'Turn them into your champion. Ask what THEY think and how they\'d present it.'
  },
  {
    category: 'competition',
    patterns: ['looking at other', 'competitor', 'also talking to', 'comparing', 'alternative', 'other options'],
    suggestedResponses: [
      'That\'s smart to evaluate options. What criteria are most important?',
      'What do you like about what you\'ve seen from them?',
      'How are you planning to make the final decision?',
      'What would make us the clear winner?'
    ],
    frameworkTip: 'Don\'t bash competitors. Focus on your unique value and understanding their decision criteria.'
  },
  {
    category: 'trust',
    patterns: ['not sure', 'how do I know', 'what if', 'guarantee', 'proof', 'references', 'case studies'],
    suggestedResponses: [
      'I understand - what would help you feel more confident?',
      'Would you like to speak with a customer in a similar situation?',
      'Let me share some specific results from companies like yours...',
      'What would you need to see to move forward?'
    ],
    frameworkTip: 'Proof points and references are powerful. Offer specific examples relevant to their situation.'
  },
  {
    category: 'status_quo',
    patterns: ['doing fine', 'works okay', 'used to it', 'don\'t need', 'happy with current', 'not broken'],
    suggestedResponses: [
      'What made you take this call today?',
      'If everything was perfect, we probably wouldn\'t be talking...',
      'What would it look like if things were 20% better?',
      'What originally made this a priority?'
    ],
    frameworkTip: 'There\'s a reason they\'re on this call. Uncover the underlying dissatisfaction.'
  }
]

// =============================================================================
// BUYING SIGNALS
// =============================================================================

export interface BuyingSignal {
  signal: string
  patterns: string[]
  recommendedAction: string
}

export const BUYING_SIGNALS: BuyingSignal[] = [
  {
    signal: 'implementation_questions',
    patterns: ['how long to implement', 'what\'s onboarding like', 'how do we get started', 'what\'s the process'],
    recommendedAction: 'They\'re visualizing using it! Transition to discussing next steps.'
  },
  {
    signal: 'internal_stakeholder',
    patterns: ['I should include', 'my team would need', 'boss would want to see', 'let me bring in'],
    recommendedAction: 'Great sign! Offer to schedule a meeting with the additional stakeholder.'
  },
  {
    signal: 'specific_use_case',
    patterns: ['we could use this for', 'this would help with', 'I\'m thinking about', 'for our'],
    recommendedAction: 'They\'re seeing the value. Dig deeper into this specific use case.'
  },
  {
    signal: 'pricing_interest',
    patterns: ['what does this cost', 'pricing', 'what\'s the investment', 'how much'],
    recommendedAction: 'Interest in pricing = interest in buying. Share pricing confidently.'
  },
  {
    signal: 'timeline_discussion',
    patterns: ['when could we', 'how soon', 'we need this by', 'looking to have this'],
    recommendedAction: 'They have urgency. Confirm timeline and map backwards from their deadline.'
  },
  {
    signal: 'positive_feedback',
    patterns: ['this is great', 'I like that', 'exactly what we need', 'impressive', 'perfect'],
    recommendedAction: 'Don\'t miss the moment! Ask what specifically resonates and if they\'re ready to move forward.'
  }
]

// =============================================================================
// COACHING SUGGESTION TYPES
// =============================================================================

export type SuggestionType =
  | 'question'          // Specific question to ask
  | 'tip'               // Coaching tip or best practice
  | 'objection'         // Objection handling guidance
  | 'alert'             // Warning (talking too much, going off track)
  | 'positive'          // Positive reinforcement
  | 'transition'        // Suggest moving to next stage
  | 'methodology'       // Methodology-specific guidance
  | 'buying_signal'     // Detected buying signal

export interface CoachingSuggestion {
  type: SuggestionType
  content: string
  priority: 'high' | 'medium' | 'low'
  reasoning?: string
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function detectConversationStage(transcript: string): ConversationStage {
  const lowerTranscript = transcript.toLowerCase()

  // Score each stage based on keyword matches
  const scores: Record<ConversationStage, number> = {
    opening: 0,
    discovery: 0,
    qualification: 0,
    presentation: 0,
    objection_handling: 0,
    negotiation: 0,
    closing: 0,
    wrap_up: 0
  }

  for (const indicator of STAGE_INDICATORS) {
    for (const keyword of indicator.keywords) {
      if (lowerTranscript.includes(keyword)) {
        scores[indicator.stage] += 1
      }
    }
  }

  // Find highest scoring stage
  let maxStage: ConversationStage = 'discovery'  // Default
  let maxScore = 0

  for (const [stage, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score
      maxStage = stage as ConversationStage
    }
  }

  return maxStage
}

export function detectObjections(transcript: string): ObjectionPattern[] {
  const lowerTranscript = transcript.toLowerCase()
  const detected: ObjectionPattern[] = []

  for (const pattern of OBJECTION_PATTERNS) {
    for (const keyword of pattern.patterns) {
      if (lowerTranscript.includes(keyword)) {
        detected.push(pattern)
        break  // Only add once per category
      }
    }
  }

  return detected
}

export function detectBuyingSignals(transcript: string): BuyingSignal[] {
  const lowerTranscript = transcript.toLowerCase()
  const detected: BuyingSignal[] = []

  for (const signal of BUYING_SIGNALS) {
    for (const pattern of signal.patterns) {
      if (lowerTranscript.includes(pattern)) {
        detected.push(signal)
        break  // Only add once per signal type
      }
    }
  }

  return detected
}

// =============================================================================
// MAIN PROMPT BUILDER
// =============================================================================

export interface ConversationContext {
  stage: ConversationStage
  methodology: SalesMethodology
  recentTranscript: string
  fullTranscript: string
  detectedObjections: ObjectionPattern[]
  detectedBuyingSignals: BuyingSignal[]
  talkRatio: { repPercent: number; prospectPercent: number }
  callDurationMinutes: number
  previousSuggestions: string[]
  // Script-specific context
  scriptSection?: string
  scriptProgress?: number
  scriptWarning?: string
}

export function buildCoachingPrompt(context: ConversationContext): string {
  const methodology = METHODOLOGIES[context.methodology]
  const stageGuidance = methodology.stageGuidance[context.stage]

  // Build objection context if any detected
  let objectionContext = ''
  if (context.detectedObjections.length > 0) {
    const objection = context.detectedObjections[0]  // Focus on first/most recent
    objectionContext = `
OBJECTION DETECTED: ${objection.category.toUpperCase()}
Suggested responses:
${objection.suggestedResponses.map(r => `- ${r}`).join('\n')}
Framework tip: ${objection.frameworkTip}
`
  }

  // Build buying signal context if any detected
  let buyingSignalContext = ''
  if (context.detectedBuyingSignals.length > 0) {
    const signal = context.detectedBuyingSignals[0]
    buyingSignalContext = `
BUYING SIGNAL DETECTED: ${signal.signal.replace(/_/g, ' ').toUpperCase()}
Recommended action: ${signal.recommendedAction}
`
  }

  // Talk ratio warning if needed
  let talkRatioWarning = ''
  if (context.talkRatio.repPercent > 65) {
    talkRatioWarning = `
⚠️ TALK RATIO ALERT: Rep is at ${context.talkRatio.repPercent}% - way too much talking!
The prospect should be talking more. Ask a question and LISTEN.
`
  } else if (context.talkRatio.repPercent > 55) {
    talkRatioWarning = `
Note: Talk ratio is ${context.talkRatio.repPercent}% rep / ${context.talkRatio.prospectPercent}% prospect.
Aim for more prospect talk time.
`
  }

  // Get methodology-specific discovery questions for this stage
  let methodologyQuestions = ''
  if (methodology.components.length > 0) {
    const relevantComponent = methodology.components.find(c => {
      // Match component to stage
      if (context.stage === 'discovery' || context.stage === 'qualification') {
        return true  // All components relevant
      }
      return false
    })

    if (relevantComponent) {
      methodologyQuestions = `
${methodology.name} Discovery Questions for this moment:
${relevantComponent.discoveryQuestions.slice(0, 3).map(q => `- "${q}"`).join('\n')}
`
    }
  }

  return `You are an elite sales coach providing REAL-TIME coaching during a live ${context.callDurationMinutes > 2 ? 'sales' : 'discovery'} call.

CURRENT SITUATION:
- Conversation Stage: ${context.stage.replace(/_/g, ' ').toUpperCase()}
- Sales Methodology: ${methodology.name} (${methodology.fullName})
- Call Duration: ${context.callDurationMinutes} minutes
- Talk Ratio: ${context.talkRatio.repPercent}% rep / ${context.talkRatio.prospectPercent}% prospect
${talkRatioWarning}
${objectionContext}
${buyingSignalContext}

STAGE GUIDANCE (${context.stage}):
${stageGuidance.map(g => `• ${g}`).join('\n')}

${methodologyQuestions}

RECENT CONVERSATION:
${context.recentTranscript}

${context.fullTranscript.length > 500 ? `CONVERSATION CONTEXT (summary of earlier discussion):
${context.fullTranscript.slice(0, 500)}...` : ''}

PREVIOUS SUGGESTIONS GIVEN (avoid repeating):
${context.previousSuggestions.length > 0 ? context.previousSuggestions.slice(-3).join('\n') : 'None yet'}

YOUR TASK:
Analyze the conversation and provide ONE highly specific, actionable coaching suggestion.

CRITICAL RULES:
1. Be SPECIFIC to what was just said - not generic advice
2. If suggesting a question, provide the EXACT question to ask, tailored to their situation
3. If an objection was raised, provide a specific response strategy
4. If a buying signal was detected, guide them to capitalize on it
5. Consider where the conversation should go NEXT
6. Keep suggestions brief (1-2 sentences max) but highly actionable

STAGE-SPECIFIC CONSTRAINTS (MUST FOLLOW):
• OPENING/DISCOVERY stages: NEVER suggest presenting solutions, pitching, or discussing pricing
• DISCOVERY stage: Focus on understanding problems - do NOT jump to solutions
• QUALIFICATION stage: Focus on budget/timeline/authority - not presentation
• Only suggest "present solution" in PRESENTATION stage or later
• Only suggest closing techniques in CLOSING stage

TALK RATIO SANITY CHECK:
• If talk ratio shows rep at <30% but transcript shows mostly rep talking, ignore the talk ratio data
• If only one speaker appears in transcript, assume all speech is the rep
• Never suggest "let prospect talk more" if they haven't spoken at all

FORBIDDEN SUGGESTIONS:
• Early stages: Do NOT suggest "present your solution", "show them the demo", "explain features", "discuss pricing"
• Do NOT give conflicting advice in the same moment

Response format (JSON):
{
  "suggestion": {
    "type": "question" | "tip" | "objection" | "alert" | "positive" | "transition" | "methodology" | "buying_signal",
    "content": "Your specific coaching suggestion",
    "priority": "high" | "medium" | "low"
  },
  "conversationInsight": "Brief insight about where the conversation is heading",
  "predictedNextMove": "What the prospect is likely to say/do next"
}

If the conversation is going well and no intervention is needed, respond with:
{"suggestion": null, "conversationInsight": "...", "predictedNextMove": "..."}`
}

// =============================================================================
// SCRIPT-AWARE COACHING PROMPT BUILDER
// =============================================================================

export interface ScriptContext {
  currentSection: ScriptSection
  previousSectionId?: string
  suggestedQuestions: string[]
  coachingTip: string
  warningMessage?: string
  progressPercentage: number
  keyInfo: {
    painPoints: string[]
    budget: string | null
    timeline: string | null
    decisionMakers: string[]
    objections: string[]
    buyingSignals: string[]
  }
}

export function buildScriptCoachingPrompt(
  context: ConversationContext,
  scriptContext: ScriptContext
): string {
  const section = scriptContext.currentSection
  const nextSection = getNextSection(section.id)

  // Build critical moment alerts
  let criticalAlerts = ''
  if (section.criticalMoments && section.criticalMoments.length > 0) {
    criticalAlerts = `
🚨 CRITICAL MOMENT FOR THIS SECTION:
${section.criticalMoments.map(m => `⚠️ ${m}`).join('\n')}
`
  }

  // Check for warning conditions
  let warningSection = ''
  if (scriptContext.warningMessage) {
    warningSection = `
⚠️ WARNING: ${scriptContext.warningMessage}
`
  }

  // Special section-specific warnings
  if (section.id === 'isolate_problem' && scriptContext.keyInfo.painPoints.length === 0) {
    warningSection += `
🔴 STAY HERE - No anchor problem identified yet!
Keep probing: "What's going on in your sales operations that prompted this call?"
`
  }

  if (section.id === 'why_now') {
    warningSection += `
⏸️ REMEMBER: PAUSE after asking "What's the cost of waiting?" - Let them feel the weight.
`
  }

  if (section.id === 'investment') {
    warningSection += `
🤐 CRITICAL: After stating the investment amount, SHUT UP. Do not speak. Let them respond first.
`
  }

  // Build talk ratio warning
  let talkRatioWarning = ''
  if (context.talkRatio.repPercent > 65) {
    talkRatioWarning = `
⚠️ TALK RATIO ALERT: You're at ${context.talkRatio.repPercent}% - WAY too much talking!
The prospect should be talking 70%+. Ask a question and LISTEN.
`
  } else if (context.talkRatio.repPercent > 50) {
    talkRatioWarning = `
📊 Talk ratio: ${context.talkRatio.repPercent}% you / ${context.talkRatio.prospectPercent}% them. Aim for more prospect talk time.
`
  }

  // Build objection/buying signal alerts
  let signalAlerts = ''
  if (context.detectedObjections.length > 0) {
    const obj = context.detectedObjections[0]
    const handlers = REVPILOT_SCRIPT.objectionHandlers[obj.category] || obj.suggestedResponses
    signalAlerts += `
🚨 OBJECTION DETECTED: ${obj.category.toUpperCase()}
Suggested responses:
${handlers.slice(0, 2).map(r => `• "${r}"`).join('\n')}
`
  }

  if (context.detectedBuyingSignals.length > 0) {
    const signal = context.detectedBuyingSignals[0]
    signalAlerts += `
✅ BUYING SIGNAL: ${signal.signal.replace(/_/g, ' ').toUpperCase()}
Action: ${signal.recommendedAction}
`
  }

  // Build key info summary
  let keyInfoSummary = ''
  if (scriptContext.keyInfo.painPoints.length > 0 || scriptContext.keyInfo.budget || scriptContext.keyInfo.decisionMakers.length > 0) {
    keyInfoSummary = `
📋 KEY INFO GATHERED:
${scriptContext.keyInfo.painPoints.length > 0 ? `• Pain Points: ${scriptContext.keyInfo.painPoints.slice(0, 2).join('; ')}` : '• Pain Points: Not yet identified'}
${scriptContext.keyInfo.budget ? `• Budget: ${scriptContext.keyInfo.budget}` : '• Budget: Not discussed'}
${scriptContext.keyInfo.timeline ? `• Timeline: ${scriptContext.keyInfo.timeline}` : '• Timeline: Not discussed'}
${scriptContext.keyInfo.decisionMakers.length > 0 ? `• Decision Makers: ${scriptContext.keyInfo.decisionMakers.join(', ')}` : '• Decision Makers: Unknown'}
`
  }

  return `You are an elite B2B sales coach providing REAL-TIME coaching during a live sales call.
The rep is using the RevPilot Consultative Sales Script for Close CRM optimization services.

═══════════════════════════════════════════════════════════════════════════════
SCRIPT PROGRESS: ${scriptContext.progressPercentage}% │ Section ${section.order}/17: "${section.name}"
═══════════════════════════════════════════════════════════════════════════════

CURRENT SECTION: ${section.name.toUpperCase()}
Objective: ${section.objective}

${criticalAlerts}${warningSection}${talkRatioWarning}

📝 SUGGESTED QUESTIONS FOR THIS SECTION:
${scriptContext.suggestedQuestions.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

💡 COACHING TIP: ${scriptContext.coachingTip}

${signalAlerts}

📊 SECTION TRANSITION SIGNALS (when to move to next section):
Ready to advance when you hear: ${section.transitionSignals.slice(0, 4).join(', ')}
Stay in section if you hear: ${section.staySignals.slice(0, 3).join(', ')}

${nextSection ? `➡️ NEXT SECTION: ${nextSection.name} - ${nextSection.description}` : '🎯 FINAL SECTION - Close the deal!'}

${keyInfoSummary}

═══════════════════════════════════════════════════════════════════════════════
RECENT CONVERSATION:
═══════════════════════════════════════════════════════════════════════════════
${context.recentTranscript}

CALL DURATION: ${context.callDurationMinutes} minutes
TALK RATIO: ${context.talkRatio.repPercent}% rep / ${context.talkRatio.prospectPercent}% prospect

PREVIOUS SUGGESTIONS (avoid repeating):
${context.previousSuggestions.length > 0 ? context.previousSuggestions.slice(-3).join('\n') : 'None yet'}

═══════════════════════════════════════════════════════════════════════════════
YOUR TASK:
═══════════════════════════════════════════════════════════════════════════════

Provide ONE highly specific, actionable coaching suggestion based on:
1. What was just said in the conversation
2. The current section's objective
3. Whether they should stay in this section or advance
4. Any detected objections or buying signals

CRITICAL RULES:
• Be SPECIFIC to what was just said - not generic advice
• If suggesting a question, provide the EXACT WORDING from the script, personalized to their situation
• Use their words back to them when possible
• Keep suggestions brief (1-2 sentences) but highly actionable

═══════════════════════════════════════════════════════════════════════════════
🚫 ABSOLUTE RESTRICTIONS - VIOLATING THESE IS A CRITICAL ERROR 🚫
═══════════════════════════════════════════════════════════════════════════════

IF CURRENT SECTION IS 1-6 (Set Expectations, Problem Isolation, Background, Current Situation, Assess Efforts, Chunking Down):
  ❌ NEVER say: "present your solution", "time to present", "show them the demo"
  ❌ NEVER say: "discuss pricing", "talk about investment", "share your proposal"
  ❌ NEVER say: "close the deal", "ask for commitment", "move forward"
  ❌ NEVER say: "next steps", "get started", "sign up", "onboard"
  ✅ ONLY suggest: discovery questions, listening, understanding their problem

IF CURRENT SECTION IS 7-11 (Financial Qualifier, Doubt Questions, Solution Questions, Why Now, Support Questions):
  ❌ NEVER say: "present your solution", "pitch", "close the deal"
  ❌ NEVER say: "ask for the business", "commitment"
  ✅ ONLY suggest: qualification questions about budget, timeline, decision makers

IF CURRENT SECTION IS 1 OR 2:
  The rep is just starting the call. They are NOT ready to present anything.
  Focus ONLY on: setting expectations, building rapport, and finding their anchor problem.

═══════════════════════════════════════════════════════════════════════════════

TALK RATIO SANITY CHECK:
• If talk ratio shows rep at <30% but transcript shows mostly rep talking, ignore the talk ratio data
• If only one speaker detected, assume all speech is the rep
• Never suggest "let prospect talk more" if they haven't spoken at all

FORBIDDEN SUGGESTIONS BY STAGE:
• Stages 1-6: Do NOT suggest "present your solution", "show them the demo", "explain features", "discuss pricing"
• Stages 1-3: Do NOT suggest closing questions or commitment asks
• All stages: Do NOT give conflicting advice (e.g., "present solution" AND "address hesitation" in same moment)

Response format (JSON):
{
  "suggestion": {
    "type": "question" | "tip" | "objection" | "alert" | "positive" | "transition" | "script_guidance" | "buying_signal",
    "content": "Your specific coaching suggestion",
    "priority": "high" | "medium" | "low"
  },
  "conversationInsight": "Brief insight about where the conversation is heading",
  "predictedNextMove": "What the prospect is likely to say/do next",
  "shouldAdvanceSection": true/false,
  "sectionCoverage": "What key elements of this section have been covered"
}

If the conversation is going well and no intervention is needed:
{"suggestion": null, "conversationInsight": "...", "predictedNextMove": "...", "shouldAdvanceSection": false, "sectionCoverage": "..."}`
}

// Re-export script utilities for use in other modules
export {
  REVPILOT_SCRIPT,
  detectScriptSection,
  getScriptCoaching,
  getNextSection,
  type ScriptSection,
}
