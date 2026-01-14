// ============================================================
// UNIFIED CO-PILOT TYPE SYSTEM
// ============================================================

/**
 * Session context determines the mode of operation for the co-pilot.
 * - live_coaching: Real-time coaching during actual sales calls
 * - practice: AI roleplay practice sessions with simulated prospects
 * - real_call_analysis: Post-call analysis of recorded conversations
 */
export type SessionContext = 'live_coaching' | 'practice' | 'real_call_analysis'

/**
 * Method used to capture audio/transcript for the session.
 * - tab_audio: Chrome extension captures browser tab audio
 * - recall_bot: Recall.ai bot joins meeting to capture
 * - vapi: Vapi-powered voice AI for practice calls
 * - upload: User uploads recording for analysis
 */
export type CaptureMethod = 'tab_audio' | 'recall_bot' | 'vapi' | 'upload'

/**
 * Current status of the co-pilot session.
 * - starting: Session is being initialized
 * - active: Session is in progress with real-time processing
 * - analyzing: Post-call analysis is being performed
 * - completed: Session has ended with full analysis
 * - failed: Session encountered an error
 */
export type SessionStatus = 'starting' | 'active' | 'analyzing' | 'completed' | 'failed'

// ------------------------------------------------------------
// Core Session Interface
// ------------------------------------------------------------

/**
 * Unified session interface that supports all co-pilot contexts.
 * Combines functionality from coaching_sessions and practice_sessions
 * into a single, flexible structure.
 */
export interface UnifiedSession {
  /** Unique identifier for the session */
  id: string
  /** User ID from auth.users */
  userId: string
  /** Context determines behavior and UI */
  context: SessionContext
  /** How audio/transcript is captured */
  captureMethod: CaptureMethod
  /** Current session status */
  status: SessionStatus

  // Source-specific fields
  /** Meeting URL for live_coaching context */
  meetingUrl?: string
  /** Challenge ID for practice context */
  challengeId?: string
  /** Persona ID for practice context */
  personaId?: string
  /** URL of uploaded file for real_call_analysis */
  uploadedFileUrl?: string

  // Transcript & Analysis
  /** Full transcript of the conversation */
  transcript: string
  /** Extracted key information from the call */
  keyInfo: KeyInfo
  /** Complete call analysis (available after session ends) */
  analysis?: CallAnalysis

  // Script Progress (applies to coaching + practice)
  /** Progress through the script (0-100) */
  scriptProgress: number
  /** Current section of the script being followed */
  currentSection?: string
  /** List of script sections that have been covered */
  sectionsCovered: string[]

  // Gamification
  /** Total XP earned from this session */
  xpEarned?: number
  /** Detailed breakdown of XP sources */
  xpBreakdown?: XPBreakdown
  /** Primary objectives that were completed */
  objectivesCompleted?: string[]
  /** Bonus objectives that were completed */
  bonusObjectivesCompleted?: string[]

  // Timestamps
  /** When the session started */
  startedAt: Date
  /** When the session ended */
  endedAt?: Date
  /** Total duration in seconds */
  durationSeconds: number

  // Metadata
  /** Record creation timestamp */
  createdAt: Date
  /** Last update timestamp */
  updatedAt: Date
}

// ------------------------------------------------------------
// Key Information (Extracted from calls)
// ------------------------------------------------------------

/**
 * Key information extracted from sales conversations.
 * Accumulates throughout the call as new information is discovered.
 */
export interface KeyInfo {
  // Anchor Problem (critical for discovery)
  /** The main problem/pain point that anchors the conversation */
  anchorProblem?: {
    /** Whether an anchor problem has been identified */
    identified: boolean
    /** Category of the problem */
    category?: string
    /** Description of the problem */
    problem?: string
    /** Direct quotes supporting this problem */
    quotes?: string[]
    /** Severity of the problem */
    severity?: 'low' | 'medium' | 'high'
  }

  // Pain Points
  /** List of identified pain points */
  painPoints: string[]
  /** Overall severity of pain */
  painSeverity?: 'low' | 'medium' | 'high'

  // Qualification (BANT framework)
  /** Budget information mentioned */
  budget?: string
  /** Whether budget has been explicitly confirmed */
  budgetConfirmed?: boolean
  /** Timeline for decision/implementation */
  timeline?: string
  /** Urgency level of the timeline */
  timelineUrgency?: 'low' | 'medium' | 'high'
  /** Names/roles of decision makers */
  decisionMakers: string[]
  /** Description of the decision process */
  decisionProcess?: string

  // Signals
  /** Positive buying signals detected */
  buyingSignals: string[]
  /** Objections raised by the prospect */
  objections: string[]
  /** Competitors mentioned in conversation */
  competitorsMentioned: string[]

