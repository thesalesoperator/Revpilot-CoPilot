/**
 * UNIFIED CO-PILOT MODULE
 *
 * This module exports all unified co-pilot functionality for use across
 * the application. It provides a single entry point for:
 *
 * - Types: Session, KeyInfo, Suggestion, Analysis types
 * - Intelligence: AI analysis, suggestion generation, key info extraction
 * - Adapter: Backward compatibility with legacy coaching endpoints
 */

// Types
export * from './types'

// Intelligence functions
export {
  detectStage,
  detectObjections,
  detectBuyingSignals,
  extractKeyInfo,
  detectCurrentSection,
  getScriptGuidance,
  calculateProgress,
  generateSuggestion,
  analyzeCall,
  OBJECTION_PATTERNS,
  BUYING_SIGNALS,
  REVPILOT_SCRIPT,
  type ObjectionPattern,
  type BuyingSignal,
} from './intelligence'

// Adapter functions
export {
  ENABLE_UNIFIED_COPILOT,
  getOrCreateUnifiedSession,
  syncLegacySession,
  syncLegacySuggestion,
  adaptAnalyzeRequest,
  adaptAnalyzeResponse,
  shouldUseUnifiedEndpoint,
  getUnifiedEndpointUrl,
  clearSessionMappings,
  removeSessionMapping,
  type LegacyCoachingSession,
  type UnifiedSessionMapping,
  type LegacySuggestion,
  type LegacyAnalyzeRequest,
  type UnifiedAnalyzeRequest,
  type UnifiedAnalyzeResponse,
  type LegacyAnalyzeResponse,
} from './adapter'
