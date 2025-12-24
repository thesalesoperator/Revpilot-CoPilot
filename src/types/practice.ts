// ============================================
// Practice System Types
// ============================================

import { CallAnalysis } from './database'

// Session status
export type PracticeSessionStatus = 'pending' | 'connecting' | 'active' | 'ended' | 'analyzing' | 'completed' | 'failed'

// Difficulty levels
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

// ============================================
// Challenges (hardcoded in frontend)
// ============================================

export interface BonusObjective {
  id: string
  name: string
  description: string
  icon: string
  xpBonus: number
}

export interface Challenge {
  id: string
  name: string
  description: string
  difficulty: Difficulty
  category: string
  persona: string
  personaId: string
  objectives: string[]
  bonusObjectives: BonusObjective[]
  timeLimit: number | null
  xpReward: number
  unlockRequirement?: string
  isLocked?: boolean
  systemPrompt: string // AI persona behavior prompt
}

// ============================================
// Personas (hardcoded in frontend)
// ============================================

export interface PersonaTrait {
  name: string
  description: string
}

export interface Persona {
  id: string
  name: string
  title: string
  company: string
  avatar: string
  category: 'c-suite' | 'technical' | 'finance' | 'champions' | 'blockers'
  difficulty: Difficulty
  description: string
  personality: string[]
  commonObjections: string[]
  voiceStyle: string
  systemPrompt: string // AI behavior prompt for this persona
}

// ============================================
// Practice Session (from database)
// ============================================