  // Company Context
  /** Name of the prospect's company */
  companyName?: string
  /** Industry of the prospect */
  industry?: string
  /** Size of the team/company */
  teamSize?: string
  /** Estimated deal size */
  dealSize?: string
  /** Expected sales cycle length */
  salesCycle?: string
  /** Current CRM being used */
  currentCRM?: string

  // Commitment (1-10 scale)
  /** Commitment score based on conversation signals */
  commitmentScore?: number
  /** Whether the prospect appears ready to close */
  readyToClose?: boolean
}

// ------------------------------------------------------------
// Unified Suggestion
// ------------------------------------------------------------

/**
 * Real-time suggestion delivered to the user during a session.
 * Supports coaching tips, questions, objection handling, and alerts.
 */
export interface UnifiedSuggestion {
  /** Unique identifier for the suggestion */
  id: string
  /** Session this suggestion belongs to */
  sessionId: string
  /** Context this suggestion was generated for */
  context: SessionContext

  // Content
  /** Type of suggestion */
  type: 'question' | 'tip' | 'objection' | 'positive' | 'alert' | 'transition'
  /** The suggestion content to display */
  content: string
  /** Priority level for display ordering */
  priority: 'high' | 'medium' | 'low'

  // Context-specific metadata
  metadata: {
    // Coaching-specific
    /** Current stage of the conversation */
    stage?: string
    /** Current section of the script */
    scriptSection?: string
    /** Specific script question being addressed */
    scriptQuestion?: string

    // Practice-specific
    /** Objective this suggestion relates to */
    objective?: string
    /** Current mood of the AI persona */
    personaMood?: 'positive' | 'neutral' | 'negative'

    // Shared
    /** AI confidence in this suggestion (0-1) */
    confidence?: number
    /** Reasoning behind the suggestion */
    reasoning?: string
  }

  /** When this suggestion was created */
  createdAt: Date
}

// ------------------------------------------------------------
// Call Analysis Result
// ------------------------------------------------------------

/**
 * Comprehensive analysis of a completed call.
 * Generated at the end of a session with detailed scoring.
 */
export interface CallAnalysis {
  /** Overall performance score (0-100) */
  overallScore: number

  // Dimension scores (0-100)
  /** Score for discovery phase performance */
  discovery: number
  /** Score for qualification (BANT) */
  qualification: number
  /** Score for value proposition delivery */
  valueArticulation: number
  /** Score for handling objections */
  objectionHandling: number
  /** Score for closing attempts/skills */
  closing: number
  /** Score for building rapport */
  rapport: number

  // Insights
  /** What the rep did well */
  strengths: string[]
  /** Areas for improvement */
  improvements: string[]
  /** Key moments in the conversation */
  keyMoments: string[]
  /** Opportunities that were missed */
  missedOpportunities: string[]

  // Next steps
  /** Suggested next steps after this call */
  suggestedNextSteps: string[]
  /** Follow-up questions to consider */
  followUpQuestions: string[]
}

// ------------------------------------------------------------
// XP Breakdown
// ------------------------------------------------------------

/**
 * Detailed breakdown of XP earned in a session.
 * Used for gamification and progress tracking.
 */
export interface XPBreakdown {
  /** Base XP for completing the session */
  base: number
  /** XP from completing objectives */
  objectives: number
  /** XP from bonus objectives */
  bonus: number
  /** Multiplier from difficulty level */
  difficulty: number
  /** Bonus from active streak */
  streak: number
  /** Total XP earned */
  total: number
}

// ------------------------------------------------------------
// Conversation Stage
// ------------------------------------------------------------

/**
 * Stage of the sales conversation.
 * Used for context-aware suggestion generation.
 */
export type ConversationStage =
  | 'opening'
  | 'discovery'
  | 'qualification'
  | 'presentation'
  | 'objection_handling'
  | 'negotiation'
  | 'closing'
  | 'wrap_up'

// ------------------------------------------------------------
// Script Section (RevPilot methodology)
// ------------------------------------------------------------

/**
 * Definition of a script section in the RevPilot methodology.
 * Used to guide reps through structured sales conversations.
 */
export interface ScriptSection {
  /** Unique identifier for the section */
  id: string
  /** Display name of the section */
  name: string
  /** Order in the script flow */
  order: number
  /** What should be accomplished in this section */
  objective: string
  /** Key questions to ask in this section */
  keyQuestions: string[]
  /** Signals that indicate transition to next section */
  transitionSignals: string[]
  /** Patterns that suggest problems in this section */
  warningPatterns: string[]
}
