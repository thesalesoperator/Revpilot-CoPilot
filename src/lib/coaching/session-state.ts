/**
 * Session State Management for RevPilot Coaching
 *
 * This module provides persistent, reliable session state management
 * with comprehensive tracking for script-based coaching.
 */

import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from './config'
import { ConversationStage, SalesMethodology } from './intelligence'
import { REVPILOT_SCRIPT } from './revpilot-script'

// =============================================================================
// TYPES
// =============================================================================

export interface SectionCoverage {
  sectionId: string
  entered: boolean
  enteredAt?: number
  questionsAsked: string[]
  keyElementsCovered: string[]
  timeSpentSeconds: number
  completed: boolean
  completedAt?: number
}

export interface AnchorProblem {
  identified: boolean
  problem: string | null
  category: string | null  // 'data', 'pipeline', 'reporting', 'adoption', 'integration', 'process'
  severity: 'low' | 'medium' | 'high' | null
  quotes: string[]  // Direct quotes from prospect about the problem
}

export interface ExtractedKeyInfo {
  // Company context
  companyName: string | null
  industry: string | null
  teamSize: string | null
  dealSize: string | null
  salesCycle: string | null
  currentCRM: string | null

  // Pain and problems
  anchorProblem: AnchorProblem
  painPoints: string[]
  painSeverity: 'low' | 'medium' | 'high' | null

  // Qualification
  budget: string | null
  budgetConfirmed: boolean
  timeline: string | null
  timelineUrgency: 'low' | 'medium' | 'high' | null
  decisionMakers: string[]
  decisionProcess: string | null

  // Buying signals
  buyingSignals: string[]
  objections: string[]
  competitorsMentioned: string[]

  // Conversation quality
  commitmentScore: number | null  // 1-10 scale from Section 15
  readyToClose: boolean
}

export interface ConversationSummary {
  overview: string
  keyMoments: string[]
  missedOpportunities: string[]
  lastUpdated: number
}

export interface SessionState {
  // Basic info
  sessionId: string
  userId: string
  methodology: SalesMethodology
  startTime: number
  lastUpdateTime: number

  // Transcript management
  fullTranscript: string
  recentTranscriptChunks: string[]  // Last 10 chunks for context
  totalWordCount: number

  // Script tracking
  currentScriptSection: string
  sectionHistory: string[]  // Ordered list of sections visited
  sectionCoverage: Record<string, SectionCoverage>
  scriptProgress: number

  // Conversation stage (for non-script methodologies)
  lastStage: ConversationStage

  // Key information extracted
  keyInfo: ExtractedKeyInfo

  // Coaching state
  previousSuggestions: string[]
  suggestionCount: number
  lastSuggestionTime: number

  // Conversation summary (updated periodically)
  summary: ConversationSummary | null

  // Talk ratio tracking
  repWordCount: number
  prospectWordCount: number
}

// =============================================================================
// DEFAULT STATE FACTORY
// =============================================================================

