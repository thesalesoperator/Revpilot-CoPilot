import { Achievement, SkillNode } from '@/types/practice'

// ============================================
// ACHIEVEMENTS - Badges & Accomplishments
// ============================================

export const ACHIEVEMENTS: Achievement[] = [
  // ============================================
  // MILESTONE ACHIEVEMENTS (Progress-based)
  // ============================================
  {
    id: 'first-call',
    name: 'First Steps',
    description: 'Complete your first practice call',
    icon: 'phone',
    category: 'milestone',
    xpReward: 50,
    condition: { type: 'sessions_completed', count: 1 },
    rarity: 'common',
  },
  {
    id: 'ten-calls',
    name: 'Getting Warmed Up',
    description: 'Complete 10 practice calls',
    icon: 'flame',
    category: 'milestone',
    xpReward: 150,
    condition: { type: 'sessions_completed', count: 10 },
    rarity: 'common',
  },
  {
    id: 'fifty-calls',
    name: 'Serious Practitioner',
    description: 'Complete 50 practice calls',
    icon: 'target',
    category: 'milestone',
    xpReward: 500,
    condition: { type: 'sessions_completed', count: 50 },
    rarity: 'uncommon',
  },
  {
    id: 'hundred-calls',
    name: 'Century Club',
    description: 'Complete 100 practice calls',
    icon: 'trophy',
    category: 'milestone',
    xpReward: 1000,
    condition: { type: 'sessions_completed', count: 100 },
    rarity: 'rare',
  },
  {
    id: 'five-hundred-calls',
    name: 'Sales Machine',
    description: 'Complete 500 practice calls',
    icon: 'crown',
    category: 'milestone',
    xpReward: 5000,
    condition: { type: 'sessions_completed', count: 500 },
    rarity: 'legendary',
    hidden: true,
  },

  // ============================================
  // STREAK ACHIEVEMENTS
  // ============================================
  {
    id: 'streak-3',
    name: 'Building Momentum',
    description: 'Maintain a 3-day practice streak',
    icon: 'zap',
    category: 'streak',
    xpReward: 75,
    condition: { type: 'streak_days', days: 3 },
    rarity: 'common',
  },
  {
    id: 'streak-7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day practice streak',
    icon: 'flame',
    category: 'streak',
    xpReward: 200,
    condition: { type: 'streak_days', days: 7 },
    rarity: 'uncommon',
  },
  {
    id: 'streak-14',
    name: 'Fortnight Fighter',
    description: 'Maintain a 14-day practice streak',
    icon: 'fire',
    category: 'streak',
    xpReward: 400,
    condition: { type: 'streak_days', days: 14 },
    rarity: 'rare',
  },
  {
    id: 'streak-30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day practice streak',
    icon: 'calendar',
    category: 'streak',
    xpReward: 1000,
    condition: { type: 'streak_days', days: 30 },
    rarity: 'epic',
  },
  {
    id: 'streak-100',
    name: 'Unstoppable',
    description: 'Maintain a 100-day practice streak',
    icon: 'infinity',
    category: 'streak',
    xpReward: 5000,
    condition: { type: 'streak_days', days: 100 },
    rarity: 'legendary',
    hidden: true,
  },

  // ============================================
  // SKILL ACHIEVEMENTS
  // ============================================
  {
    id: 'first-perfect',
    name: 'Perfection',
    description: 'Achieve a perfect score on any challenge',
    icon: 'star',
    category: 'skill',
    xpReward: 250,
    condition: { type: 'perfect_score', count: 1 },
    rarity: 'uncommon',
  },
  {
    id: 'five-perfects',
    name: 'Consistently Excellent',
    description: 'Achieve 5 perfect scores',
    icon: 'award',
    category: 'skill',
    xpReward: 750,
    condition: { type: 'perfect_score', count: 5 },
    rarity: 'rare',
  },
  {
    id: 'objection-handler',
    name: 'Objection Handler',
    description: 'Complete 10 objection-focused challenges',
    icon: 'shield',
    category: 'skill',
    xpReward: 300,
    condition: { type: 'objective_completed', objectiveType: 'objection', count: 10 },
    rarity: 'uncommon',
  },
  {
    id: 'discovery-expert',
    name: 'Discovery Expert',
    description: 'Complete 10 discovery challenges',
    icon: 'search',
    category: 'skill',
    xpReward: 300,
    condition: { type: 'call_type_mastered', callType: 'discovery', count: 10 },
    rarity: 'uncommon',
  },
  {
    id: 'closer',
    name: 'The Closer',
    description: 'Complete 10 closing challenges',
    icon: 'check-circle',
    category: 'skill',
    xpReward: 400,
    condition: { type: 'call_type_mastered', callType: 'closing', count: 10 },
    rarity: 'rare',
  },
  {
    id: 'cold-caller',
    name: 'Cold Calling Pro',
    description: 'Complete 10 cold call challenges',
    icon: 'phone-outgoing',
    category: 'skill',
    xpReward: 400,
    condition: { type: 'call_type_mastered', callType: 'cold-call', count: 10 },
    rarity: 'rare',
  },
  {
    id: 'gatekeeper-master',
    name: 'Gatekeeper Whisperer',
    description: 'Complete 5 gatekeeper challenges',
    icon: 'door-open',
    category: 'skill',
    xpReward: 500,
    condition: { type: 'call_type_mastered', callType: 'gatekeeper', count: 5 },
    rarity: 'rare',
  },
  {
    id: 'negotiator',
    name: 'Master Negotiator',
    description: 'Complete 10 negotiation challenges',
    icon: 'handshake',
    category: 'skill',
    xpReward: 500,
    condition: { type: 'call_type_mastered', callType: 'negotiation', count: 10 },
    rarity: 'epic',
  },

  // ============================================
  // MASTERY ACHIEVEMENTS (Persona-specific)
  // ============================================
  {
    id: 'cfo-whisperer',
    name: 'CFO Whisperer',
    description: 'Win over Richard Sterling 5 times with 80%+ score',
    icon: 'dollar-sign',
    category: 'mastery',
    xpReward: 500,
    condition: { type: 'persona_mastered', personaId: 'skeptical-cfo', wins: 5 },
    rarity: 'rare',
  },
  {
    id: 'startup-charmer',
    name: 'Startup Charmer',
    description: 'Win over Maya Chen 5 times with 80%+ score',
    icon: 'rocket',
    category: 'mastery',
    xpReward: 400,
    condition: { type: 'persona_mastered', personaId: 'startup-founder', wins: 5 },
    rarity: 'uncommon',
  },
  {
    id: 'tech-translator',
    name: 'Tech Translator',
    description: 'Win over David Park 5 times with 80%+ score',
    icon: 'code',
    category: 'mastery',
    xpReward: 500,
    condition: { type: 'persona_mastered', personaId: 'technical-gatekeeper', wins: 5 },
    rarity: 'rare',
  },
  {
    id: 'champion-builder',
    name: 'Champion Builder',
    description: 'Win over Sarah Martinez 5 times with 90%+ score',
    icon: 'users',
    category: 'mastery',
    xpReward: 350,
    condition: { type: 'persona_mastered', personaId: 'friendly-champion', wins: 5 },
    rarity: 'uncommon',
  },
  {
    id: 'ice-breaker',
    name: 'Ice Breaker',
    description: 'Win over Marcus Thompson 3 times with 80%+ score',
    icon: 'snowflake',
    category: 'mastery',
    xpReward: 1000,
    condition: { type: 'persona_mastered', personaId: 'hostile-executive', wins: 3 },
    rarity: 'epic',
  },
  {
    id: 'deal-maker',
    name: 'Deal Maker',
    description: 'Win over Jennifer Walsh 5 times with 80%+ score',
    icon: 'file-text',
    category: 'mastery',
    xpReward: 500,
    condition: { type: 'persona_mastered', personaId: 'procurement-buyer', wins: 5 },
    rarity: 'rare',
  },
  {
    id: 'mad-genius',
    name: 'Mad Genius Ally',
    description: 'Win over Dr. Viktor 3 times and earn lab access',
    icon: 'flask',
    category: 'mastery',
    xpReward: 1500,
    condition: { type: 'persona_mastered', personaId: 'mad-scientist', wins: 3 },
    rarity: 'legendary',
    hidden: true,
  },

  // ============================================
  // DIFFICULTY MASTERY
  // ============================================
  {
    id: 'easy-master',
    name: 'Fundamentals Mastered',
    description: 'Complete all Easy challenges with 80%+ score',
    icon: 'check',
    category: 'mastery',
    xpReward: 300,
    condition: { type: 'difficulty_mastered', difficulty: 'easy', count: 5 },
    rarity: 'common',
  },
  {
    id: 'medium-master',
    name: 'Intermediate Domination',
    description: 'Complete all Medium challenges with 80%+ score',
    icon: 'check-check',
    category: 'mastery',
    xpReward: 600,
    condition: { type: 'difficulty_mastered', difficulty: 'medium', count: 5 },
    rarity: 'uncommon',
  },
  {
    id: 'hard-master',
    name: 'Advanced Ace',
    description: 'Complete all Hard challenges with 80%+ score',
    icon: 'trophy',
    category: 'mastery',
    xpReward: 1000,
    condition: { type: 'difficulty_mastered', difficulty: 'hard', count: 5 },
    rarity: 'rare',
  },
  {
    id: 'expert-master',
    name: 'Elite Performer',
    description: 'Complete all Expert challenges with 80%+ score',
    icon: 'crown',
    category: 'mastery',
    xpReward: 2500,
    condition: { type: 'difficulty_mastered', difficulty: 'expert', count: 5 },
    rarity: 'epic',
  },

  // ============================================
  // SPECIAL ACHIEVEMENTS
  // ============================================
  {
    id: 'firefighter',
    name: 'Firefighter',
    description: 'Recover from a demo disaster scenario',
    icon: 'flame',
    category: 'special',
    xpReward: 400,
    condition: { type: 'challenge_completed', challengeId: 'demo-disaster' },
    rarity: 'rare',
  },
  {
    id: 'gatekeeper-breaker',
    name: 'Past the Gate',
    description: 'Successfully get past the gatekeeper on first try',
    icon: 'door-open',
    category: 'special',
    xpReward: 350,
    condition: { type: 'challenge_completed', challengeId: 'cold-call-gatekeeper' },
    rarity: 'uncommon',
  },
  {
    id: 'value-defender',
    name: 'Value Defender',
    description: 'Win a negotiation without discounting',
    icon: 'shield',
    category: 'special',
    xpReward: 500,
    condition: { type: 'special', trigger: 'no_discount_win' },
    rarity: 'rare',
  },
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    description: 'Complete a challenge in under 5 minutes with 90%+ score',
    icon: 'zap',
    category: 'special',
    xpReward: 400,
    condition: { type: 'special', trigger: 'fast_high_score' },
    rarity: 'rare',
  },
  {
    id: 'chameleon',
    name: 'Chameleon',
    description: 'Successfully adapt your approach 3+ times in one call',
    icon: 'refresh',
    category: 'special',
    xpReward: 350,
    condition: { type: 'special', trigger: 'multiple_pivots' },
    rarity: 'uncommon',
  },
  {
    id: 'comeback-kid',
    name: 'Comeback Kid',
    description: 'Turn a hostile prospect into a champion in one call',
    icon: 'rotate-ccw',
    category: 'special',
    xpReward: 750,
    condition: { type: 'special', trigger: 'hostile_to_champion' },
    rarity: 'epic',
  },
  {
    id: 'deal-resurrector',
    name: 'Deal Resurrector',
    description: 'Successfully revive a dead deal in rescue mission',
    icon: 'heart',
    category: 'special',
    xpReward: 600,
    condition: { type: 'challenge_completed', challengeId: 'deal-rescue' },
    rarity: 'rare',
  },

  // ============================================
  // LEVEL & XP ACHIEVEMENTS
  // ============================================
  {
    id: 'level-5',
    name: 'Rising Star',
    description: 'Reach Level 5',
    icon: 'star',
    category: 'milestone',
    xpReward: 100,
    condition: { type: 'level_reached', level: 5 },
    rarity: 'common',
  },
  {
    id: 'level-10',
    name: 'Sales Professional',
    description: 'Reach Level 10',
    icon: 'award',
    category: 'milestone',
    xpReward: 250,
    condition: { type: 'level_reached', level: 10 },
    rarity: 'uncommon',
  },
  {
    id: 'level-25',
    name: 'Senior Seller',
    description: 'Reach Level 25',
    icon: 'medal',
    category: 'milestone',
    xpReward: 750,
    condition: { type: 'level_reached', level: 25 },
    rarity: 'rare',
  },
  {
    id: 'level-50',
    name: 'Sales Legend',
    description: 'Reach Level 50',
    icon: 'crown',
    category: 'milestone',
    xpReward: 2000,
    condition: { type: 'level_reached', level: 50 },
    rarity: 'epic',
  },
  {
    id: 'xp-10k',
    name: 'XP Accumulator',
    description: 'Earn 10,000 total XP',
    icon: 'trending-up',
    category: 'milestone',
    xpReward: 500,
    condition: { type: 'xp_earned', amount: 10000 },
    rarity: 'uncommon',
  },
  {
    id: 'xp-50k',
    name: 'XP Mogul',
    description: 'Earn 50,000 total XP',
    icon: 'bar-chart',
    category: 'milestone',
    xpReward: 2000,
    condition: { type: 'xp_earned', amount: 50000 },
    rarity: 'epic',
  },
]

