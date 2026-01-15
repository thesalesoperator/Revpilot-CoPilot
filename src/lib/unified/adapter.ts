/**
 * UNIFIED CO-PILOT ADAPTER
 *
 * This module provides backward compatibility for legacy coaching endpoints
 * by routing requests to the new unified co-pilot system when enabled.
 *
 * Feature flag: ENABLE_UNIFIED_COPILOT
 * - When true: Routes through unified co-pilot endpoints
 * - When false: Uses original coaching/practice logic
 */

import { createClient } from '@supabase/supabase-js'

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Feature flag - can be set via environment variable
export const ENABLE_UNIFIED_COPILOT = process.env.ENABLE_UNIFIED_COPILOT === 'true'

// ============================================================
// TYPES
// ============================================================

export interface LegacyCoachingSession {
  id: string
  user_id: string
  meeting_url: string
  meeting_id?: string
  bot_id?: string
  status: string
  transcript?: string
  analysis?: unknown
  overall_score?: number
  duration_seconds?: number
  ended_at?: string
  created_at: string
  updated_at: string
}

export interface UnifiedSessionMapping {
  legacySessionId: string
  unifiedSessionId: string
  context: 'live_coaching' | 'practice' | 'real_call_analysis'
  createdAt: Date
}

// ============================================================
// SESSION MAPPING WITH TTL
// ============================================================

/**
 * TTL Map implementation to prevent unbounded memory growth.
 * Session mappings are cached for quick lookups but expire after TTL.
 */
class TTLMap<K, V> {
  private cache = new Map<K, { value: V; expiresAt: number }>()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor(private ttlMs: number = 600000) { // 10 minutes default
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 300000)
  }

  set(key: K, value: V): void {
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs })
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return undefined
    }

    return entry.value
  }

  has(key: K): boolean {
    return this.get(key) !== undefined
  }

  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }
}

// In-memory cache for session mappings with 10-minute TTL
const sessionMappings = new TTLMap<string, string>(600000)

/**
 * Get or create a unified session from a legacy coaching session
 */