export function createDefaultState(sessionId: string, userId: string, methodology: SalesMethodology): SessionState {
  const now = Date.now()

  // Initialize section coverage for all script sections
  const sectionCoverage: Record<string, SectionCoverage> = {}
  for (const section of REVPILOT_SCRIPT.sections) {
    sectionCoverage[section.id] = {
      sectionId: section.id,
      entered: false,
      questionsAsked: [],
      keyElementsCovered: [],
      timeSpentSeconds: 0,
      completed: false,
    }
  }

  return {
    sessionId,
    userId,
    methodology,
    startTime: now,
    lastUpdateTime: now,

    fullTranscript: '',
    recentTranscriptChunks: [],
    totalWordCount: 0,

    currentScriptSection: 'set_expectations',
    sectionHistory: ['set_expectations'],
    sectionCoverage,
    scriptProgress: 0,

    lastStage: 'opening',

    keyInfo: {
      companyName: null,
      industry: null,
      teamSize: null,
      dealSize: null,
      salesCycle: null,
      currentCRM: null,

      anchorProblem: {
        identified: false,
        problem: null,
        category: null,
        severity: null,
        quotes: [],
      },
      painPoints: [],
      painSeverity: null,

      budget: null,
      budgetConfirmed: false,
      timeline: null,
      timelineUrgency: null,
      decisionMakers: [],
      decisionProcess: null,

      buyingSignals: [],
      objections: [],
      competitorsMentioned: [],

      commitmentScore: null,
      readyToClose: false,
    },

    previousSuggestions: [],
    suggestionCount: 0,
    lastSuggestionTime: 0,

    summary: null,

    repWordCount: 0,
    prospectWordCount: 0,
  }
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

// Lazy-initialized Supabase client to avoid build-time errors
let supabaseInstance: ReturnType<typeof createClient> | null = null

function getSupabase() {
  if (!supabaseInstance && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  }
  return supabaseInstance
}

// In-memory cache with database persistence
const stateCache = new Map<string, SessionState>()

export async function getSessionState(sessionId: string, userId: string, methodology: SalesMethodology): Promise<SessionState> {
  // Check cache first
  if (stateCache.has(sessionId)) {
    return stateCache.get(sessionId)!
  }

  // Try to load from database
  const supabase = getSupabase()
  if (supabase) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: session, error } = await (supabase as any)
        .from('coaching_sessions')
        .select('session_state')
        .eq('id', sessionId)
        .single()

      if (!error && session?.session_state) {
        const state = session.session_state as SessionState
        stateCache.set(sessionId, state)
        return state
      }
    } catch (e) {
      console.error('[SessionState] Error loading from DB:', e)
    }
  }

  // Create new state
  const state = createDefaultState(sessionId, userId, methodology)
  stateCache.set(sessionId, state)
  return state
}

export async function saveSessionState(state: SessionState): Promise<void> {
  // Update cache
  stateCache.set(state.sessionId, state)
  state.lastUpdateTime = Date.now()

  // Persist to database
  const supabase = getSupabase()
  if (supabase) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('coaching_sessions')
        .update({ session_state: state })
        .eq('id', state.sessionId)
    } catch (e) {
      console.error('[SessionState] Error saving to DB:', e)
    }
  }
}

export function clearSessionState(sessionId: string): void {
  stateCache.delete(sessionId)
}

// =============================================================================
// KEY INFO EXTRACTION - ENHANCED FOR REVPILOT SCRIPT
// =============================================================================