export interface PracticeSession {
  id: string
  user_id: string
  challenge_id: string
  persona_id: string
  difficulty: Difficulty
  vapi_call_id: string | null
  phone_number: string | null
  status: PracticeSessionStatus
  started_at: string | null
  ended_at: string | null
  duration_seconds: number
  transcript: string | null
  analysis: CallAnalysis | null
  overall_score: number | null
  objectives_completed: string[]
  bonus_objectives_completed: string[]
  xp_earned: number
  xp_breakdown: XPBreakdown
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface XPBreakdown {
  base: number
  objectives: number
  bonus: number
  streak: number
  difficulty_multiplier: number
  total: number
}

// ============================================
// User Practice Stats (from database)
// ============================================

export interface UserPracticeStats {
  id: string
  user_id: string
  total_xp: number
  current_level: number
  current_rank: string
  current_streak: number
  longest_streak: number
  last_practice_date: string | null
  total_sessions: number
  total_duration_seconds: number
  challenges_completed: number
  easy_completed: number
  medium_completed: number
  hard_completed: number
  expert_completed: number
  best_scores: Record<string, { score: number; date: string }>
  daily_challenges_completed: string[]
  daily_challenges_date: string | null
  created_at: string
  updated_at: string
}

// ============================================
// Leaderboard Entry
// ============================================

export interface LeaderboardEntry {
  id: string
  user_id: string
  period_type: 'daily' | 'weekly' | 'monthly' | 'all_time'
  period_start: string
  xp_earned: number
  sessions_completed: number
  average_score: number
  rank: number
  // Joined user data
  user?: {
    full_name: string | null
    email: string
    avatar_url: string | null
    current_rank: string
  }
}

// ============================================
// API Request Types
// ============================================

export interface StartPracticeSessionRequest {
  challenge_id: string
  persona_id: string
  difficulty: Difficulty
}

export interface EndPracticeSessionRequest {
  session_id: string
}

export interface VapiWebhookPayload {
  type: 'call-started' | 'call-ended' | 'transcript' | 'function-call' | 'hang' | 'speech-update'
  call?: {
    id: string
    status: string
    phoneNumber?: string
    startedAt?: string
    endedAt?: string
  }
  transcript?: {
    text: string
    role: 'user' | 'assistant'
    timestamp: string
  }
  functionCall?: {
    name: string
    parameters: Record<string, unknown>
  }
  [key: string]: unknown
}

// ============================================
// API Response Types
// ============================================

export interface StartPracticeSessionResponse {
  session: PracticeSession
  vapi_config: {
    assistant_id?: string
    phone_number?: string
    web_call_url?: string
  }
}

export interface EndPracticeSessionResponse {
  session: PracticeSession
}

export interface PracticeSessionDetailsResponse {
  session: PracticeSession
  challenge: Challenge
  persona: Persona
}

export interface UserPracticeStatsResponse {
  stats: UserPracticeStats
  next_level_xp: number
  xp_to_next_level: number
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[]
  user_rank?: number
  period_type: 'daily' | 'weekly' | 'monthly' | 'all_time'
}

export interface PracticeHistoryResponse {
  sessions: PracticeSession[]
  hasMore: boolean
  nextCursor?: string
}

// ============================================
// XP Calculation Constants
// ============================================

export const XP_CONFIG = {
  // Base XP per difficulty
  DIFFICULTY_BASE: {
    easy: 50,
    medium: 100,
    hard: 200,
    expert: 400,
  },
  // Difficulty multiplier for bonuses
  DIFFICULTY_MULTIPLIER: {
    easy: 1.0,
    medium: 1.25,
    hard: 1.5,
    expert: 2.0,
  },
  // XP per completed objective (percentage of base)
  OBJECTIVE_PERCENTAGE: 0.1,
  // Streak bonuses
  STREAK_BONUS: {
    3: 25, // 3-day streak: +25 XP
    7: 50, // 7-day streak: +50 XP
    14: 100, // 14-day streak: +100 XP
    30: 250, // 30-day streak: +250 XP
  },
  // Score thresholds for bonus XP
  SCORE_BONUS: {
    90: 100, // 90%+ score: +100 XP
    95: 200, // 95%+ score: +200 XP
    100: 500, // Perfect score: +500 XP
  },
} as const

// ============================================
// Level/Rank Calculation
// ============================================

export function calculateLevelFromXP(xp: number): number {
  // Each level requires progressively more XP
  // Level = floor(sqrt(xp / 50)) + 1
  return Math.max(1, Math.floor(Math.sqrt(xp / 50)) + 1)
}

export function calculateXPForLevel(level: number): number {
  // Inverse of calculateLevelFromXP
  // XP = (level - 1)^2 * 50
  return Math.pow(level - 1, 2) * 50
}

export function calculateXPToNextLevel(currentXP: number): { nextLevelXP: number; xpNeeded: number } {
  const currentLevel = calculateLevelFromXP(currentXP)
  const nextLevelXP = calculateXPForLevel(currentLevel + 1)
  return {
    nextLevelXP,
    xpNeeded: nextLevelXP - currentXP,
  }
}

export function calculateRankFromLevel(level: number): string {
  const ranks = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master']
  const divisions = ['I', 'II', 'III', 'IV', 'V']

  const tierIndex = Math.min(Math.floor((level - 1) / 5), ranks.length - 1)
  const divisionIndex = Math.min((level - 1) % 5, 4)

  return `${ranks[tierIndex]} ${divisions[divisionIndex]}`
}

// ============================================
// Utility function to calculate XP for a session
// ============================================

export function calculateSessionXP(params: {
  difficulty: Difficulty
  objectivesCompleted: number
  totalObjectives: number
  bonusObjectivesCompleted: number
  overallScore: number
  currentStreak: number
}): XPBreakdown {
  const { difficulty, objectivesCompleted, totalObjectives, bonusObjectivesCompleted, overallScore, currentStreak } = params

  const baseXP = XP_CONFIG.DIFFICULTY_BASE[difficulty]
  const multiplier = XP_CONFIG.DIFFICULTY_MULTIPLIER[difficulty]

  // Objective XP (proportional to completion)
  const objectiveXP = Math.round(baseXP * XP_CONFIG.OBJECTIVE_PERCENTAGE * objectivesCompleted)

  // Bonus objective XP (each bonus is worth 20% of base)
  const bonusXP = Math.round(baseXP * 0.2 * bonusObjectivesCompleted)

  // Streak bonus
  let streakXP = 0
  for (const [days, bonus] of Object.entries(XP_CONFIG.STREAK_BONUS).sort((a, b) => Number(b[0]) - Number(a[0]))) {
    if (currentStreak >= Number(days)) {
      streakXP = bonus
      break
    }
  }

  // Score bonus
  let scoreXP = 0
  for (const [threshold, bonus] of Object.entries(XP_CONFIG.SCORE_BONUS).sort((a, b) => Number(b[0]) - Number(a[0]))) {
    if (overallScore >= Number(threshold)) {
      scoreXP = bonus
      break
    }
  }

  // Calculate total with multiplier
  const subtotal = baseXP + objectiveXP + bonusXP + streakXP + scoreXP
  const total = Math.round(subtotal * multiplier)

  return {
    base: baseXP,
    objectives: objectiveXP,
    bonus: bonusXP + scoreXP,
    streak: streakXP,
    difficulty_multiplier: multiplier,
    total,
  }
}