// ============================================
// SKILL TREE - Progressive Skills
// ============================================

export const SKILL_TREE: SkillNode[] = [
  // ============================================
  // TIER 1 - FUNDAMENTALS
  // ============================================
  {
    id: 'active-listening',
    name: 'Active Listening',
    description: 'Master the art of truly hearing what prospects say',
    icon: 'ear',
    category: 'discovery',
    position: { x: 0, y: 0 },
    prerequisites: [],
    xpCost: 100,
    benefits: [
      'Better at identifying pain points',
      'Improved rapport building',
      '+5% XP on discovery challenges',
    ],
    trainingChallenges: ['discovery-101'],
  },
  {
    id: 'rapport-basics',
    name: 'Rapport Building',
    description: 'Learn to quickly establish trust and connection',
    icon: 'heart-handshake',
    category: 'rapport',
    position: { x: 1, y: 0 },
    prerequisites: [],
    xpCost: 100,
    benefits: [
      'Faster warm-up with prospects',
      'More natural conversations',
      '+5% XP on rapport objectives',
    ],
    trainingChallenges: ['discovery-101', 'first-close'],
  },
  {
    id: 'question-framework',
    name: 'Questioning Framework',
    description: 'Structure your discovery questions for maximum impact',
    icon: 'help-circle',
    category: 'discovery',
    position: { x: 2, y: 0 },
    prerequisites: [],
    xpCost: 100,
    benefits: [
      'More effective discovery calls',
      'Uncover deeper pain points',
      '+5% XP on question-based objectives',
    ],
    trainingChallenges: ['discovery-101'],
  },

  // ============================================
  // TIER 2 - INTERMEDIATE
  // ============================================
  {
    id: 'objection-acknowledge',
    name: 'Acknowledge & Pivot',
    description: 'Handle objections by first acknowledging concerns',
    icon: 'message-circle',
    category: 'objection-handling',
    position: { x: 0, y: 1 },
    prerequisites: ['active-listening'],
    xpCost: 200,
    benefits: [
      'Defuse tension in objections',
      'Build trust through empathy',
      '+10% XP on objection challenges',
    ],
    trainingChallenges: ['price-objection'],
  },
  {
    id: 'value-articulation',
    name: 'Value Articulation',
    description: 'Clearly communicate value in terms that matter to buyers',
    icon: 'dollar-sign',
    category: 'closing',
    position: { x: 1, y: 1 },
    prerequisites: ['rapport-basics'],
    xpCost: 200,
    benefits: [
      'More compelling value props',
      'Better ROI conversations',
      '+10% XP on value-related objectives',
    ],
    trainingChallenges: ['price-objection', 'first-close'],
  },
  {
    id: 'stakeholder-mapping',
    name: 'Stakeholder Mapping',
    description: 'Identify and navigate complex buying committees',
    icon: 'users',
    category: 'discovery',
    position: { x: 2, y: 1 },
    prerequisites: ['question-framework'],
    xpCost: 200,
    benefits: [
      'Better multi-threading',
      'Identify blockers early',
      '+10% XP on stakeholder objectives',
    ],
    trainingChallenges: ['discovery-101'],
  },

  // ============================================
  // TIER 3 - ADVANCED
  // ============================================
  {
    id: 'objection-reframe',
    name: 'Reframe & Redirect',
    description: 'Turn objections into opportunities',
    icon: 'rotate-cw',
    category: 'objection-handling',
    position: { x: 0, y: 2 },
    prerequisites: ['objection-acknowledge'],
    xpCost: 350,
    benefits: [
      'Transform objections into selling points',
      'Maintain momentum',
      '+15% XP on hard objection challenges',
    ],
    trainingChallenges: ['objection-gauntlet', 'price-objection'],
  },
  {
    id: 'negotiation-tactics',
    name: 'Negotiation Tactics',
    description: 'Master give-and-take without giving away value',
    icon: 'scale',
    category: 'negotiation',
    position: { x: 1, y: 2 },
    prerequisites: ['value-articulation'],
    xpCost: 350,
    benefits: [
      'Protect deal margins',
      'Creative deal structuring',
      '+15% XP on negotiation challenges',
    ],
    trainingChallenges: ['competitor-battle'],
  },
  {
    id: 'executive-communication',
    name: 'Executive Communication',
    description: 'Speak the language of C-suite buyers',
    icon: 'briefcase',
    category: 'executive-presence',
    position: { x: 2, y: 2 },
    prerequisites: ['stakeholder-mapping'],
    xpCost: 350,
    benefits: [
      'Credibility with executives',
      'Strategic conversations',
      '+15% XP on C-suite challenges',
    ],
    trainingChallenges: ['ceo-pitch', 'hostile-executive'],
  },

  // ============================================
  // TIER 4 - EXPERT
  // ============================================
  {
    id: 'composure-under-fire',
    name: 'Composure Under Fire',
    description: 'Stay calm and effective under intense pressure',
    icon: 'shield',
    category: 'executive-presence',
    position: { x: 0, y: 3 },
    prerequisites: ['objection-reframe'],
    xpCost: 500,
    benefits: [
      'Handle hostile prospects',
      'Turn pressure into opportunity',
      '+20% XP on expert challenges',
    ],
    trainingChallenges: ['hostile-executive', 'objection-gauntlet'],
  },
  {
    id: 'deal-architecture',
    name: 'Deal Architecture',
    description: 'Structure complex, multi-stakeholder deals',
    icon: 'layout',
    category: 'closing',
    position: { x: 1, y: 3 },
    prerequisites: ['negotiation-tactics'],
    xpCost: 500,
    benefits: [
      'Close larger deals',
      'Navigate procurement',
      '+20% XP on complex deals',
    ],
    trainingChallenges: ['competitor-battle'],
  },
  {
    id: 'deal-recovery',
    name: 'Deal Recovery',
    description: 'Revive stalled and lost opportunities',
    icon: 'refresh-cw',
    category: 'closing',
    position: { x: 2, y: 3 },
    prerequisites: ['executive-communication'],
    xpCost: 500,
    benefits: [
      'Resurrect dead deals',
      'Second-chance mastery',
      '+20% XP on rescue challenges',
    ],
    trainingChallenges: ['deal-rescue'],
  },

  // ============================================
  // TIER 5 - MASTERY
  // ============================================
  {
    id: 'sales-mastery',
    name: 'Sales Mastery',
    description: 'The pinnacle of sales excellence',
    icon: 'crown',
    category: 'closing',
    position: { x: 1, y: 4 },
    prerequisites: ['composure-under-fire', 'deal-architecture', 'deal-recovery'],
    xpCost: 1000,
    benefits: [
      '+25% XP on all challenges',
      'Unlock exclusive scenarios',
      'Sales Legend status',
    ],
    trainingChallenges: ['secret-agent'],
  },
]

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id)
}