// Sales ops problem categories with detection patterns
const PROBLEM_CATEGORIES = {
  data: {
    patterns: [
      /data\s*(is\s*)?(mess|dirty|incomplete|duplicate|inconsistent|wrong|bad|outdated)/i,
      /duplicate\s*(records?|contacts?|leads?|accounts?)/i,
      /can'?t\s*trust\s*(the\s*)?data/i,
      /data\s*quality/i,
      /cleaning\s*(up\s*)?(the\s*)?(data|crm)/i,
    ],
    keywords: ['data', 'duplicate', 'records', 'contacts', 'dirty', 'clean']
  },
  pipeline: {
    patterns: [
      /pipeline\s*(is\s*)?(mess|unclear|inaccurate|wrong|confusing)/i,
      /can'?t\s*(see|track|understand)\s*(the\s*)?pipeline/i,
      /deals?\s*(fall|slip|disappear)/i,
      /no\s*visibility\s*(into|on)\s*(the\s*)?pipeline/i,
      /pipeline\s*management/i,
    ],
    keywords: ['pipeline', 'deals', 'visibility', 'forecast', 'stages']
  },
  reporting: {
    patterns: [
      /report(s|ing)?\s*(is\s*)?(painful|manual|time-consuming|broken|wrong)/i,
      /can'?t\s*(get|see|pull)\s*(the\s*)?report/i,
      /spend\s*hours?\s*(on\s*)?report/i,
      /no\s*visibility/i,
      /dashboard/i,
    ],
    keywords: ['reports', 'reporting', 'dashboard', 'metrics', 'visibility']
  },
  adoption: {
    patterns: [
      /team\s*(doesn'?t|won'?t|isn'?t)\s*(use|using|adopt)/i,
      /no\s*one\s*(uses?|updates?)/i,
      /reps?\s*(don'?t|won'?t|hate)\s*using/i,
      /adoption\s*(is\s*)?(low|poor|bad|problem)/i,
      /people\s*aren'?t\s*logging/i,
    ],
    keywords: ['adoption', 'using', 'reps', 'team', 'training']
  },
  integration: {
    patterns: [
      /integrat(ion|e|ed)\s*(is\s*)?(broken|missing|doesn'?t|won'?t)/i,
      /tools?\s*(don'?t|aren'?t)\s*(talk|sync|connect)/i,
      /manual(ly)?\s*(enter|copy|move|sync)/i,
      /data\s*(doesn'?t|isn'?t)\s*(flow|sync)/i,
    ],
    keywords: ['integration', 'sync', 'connect', 'tools', 'systems']
  },
  process: {
    patterns: [
      /process\s*(is\s*)?(unclear|undefined|inconsistent|broken)/i,
      /no\s*(standard|defined)\s*process/i,
      /everyone\s*(does\s*it\s*)?differently/i,
      /workflow\s*(is\s*)?(broken|manual|painful)/i,
    ],
    keywords: ['process', 'workflow', 'standard', 'consistent']
  }
}

// Budget detection patterns
const BUDGET_PATTERNS = [
  /\$\s*[\d,]+(?:\s*(?:k|K|thousand|million|M|m))?\b/g,
  /(?:budget|invest|spend|pay|cost)\s*(?:of|is|around|about)?\s*\$?\s*[\d,]+/gi,
  /[\d,]+\s*(?:k|K|thousand|dollars?|per\s*month|monthly|annually)/gi,
]

// Timeline detection patterns
const TIMELINE_PATTERNS = [
  /(?:by|before|within|in\s*the\s*next)\s+(?:Q[1-4]|January|February|March|April|May|June|July|August|September|October|November|December|\d+\s*(?:days?|weeks?|months?|quarters?|years?))/gi,
  /(?:end\s*of|beginning\s*of|start\s*of)\s+(?:the\s*)?(?:year|quarter|month|Q[1-4]|January|February|March|April|May|June|July|August|September|October|November|December)/gi,
  /(?:this|next)\s+(?:week|month|quarter|year)/gi,
  /(?:asap|immediately|urgently|as\s*soon\s*as\s*possible)/gi,
]

// Decision maker detection patterns
const DECISION_MAKER_PATTERNS = [
  /(?:my|our)\s+(?:boss|manager|VP|director|CEO|CTO|CFO|CMO|COO|CRO|head\s*of|chief|founder|owner)/gi,
  /(?:report\s*to|check\s*with|run\s*it\s*by|approval\s*from|sign-off\s*from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
  /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:makes?|has)\s+(?:the\s+)?(?:final\s+)?(?:decision|call|say)/gi,
]

// Company info patterns
const COMPANY_PATTERNS = {
  teamSize: [
    /(?:team\s*(?:of|is|has)?\s*)(\d+)\s*(?:people|reps?|salespeople|SDRs?|AEs?|BDRs?)/gi,
    /(\d+)\s*(?:people|reps?|salespeople)\s*(?:on\s*(?:the\s*)?team|in\s*sales)/gi,
  ],
  dealSize: [
    /(?:average|typical)\s*(?:deal|contract|ACV)\s*(?:size|value)?\s*(?:is|of|around)?\s*\$?\s*([\d,]+(?:\s*[kKmM])?)/gi,
    /\$?\s*([\d,]+(?:\s*[kKmM])?)\s*(?:ACV|deal|contract)/gi,
  ],
  salesCycle: [
    /(?:sales\s*)?cycle\s*(?:is|of|takes?|around)?\s*(\d+)\s*(?:days?|weeks?|months?)/gi,
    /(?:takes?|usually)\s*(\d+)\s*(?:days?|weeks?|months?)\s*(?:to\s*close|from\s*lead)/gi,
  ],
  crm: [
    /(?:using|use|on|have)\s+(Close|Salesforce|HubSpot|Pipedrive|Zoho|Freshsales|Monday|Copper|Streak)/gi,
    /(Close|Salesforce|HubSpot|Pipedrive|Zoho)\s*(?:CRM|as\s*(?:our|the)\s*CRM)/gi,
  ]
}

// Buying signal patterns
const BUYING_SIGNAL_PATTERNS = [
  /how\s*(?:soon|quickly)\s*can\s*(?:we|you)\s*(?:start|begin|get\s*started)/gi,
  /what\s*(?:are|is)\s*(?:the\s*)?(?:next\s*steps?|process)/gi,
  /(?:can|could)\s*you\s*send\s*(?:me|us)\s*(?:a\s*)?(?:proposal|quote|pricing)/gi,
  /(?:let'?s|we\s*should)\s*(?:do\s*it|move\s*forward|get\s*started)/gi,
  /(?:this|that)\s*(?:sounds?|looks?)\s*(?:great|good|perfect|exactly)/gi,
  /(?:when|how)\s*(?:can|do)\s*we\s*(?:start|begin|sign|get\s*going)/gi,
  /(?:i'?m|we'?re)\s*(?:ready|interested|convinced)/gi,
]

// Objection patterns
const OBJECTION_PATTERNS = [
  { category: 'price', pattern: /(?:too\s*expensive|out\s*of\s*budget|can'?t\s*afford|costs?\s*too\s*much|cheaper)/gi },
  { category: 'timing', pattern: /(?:not\s*(?:the\s*)?right\s*time|maybe\s*later|next\s*quarter|too\s*busy|bad\s*timing)/gi },
  { category: 'authority', pattern: /(?:need\s*to\s*(?:check|ask|run\s*it\s*by)|not\s*my\s*decision|get\s*approval)/gi },
  { category: 'competition', pattern: /(?:looking\s*at\s*(?:other|alternatives)|comparing|competitor|other\s*options)/gi },
  { category: 'status_quo', pattern: /(?:happy\s*with\s*(?:what\s*we\s*have|current)|works?\s*(?:fine|okay)|not\s*broken)/gi },
  { category: 'trust', pattern: /(?:how\s*do\s*(?:i|we)\s*know|guarantee|what\s*if\s*it\s*doesn'?t)/gi },
]

export function extractKeyInfo(transcript: string, existingInfo: ExtractedKeyInfo): ExtractedKeyInfo {
  const info = JSON.parse(JSON.stringify(existingInfo)) as ExtractedKeyInfo
  const lower = transcript.toLowerCase()

  // =========================================================================
  // ANCHOR PROBLEM DETECTION (CRITICAL FOR SECTION 2)
  // =========================================================================

  if (!info.anchorProblem.identified) {
    for (const [category, config] of Object.entries(PROBLEM_CATEGORIES)) {
      for (const pattern of config.patterns) {
        const match = transcript.match(pattern)
        if (match) {
          // Extract the full sentence containing the problem
          const sentenceMatch = transcript.match(new RegExp(`[^.!?]*${match[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.!?]*[.!?]`, 'i'))
          const quote = sentenceMatch ? sentenceMatch[0].trim() : match[0]

          info.anchorProblem = {
            identified: true,
            problem: quote,
            category: category as AnchorProblem['category'],
            severity: determineSeverity(transcript, match[0]),
            quotes: [quote],
          }

          // Also add to pain points
          if (!info.painPoints.includes(quote)) {
            info.painPoints.push(quote)
          }

          break
        }
      }
      if (info.anchorProblem.identified) break
    }
  } else {
    // Add additional problem quotes
    for (const [category, config] of Object.entries(PROBLEM_CATEGORIES)) {
      for (const pattern of config.patterns) {
        const matches = transcript.matchAll(pattern)
        for (const match of matches) {
          const sentenceMatch = transcript.match(new RegExp(`[^.!?]*${match[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.!?]*[.!?]`, 'i'))
          const quote = sentenceMatch ? sentenceMatch[0].trim() : match[0]

          if (quote.length > 20 && !info.anchorProblem.quotes.includes(quote) && info.anchorProblem.quotes.length < 5) {
            info.anchorProblem.quotes.push(quote)
          }
        }
      }
    }
  }

  // =========================================================================
  // COMPANY INFORMATION
  // =========================================================================

  // Team size
  if (!info.teamSize) {
    for (const pattern of COMPANY_PATTERNS.teamSize) {
      const match = transcript.match(pattern)
      if (match) {
        info.teamSize = match[1] || match[0]
        break
      }
    }
  }

  // Deal size
  if (!info.dealSize) {
    for (const pattern of COMPANY_PATTERNS.dealSize) {
      const match = transcript.match(pattern)
      if (match) {
        info.dealSize = match[1] || match[0]
        break
      }
    }
  }

  // Sales cycle
  if (!info.salesCycle) {
    for (const pattern of COMPANY_PATTERNS.salesCycle) {
      const match = transcript.match(pattern)
      if (match) {
        info.salesCycle = match[0]
        break
      }
    }
  }

  // CRM
  if (!info.currentCRM) {
    for (const pattern of COMPANY_PATTERNS.crm) {
      const match = transcript.match(pattern)
      if (match) {
        info.currentCRM = match[1] || match[0]
        break
      }
    }
  }

  // =========================================================================
  // BUDGET DETECTION
  // =========================================================================

  if (!info.budget) {
    for (const pattern of BUDGET_PATTERNS) {
      const match = transcript.match(pattern)
      if (match) {
        info.budget = match[0]

        // Check if confirmed
        if (lower.includes('yes') || lower.includes('that works') || lower.includes('we can do')) {
          info.budgetConfirmed = true
        }
        break
      }
    }
  }

  // =========================================================================
  // TIMELINE DETECTION
  // =========================================================================

  if (!info.timeline) {
    for (const pattern of TIMELINE_PATTERNS) {
      const match = transcript.match(pattern)
      if (match) {
        info.timeline = match[0]

        // Determine urgency
        if (/asap|immediately|urgent|this\s*week/i.test(match[0])) {
          info.timelineUrgency = 'high'
        } else if (/next\s*month|Q[1-4]|this\s*quarter/i.test(match[0])) {
          info.timelineUrgency = 'medium'
        } else {
          info.timelineUrgency = 'low'
        }
        break
      }
    }
  }

  // =========================================================================
  // DECISION MAKERS
  // =========================================================================

  for (const pattern of DECISION_MAKER_PATTERNS) {
    const matches = transcript.matchAll(pattern)
    for (const match of matches) {
      const dm = match[1] || match[0]
      const trimmed = dm.trim()
      if (trimmed.length > 2 && !info.decisionMakers.includes(trimmed) && info.decisionMakers.length < 5) {
        info.decisionMakers.push(trimmed)
      }
    }
  }

  // =========================================================================
  // BUYING SIGNALS
  // =========================================================================

  for (const pattern of BUYING_SIGNAL_PATTERNS) {
    const matches = transcript.matchAll(pattern)
    for (const match of matches) {
      const signal = match[0].trim()
      if (!info.buyingSignals.includes(signal) && info.buyingSignals.length < 10) {
        info.buyingSignals.push(signal)
      }
    }
  }

  // =========================================================================
  // OBJECTIONS
  // =========================================================================

  for (const { category, pattern } of OBJECTION_PATTERNS) {
    if (pattern.test(transcript)) {
      if (!info.objections.includes(category)) {
        info.objections.push(category)
      }
    }
  }

  // =========================================================================
  // COMMITMENT SCORE (1-10 scale)
  // =========================================================================

  const commitmentMatch = transcript.match(/(?:i'?m\s*(?:at\s*)?(?:a\s*)?|i'?d\s*say\s*(?:a\s*)?|probably\s*(?:a\s*)?|around\s*(?:a\s*)?)(\d+)/i)
  if (commitmentMatch && !info.commitmentScore) {
    const score = parseInt(commitmentMatch[1])
    if (score >= 1 && score <= 10) {
      info.commitmentScore = score
      info.readyToClose = score >= 8
    }
  }

  return info
}

function determineSeverity(transcript: string, problemMatch: string): 'low' | 'medium' | 'high' {
  const lower = transcript.toLowerCase()

  // High severity indicators
  if (/critical|urgent|desperate|killing\s*us|major\s*problem|losing\s*(?:deals|money|customers)/i.test(lower)) {
    return 'high'
  }

  // Medium severity indicators
  if (/frustrat|annoying|taking\s*too\s*long|wasting\s*time|need\s*to\s*fix/i.test(lower)) {
    return 'medium'
  }

  return 'low'
}

// =============================================================================
// QUESTION TRACKING
// =============================================================================

const SCRIPT_QUESTIONS: Record<string, RegExp[]> = {
  set_expectations: [
    /thanks\s*for\s*(?:taking|making)\s*(?:the\s*)?time/i,
    /(?:before\s*we\s*(?:get\s*started|begin|dive\s*in)|is\s*there\s*anything)\s*(?:you'?d?\s*like\s*to\s*know)?/i,
  ],
  isolate_problem: [
    /what\s*(?:made|prompted|brought)\s*you\s*(?:to\s*)?(?:book|take|schedule)/i,
    /what'?s\s*going\s*on\s*(?:in|with)\s*(?:your\s*)?(?:sales|operations)/i,
    /what\s*(?:specific\s*)?(?:challenge|problem|issue)/i,
  ],
  background_questions: [
    /tell\s*me\s*(?:a\s*bit\s*)?about\s*(?:your\s*)?company/i,
    /how\s*big\s*is\s*(?:your\s*)?(?:sales\s*)?team/i,
    /what'?s\s*(?:your\s*)?(?:typical|average)\s*(?:deal\s*size|sales\s*cycle)/i,
  ],
  current_situation: [
    /walk\s*me\s*through/i,
    /how\s*are\s*you\s*(?:currently|right\s*now)/i,
    /what\s*(?:does\s*)?your\s*(?:process|reporting)/i,
  ],
  assess_efforts: [
    /what\s*have\s*you\s*tried/i,
    /have\s*you\s*worked\s*with\s*(?:consultants|agencies)/i,
    /what'?s\s*worked/i,
  ],
  chunking_down: [
    /let'?s\s*dig\s*(?:in|into)/i,
    /how\s*often\s*does/i,
    /(?:can\s*you\s*)?give\s*me\s*(?:a\s*)?specific\s*example/i,
  ],
  financial_qualifier: [
    /what\s*(?:do\s*you\s*think\s*)?(?:is\s*this|this\s*(?:is\s*)?)?\s*costing/i,
    /put\s*a\s*number\s*on\s*it/i,
    /what\s*(?:kind\s*of\s*)?budget/i,
  ],
  doubt_questions: [
    /what\s*happens\s*if\s*you\s*don'?t/i,
    /what'?s\s*the\s*risk/i,
    /(?:anything\s*that\s*)?makes?\s*you\s*doubt/i,
  ],
  solution_questions: [
    /(?:in\s*an?\s*)?ideal\s*world/i,
    /what\s*would\s*(?:need\s*to\s*be\s*true|success\s*look\s*like)/i,
    /how\s*would\s*(?:your\s*)?(?:day|life|work)\s*change/i,
  ],
  why_now: [
    /why\s*(?:is\s*)?now\s*(?:the\s*right\s*time)?/i,
    /what'?s\s*changed/i,
    /cost\s*of\s*waiting/i,
  ],
  support_questions: [
    /who\s*(?:else\s*)?(?:would\s*be|is)\s*involved/i,
    /(?:what\s*(?:does\s*)?)?(?:your\s*)?decision(?:-|\s*)making\s*process/i,
    /who\s*(?:would\s*)?need\s*to\s*sign\s*off/i,
  ],
  desired_situation: [
    /(?:let\s*me\s*)?paint\s*(?:a\s*)?picture/i,
    /imagine\s*(?:\d+\s*)?days?\s*from\s*now/i,
    /how\s*would\s*(?:your\s*)?role\s*change/i,
  ],
  transition: [
    /based\s*on\s*(?:everything\s*)?(?:you'?ve\s*)?shared/i,
    /would\s*you\s*(?:like\s*(?:me\s*)?to|want\s*me\s*to)\s*walk\s*you\s*through/i,
  ],
  pitch: [
    /here'?s\s*how\s*we'?d?\s*approach/i,
    /(?:5|five)(?:-|\s*)step/i,
    /step\s*(?:one|two|three|four|five|\d)/i,
  ],
  commitment: [
    /(?:on\s*)?(?:a\s*)?scale\s*(?:of\s*)?1(?:\s*(?:to|-)\s*)?10/i,
    /where\s*(?:are\s*)?you\s*(?:right\s*)?now/i,
    /what\s*would\s*(?:it\s*)?take\s*(?:to\s*get\s*(?:you\s*)?to)/i,
  ],
  onboarding: [
    /what\s*(?:onboarding|working\s*together)\s*looks?\s*like/i,
    /week\s*(?:one|two|three|\d)/i,
  ],
  investment: [
    /(?:the\s*)?investment\s*(?:for|is)/i,
    /(?:this\s*)?includes/i,
    /how\s*does\s*that\s*land/i,
  ],
}

export function detectQuestionsAsked(transcript: string, sectionId: string): string[] {
  const patterns = SCRIPT_QUESTIONS[sectionId] || []
  const asked: string[] = []

  for (const pattern of patterns) {
    if (pattern.test(transcript)) {
      asked.push(pattern.source.replace(/\\/g, '').substring(0, 40))
    }
  }

  return asked
}

// =============================================================================
// SECTION COVERAGE TRACKING
// =============================================================================

export function updateSectionCoverage(
  state: SessionState,
  newSectionId: string,
  transcript: string
): void {
  const now = Date.now()

  // Update time spent in previous section
  if (state.currentScriptSection && state.sectionCoverage[state.currentScriptSection]) {
    const prevCoverage = state.sectionCoverage[state.currentScriptSection]
    if (prevCoverage.enteredAt) {
      prevCoverage.timeSpentSeconds += Math.round((now - prevCoverage.enteredAt) / 1000)
    }
  }

  // Update current section coverage
  const coverage = state.sectionCoverage[newSectionId]
  if (coverage) {
    if (!coverage.entered) {
      coverage.entered = true
      coverage.enteredAt = now
    }

    // Detect questions asked
    const questionsAsked = detectQuestionsAsked(transcript, newSectionId)
    for (const q of questionsAsked) {
      if (!coverage.questionsAsked.includes(q)) {
        coverage.questionsAsked.push(q)
      }
    }

    // Check if section should be marked complete
    const section = REVPILOT_SCRIPT.sections.find(s => s.id === newSectionId)
    if (section) {
      // Section is complete if transition signals are detected
      for (const signal of section.transitionSignals) {
        if (transcript.toLowerCase().includes(signal.toLowerCase())) {
          coverage.keyElementsCovered.push(signal)
        }
      }
    }
  }

  // Update section history
  if (state.currentScriptSection !== newSectionId) {
    if (!state.sectionHistory.includes(newSectionId)) {
      state.sectionHistory.push(newSectionId)
    }
    state.currentScriptSection = newSectionId
  }
}

// =============================================================================
// CONVERSATION SUMMARIZATION
// =============================================================================

export async function generateConversationSummary(
  transcript: string,
  keyInfo: ExtractedKeyInfo
): Promise<ConversationSummary> {
  // Generate a summary of the conversation so far
  const summary: ConversationSummary = {
    overview: '',
    keyMoments: [],
    missedOpportunities: [],
    lastUpdated: Date.now(),
  }

  // Build overview from key info
  const parts: string[] = []

  if (keyInfo.anchorProblem.identified) {
    parts.push(`Problem identified: ${keyInfo.anchorProblem.category} - "${keyInfo.anchorProblem.problem?.substring(0, 100)}"`)
  } else {
    summary.missedOpportunities.push('No anchor problem identified yet')
  }

  if (keyInfo.teamSize) {
    parts.push(`Team size: ${keyInfo.teamSize}`)
  }

  if (keyInfo.budget) {
    parts.push(`Budget: ${keyInfo.budget}${keyInfo.budgetConfirmed ? ' (confirmed)' : ''}`)
  }

  if (keyInfo.timeline) {
    parts.push(`Timeline: ${keyInfo.timeline} (${keyInfo.timelineUrgency} urgency)`)
  }

  if (keyInfo.decisionMakers.length > 0) {
    parts.push(`Decision makers: ${keyInfo.decisionMakers.join(', ')}`)
  }

  if (keyInfo.buyingSignals.length > 0) {
    summary.keyMoments.push(`Buying signals detected: ${keyInfo.buyingSignals.length}`)
  }

  if (keyInfo.objections.length > 0) {
    summary.keyMoments.push(`Objections raised: ${keyInfo.objections.join(', ')}`)
  }

  if (keyInfo.commitmentScore !== null) {
    summary.keyMoments.push(`Commitment score: ${keyInfo.commitmentScore}/10`)
  }

  summary.overview = parts.join('\n')

  return summary
}

// =============================================================================
// CLEANUP
// =============================================================================

// Periodically clean up old sessions from cache
setInterval(() => {
  const cutoff = Date.now() - 4 * 60 * 60 * 1000  // 4 hours
  for (const [sessionId, state] of stateCache.entries()) {
    if (state.startTime < cutoff) {
      stateCache.delete(sessionId)
    }
  }
}, 30 * 60 * 1000)  // Run every 30 minutes
