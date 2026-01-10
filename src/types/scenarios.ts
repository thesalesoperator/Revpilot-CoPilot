// ============================================
// AI Scenarios & Unified Scoring Types
// ============================================

// Unified score breakdown (100 points total)
export interface UnifiedScoreBreakdown {
  discovery: number        // 25 points max - Quality of discovery questions
  objection_handling: number // 25 points max - How well objections were handled
  value_articulation: number // 20 points max - Clear value communication
  call_control: number      // 15 points max - Managing the conversation flow
  close_execution: number   // 15 points max - Moving toward close/next steps
}

// Score category details for feedback
export interface ScoreCategoryDetail {
  score: number
  maxScore: number
  percentage: number
  feedback: string
  highlights: string[]
  improvements: string[]
}

// Full unified scoring result
export interface UnifiedScoringResult {
  total_score: number
  score_breakdown: UnifiedScoreBreakdown
  category_details: {
    discovery: ScoreCategoryDetail
    objection_handling: ScoreCategoryDetail
    value_articulation: ScoreCategoryDetail
    call_control: ScoreCategoryDetail
    close_execution: ScoreCategoryDetail
  }
  overall_feedback: string
  key_strengths: string[]
  key_improvements: string[]
  next_steps: string[]
}

// ============================================
// AI Scenario Types
// ============================================

export type ScenarioStatus = 'active' | 'archived'

export interface AnchorProblem {
  problem: string
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface AIScenario {
  id: string
  user_id: string
  source_session_id: string | null
  name: string
  description: string | null
  prospect_name: string | null
  prospect_title: string | null
  prospect_company: string | null
  prospect_personality: string | null
  anchor_problem: AnchorProblem | null
  pain_points: string[]
  objections: string[]
  buying_signals: string[]
  improvement_areas: string[]
  missed_opportunities: string[]
  system_prompt: string
  first_message: string | null
  voice_id: string
  status: ScenarioStatus
  attempts_count: number
  best_score: number | null
  average_score: number | null
  last_attempted_at: string | null
  created_at: string
  updated_at: string
}

export interface ScenarioAttempt {
  id: string
  scenario_id: string
  user_id: string
  vapi_call_id: string | null
  status: 'pending' | 'connecting' | 'active' | 'ended' | 'analyzing' | 'completed' | 'failed'
  started_at: string | null
  ended_at: string | null
  duration_seconds: number
  transcript: string | null
  total_score: number | null
  score_breakdown: UnifiedScoreBreakdown | null
  improvements_made: string[]
  remaining_improvements: string[]
  compared_to_source: ComparisonToSource | null
  analysis: ScenarioAnalysis | null
  xp_earned: number
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface ComparisonToSource {
  source_score: number
  current_score: number
  improvement: number
  improvement_percentage: number
  areas_improved: string[]
  areas_declined: string[]
}

export interface ScenarioAnalysis {
  summary: string
  handled_objections: string[]
  missed_objections: string[]
  discovered_pain_points: string[]
  missed_pain_points: string[]
  value_props_delivered: string[]
  closing_attempts: string[]
  overall_performance: 'excellent' | 'good' | 'needs_improvement' | 'poor'
}

// ============================================
// API Request Types
// ============================================

export interface CreateScenarioRequest {
  source_session_id: string
  name?: string
}

export interface StartScenarioAttemptRequest {
  scenario_id: string
}

export interface AnalyzeCallRequest {
  transcript: string
  call_type: 'live' | 'practice' | 'scenario'
  context?: {
    prospect_name?: string
    prospect_company?: string
    known_objections?: string[]
    known_pain_points?: string[]
    improvement_areas?: string[]
  }
}

// ============================================
// API Response Types
// ============================================

export interface CreateScenarioResponse {
  scenario: AIScenario
}

export interface ListScenariosResponse {
  scenarios: AIScenario[]
  active_count: number
  max_active: number
}

export interface ScenarioDetailsResponse {
  scenario: AIScenario
  attempts: ScenarioAttempt[]
  improvement_trend: {
    attempts: number[]
    scores: number[]
    average_improvement: number
  }
}

export interface StartScenarioAttemptResponse {
  attempt: ScenarioAttempt
  scenario: AIScenario
  vapi_config: {
    assistant: {
      name: string
      voice: {
        provider: '11labs'
        voiceId: string
      }
      model: {
        provider: 'openai'
        model: string
        messages: Array<{ role: 'system'; content: string }>
      }
      firstMessage: string
    }
    metadata: {
      attempt_id: string
      scenario_id: string
      user_id: string
    }
  }
}

export interface AnalyzeCallResponse {
  scoring: UnifiedScoringResult
  xp_earned: number
  xp_breakdown: {
    base: number
    performance: number
    improvement: number
    streak: number
    total: number
  }
}

// ============================================
// Scoring Constants
// ============================================

export const SCORE_WEIGHTS = {
  discovery: 25,
  objection_handling: 25,
  value_articulation: 20,
  call_control: 15,
  close_execution: 15,
} as const

export const SCORE_THRESHOLDS = {
  excellent: 90,
  good: 75,
  needs_improvement: 50,
  poor: 0,
} as const

export function getPerformanceLevel(score: number): 'excellent' | 'good' | 'needs_improvement' | 'poor' {
  if (score >= SCORE_THRESHOLDS.excellent) return 'excellent'
  if (score >= SCORE_THRESHOLDS.good) return 'good'
  if (score >= SCORE_THRESHOLDS.needs_improvement) return 'needs_improvement'
  return 'poor'
}