export function getSkillNodeById(id: string): SkillNode | undefined {
  return SKILL_TREE.find(s => s.id === id)
}

export function getAchievementsByCategory(category: Achievement['category']): Achievement[] {
  return ACHIEVEMENTS.filter(a => a.category === category)
}

export function getSkillNodesByCategory(category: SkillNode['category']): SkillNode[] {
  return SKILL_TREE.filter(s => s.category === category)
}

export function getAvailableSkillNodes(unlockedSkills: string[]): SkillNode[] {
  return SKILL_TREE.filter(skill => {
    // Already unlocked
    if (unlockedSkills.includes(skill.id)) return false
    // Check prerequisites
    return skill.prerequisites.every(prereq => unlockedSkills.includes(prereq))
  })
}

export function getUnlockedAchievements(stats: {
  total_sessions: number
  current_streak: number
  best_scores: Record<string, { score: number }>
  total_xp: number
  current_level: number
  challenges_completed: number
  easy_completed: number
  medium_completed: number
  hard_completed: number
  expert_completed: number
}): string[] {
  const unlocked: string[] = []

  for (const achievement of ACHIEVEMENTS) {
    let isUnlocked = false

    switch (achievement.condition.type) {
      case 'sessions_completed':
        isUnlocked = stats.total_sessions >= achievement.condition.count
        break
      case 'streak_days':
        isUnlocked = stats.current_streak >= achievement.condition.days
        break
      case 'perfect_score':
        const perfectScores = Object.values(stats.best_scores).filter(s => s.score >= 100).length
        isUnlocked = perfectScores >= achievement.condition.count
        break
      case 'xp_earned':
        isUnlocked = stats.total_xp >= achievement.condition.amount
        break
      case 'level_reached':
        isUnlocked = stats.current_level >= achievement.condition.level
        break
      case 'difficulty_mastered':
        const difficultyCount = stats[`${achievement.condition.difficulty}_completed` as keyof typeof stats] as number
        isUnlocked = difficultyCount >= achievement.condition.count
        break
      // Other condition types would need additional tracking
      default:
        break
    }

    if (isUnlocked) {
      unlocked.push(achievement.id)
    }
  }

  return unlocked
}