export async function getOrCreateUnifiedSession(
  legacySessionId: string,
  userId: string,
  context: 'live_coaching' | 'practice' | 'real_call_analysis' = 'live_coaching',
  options: {
    meetingUrl?: string
    challengeId?: string
    personaId?: string
  } = {}
): Promise<string> {
  // Check cache first
  if (sessionMappings.has(legacySessionId)) {
    return sessionMappings.get(legacySessionId)!
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Check if mapping exists in database
  const { data: existingMapping } = await supabase
    .from('co_pilot_sessions')
    .select('id')
    .eq('id', legacySessionId) // Try direct ID first (if already unified)
    .single()

  if (existingMapping) {
    sessionMappings.set(legacySessionId, existingMapping.id)
    return existingMapping.id
  }

  // Create new unified session
  const { data: newSession, error } = await supabase
    .from('co_pilot_sessions')
    .insert({
      user_id: userId,
      context,
      capture_method: context === 'practice' ? 'vapi' : 'tab_audio',
      meeting_url: options.meetingUrl || null,
      challenge_id: options.challengeId || null,
      persona_id: options.personaId || null,
      status: 'active',
      transcript: '',
      key_info: {
        anchorProblem: { identified: false },
        painPoints: [],
        decisionMakers: [],
        buyingSignals: [],
        objections: [],
        competitorsMentioned: [],
      },
      script_progress: 0,
      sections_covered: [],
      objectives_completed: [],
      bonus_objectives_completed: [],
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !newSession) {
    console.error('[Adapter] Failed to create unified session:', error)
    throw new Error('Failed to create unified session')
  }

  sessionMappings.set(legacySessionId, newSession.id)
  return newSession.id
}

/**
 * Sync a legacy coaching session to the unified format
 */
export async function syncLegacySession(
  legacySession: LegacyCoachingSession
): Promise<void> {
  if (!ENABLE_UNIFIED_COPILOT) return

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Get or create unified session
  const unifiedSessionId = await getOrCreateUnifiedSession(
    legacySession.id,
    legacySession.user_id,
    'live_coaching',
    { meetingUrl: legacySession.meeting_url }
  )

  // Sync transcript and status
  await supabase
    .from('co_pilot_sessions')
    .update({
      transcript: legacySession.transcript || '',
      status: mapLegacyStatus(legacySession.status),
      analysis: legacySession.analysis,
      overall_score: legacySession.overall_score,
      duration_seconds: legacySession.duration_seconds || 0,
      ended_at: legacySession.ended_at,
      updated_at: new Date().toISOString(),
    })
    .eq('id', unifiedSessionId)
}

/**
 * Map legacy coaching status to unified status
 */
function mapLegacyStatus(legacyStatus: string): string {
  const statusMap: Record<string, string> = {
    'starting': 'starting',
    'bot_joining': 'starting',
    'active': 'active',
    'ended': 'completed',
    'error': 'failed',
  }
  return statusMap[legacyStatus] || 'active'
}

// ============================================================
// SUGGESTION ADAPTER
// ============================================================

/**
 * Convert legacy coaching suggestion to unified format
 */
export interface LegacySuggestion {
  id: string
  session_id: string
  type: string
  content: string
  created_at: string
}

export async function syncLegacySuggestion(
  legacySuggestion: LegacySuggestion,
  context: 'live_coaching' | 'practice' | 'real_call_analysis' = 'live_coaching'
): Promise<void> {
  if (!ENABLE_UNIFIED_COPILOT) return

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Check if suggestion already exists
  const { data: existing } = await supabase
    .from('co_pilot_suggestions')
    .select('id')
    .eq('id', legacySuggestion.id)
    .single()

  if (existing) return

  // Get unified session ID
  let unifiedSessionId = sessionMappings.get(legacySuggestion.session_id)

  if (!unifiedSessionId) {
    // Try to find by direct match
    const { data: session } = await supabase
      .from('co_pilot_sessions')
      .select('id')
      .eq('id', legacySuggestion.session_id)
      .single()

    if (session) {
      unifiedSessionId = session.id
    } else {
      console.log('[Adapter] Session not found for suggestion:', legacySuggestion.session_id)
      return
    }
  }

  // Insert unified suggestion
  await supabase
    .from('co_pilot_suggestions')
    .insert({
      id: legacySuggestion.id, // Keep same ID for consistency
      session_id: unifiedSessionId,
      context,
      type: legacySuggestion.type,
      content: legacySuggestion.content,
      priority: 'medium', // Default priority for legacy
      metadata: { source: 'legacy_sync' },
      created_at: legacySuggestion.created_at,
    })
}

// ============================================================
// ANALYSIS ADAPTER
// ============================================================

/**
 * Adapt legacy analysis request to unified format
 */
export interface LegacyAnalyzeRequest {
  sessionId: string
  transcripts: Array<{ text: string; speaker?: number }>
  methodology?: string
}

export interface UnifiedAnalyzeRequest {
  sessionId: string
  transcripts: Array<{ text: string; speaker?: number | null; confidence?: number }>
  context: 'live_coaching' | 'practice' | 'real_call_analysis'
}

export function adaptAnalyzeRequest(
  legacyRequest: LegacyAnalyzeRequest,
  context: 'live_coaching' | 'practice' | 'real_call_analysis' = 'live_coaching'
): UnifiedAnalyzeRequest {
  return {
    sessionId: legacyRequest.sessionId,
    transcripts: legacyRequest.transcripts.map(t => ({
      text: t.text,
      speaker: t.speaker ?? null,
    })),
    context,
  }
}

// ============================================================
// RESPONSE ADAPTER
// ============================================================

/**
 * Convert unified analysis response back to legacy format
 */
export interface UnifiedAnalyzeResponse {
  status: string
  stage: string
  section: string
  sectionOrder: number
  scriptProgress: number
  keyInfo: unknown
  suggestion: unknown
  sectionsCovered: string[]
}

export interface LegacyAnalyzeResponse {
  status: string
  stage: string
  currentSection: string
  scriptProgress: number
  keyInfo: unknown
  suggestion: unknown
}

export function adaptAnalyzeResponse(
  unifiedResponse: UnifiedAnalyzeResponse
): LegacyAnalyzeResponse {
  return {
    status: unifiedResponse.status,
    stage: unifiedResponse.stage,
    currentSection: unifiedResponse.section,
    scriptProgress: unifiedResponse.scriptProgress,
    keyInfo: unifiedResponse.keyInfo,
    suggestion: unifiedResponse.suggestion,
  }
}

// ============================================================
// MIDDLEWARE HELPERS
// ============================================================

/**
 * Check if request should be routed to unified endpoint
 */
export function shouldUseUnifiedEndpoint(): boolean {
  return ENABLE_UNIFIED_COPILOT
}

/**
 * Get the unified endpoint URL for a legacy endpoint
 */
export function getUnifiedEndpointUrl(
  legacyEndpoint: string,
  sessionId?: string
): string {
  const endpointMap: Record<string, string> = {
    '/api/coaching/start': '/api/co-pilot/session/start',
    '/api/coaching/analyze-transcript': sessionId
      ? `/api/co-pilot/session/${sessionId}/analyze`
      : '/api/co-pilot/session/analyze',
    '/api/coaching/stop': sessionId
      ? `/api/co-pilot/session/${sessionId}/end`
      : '/api/co-pilot/session/end',
    '/api/practice/start': '/api/co-pilot/session/start',
    '/api/practice/end': sessionId
      ? `/api/co-pilot/session/${sessionId}/end`
      : '/api/co-pilot/session/end',
  }

  return endpointMap[legacyEndpoint] || legacyEndpoint
}

// ============================================================
// CLEANUP
// ============================================================

/**
 * Clear session mapping cache
 */
export function clearSessionMappings(): void {
  sessionMappings.clear()
}

/**
 * Remove specific session from mapping cache
 */
export function removeSessionMapping(legacySessionId: string): void {
  sessionMappings.delete(legacySessionId)
}
