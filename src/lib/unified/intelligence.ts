/**
 * UNIFIED INTELLIGENCE MODULE
 *
 * Shared AI analysis logic for both coaching and practice contexts.
 * Consolidates: stage detection, objection detection, key info extraction,
 * suggestion generation, and script tracking.
 *
 * This module serves as the single source of truth for AI-powered analysis
 * across all co-pilot contexts (live_coaching, practice, real_call_analysis).
 */

import type {
  SessionContext,
  KeyInfo,
  UnifiedSuggestion,
  CallAnalysis,
  ConversationStage,
  XPBreakdown,
} from './types'

// Use centralized OpenAI client
import { getOpenAI, OPENAI_MODELS, TOKEN_LIMITS } from '@/lib/openai'

// Import existing logic from coaching module
import {
  detectConversationStage as legacyDetectStage,
  detectObjections as legacyDetectObjections,
  detectBuyingSignals as legacyDetectBuyingSignals,
  OBJECTION_PATTERNS,
  BUYING_SIGNALS,
  type ObjectionPattern,
  type BuyingSignal,
} from '@/lib/coaching/intelligence'

import {
  extractKeyInfo as legacyExtractKeyInfo,
  type ExtractedKeyInfo,
} from '@/lib/coaching/session-state'

import {
  detectScriptSection as legacyDetectScriptSection,
  getScriptCoaching,
  REVPILOT_SCRIPT,
} from '@/lib/coaching/revpilot-script'

// ============================================================
// CONSTANTS
// ============================================================

// Script sections for progress calculation
const SCRIPT_SECTIONS = [
  'set_expectations', 'isolate_problem', 'background_questions',
  'current_situation', 'assess_efforts', 'chunking_down',
  'financial_qualifier', 'doubt_questions', 'solution_questions',
  'why_now', 'support_questions', 'desired_situation',
  'transition', 'pitch', 'commitment', 'onboarding', 'investment'
]

// ============================================================
// CONVERSATION STAGE DETECTION
// ============================================================

/**
 * Detect the current stage of the sales conversation
 */
export function detectStage(transcript: string): ConversationStage {
  return legacyDetectStage(transcript)
}

// ============================================================
// OBJECTION & BUYING SIGNAL DETECTION
// ============================================================

/**
 * Detect objections in the transcript
 */
export function detectObjections(transcript: string): ObjectionPattern[] {
  return legacyDetectObjections(transcript)
}

/**
 * Detect buying signals in the transcript
 */
export function detectBuyingSignals(transcript: string): BuyingSignal[] {
  return legacyDetectBuyingSignals(transcript)
}

// ============================================================
// KEY INFORMATION EXTRACTION
// ============================================================

/**
 * Extract key information from the transcript
 * Converts between legacy ExtractedKeyInfo and unified KeyInfo types
 */
export function extractKeyInfo(
  transcript: string,
  existingInfo: Partial<KeyInfo> = {}
): KeyInfo {
  // Convert unified KeyInfo to legacy ExtractedKeyInfo format
  const legacyExisting: ExtractedKeyInfo = {
    companyName: existingInfo.companyName || null,
    industry: existingInfo.industry || null,
    teamSize: existingInfo.teamSize || null,
    dealSize: existingInfo.dealSize || null,
    salesCycle: existingInfo.salesCycle || null,
    currentCRM: existingInfo.currentCRM || null,
    anchorProblem: existingInfo.anchorProblem
      ? {
          identified: existingInfo.anchorProblem.identified,
          problem: existingInfo.anchorProblem.problem ?? null,
          category: existingInfo.anchorProblem.category ?? null,
          severity: existingInfo.anchorProblem.severity ?? null,
          quotes: existingInfo.anchorProblem.quotes ?? [],
        }
      : {
          identified: false,
          problem: null,
          category: null,
          severity: null,
          quotes: [],
        },
    painPoints: existingInfo.painPoints || [],
    painSeverity: existingInfo.painSeverity || null,
    budget: existingInfo.budget || null,
    budgetConfirmed: existingInfo.budgetConfirmed || false,
    timeline: existingInfo.timeline || null,
    timelineUrgency: existingInfo.timelineUrgency || null,
    decisionMakers: existingInfo.decisionMakers || [],
    decisionProcess: existingInfo.decisionProcess || null,
    buyingSignals: existingInfo.buyingSignals || [],
    objections: existingInfo.objections || [],
    competitorsMentioned: existingInfo.competitorsMentioned || [],
    commitmentScore: existingInfo.commitmentScore || null,
    readyToClose: existingInfo.readyToClose || false,
  }

  // Use legacy extraction
  const extracted = legacyExtractKeyInfo(transcript, legacyExisting)

  // Convert back to unified KeyInfo format
  return {
    anchorProblem: {
      identified: extracted.anchorProblem.identified,
      category: extracted.anchorProblem.category ?? undefined,
      problem: extracted.anchorProblem.problem ?? undefined,
      quotes: extracted.anchorProblem.quotes,
      severity: extracted.anchorProblem.severity ?? undefined,
    },
    painPoints: extracted.painPoints,
    painSeverity: extracted.painSeverity || undefined,
    budget: extracted.budget || undefined,
    budgetConfirmed: extracted.budgetConfirmed,
    timeline: extracted.timeline || undefined,
    timelineUrgency: extracted.timelineUrgency || undefined,
    decisionMakers: extracted.decisionMakers,
    decisionProcess: extracted.decisionProcess || undefined,
    buyingSignals: extracted.buyingSignals,
    objections: extracted.objections,
    competitorsMentioned: extracted.competitorsMentioned,
    companyName: extracted.companyName || undefined,
    industry: extracted.industry || undefined,
    teamSize: extracted.teamSize || undefined,
    dealSize: extracted.dealSize || undefined,
    salesCycle: extracted.salesCycle || undefined,
    currentCRM: extracted.currentCRM || undefined,
    commitmentScore: extracted.commitmentScore || undefined,
    readyToClose: extracted.readyToClose,
  }
}

// ============================================================
// SCRIPT SECTION DETECTION
// ============================================================

/**
 * Detect the current script section based on transcript content
 */
export function detectCurrentSection(
  transcript: string,
  previousSection: string = 'set_expectations'
): { section: string; sectionOrder: number; confidence: number } {
  const detection = legacyDetectScriptSection(transcript, previousSection)

  // Find section order
  const sectionIndex = SCRIPT_SECTIONS.indexOf(detection.section)
  const sectionOrder = sectionIndex >= 0 ? sectionIndex + 1 : 1

  return {
    section: detection.section,
    sectionOrder,
    confidence: detection.confidence,
  }
}

/**
 * Get script-specific coaching guidance for a section
 */
export function getScriptGuidance(
  sectionId: string,
  transcript: string,
  keyInfo: Partial<KeyInfo>
): {
  currentSection: { id: string; name: string; order: number; objective: string }
  suggestedQuestions: string[]
  coachingTip: string
  warningMessage?: string
  progressPercentage: number
} {
  const coaching = getScriptCoaching(sectionId, transcript, {
    painPoints: keyInfo.painPoints || [],
    budget: keyInfo.budget || null,
    timeline: keyInfo.timeline || null,
    decisionMakers: keyInfo.decisionMakers || [],
  })

  return {
    currentSection: coaching.currentSection,
    suggestedQuestions: coaching.suggestedQuestions,
    coachingTip: coaching.coachingTip,
    warningMessage: coaching.warningMessage,
    progressPercentage: coaching.progressPercentage,
  }
}

/**
 * Calculate script progress percentage
 */
export function calculateProgress(section: string): number {
  const index = SCRIPT_SECTIONS.indexOf(section)
  return index >= 0 ? Math.round(((index + 1) / SCRIPT_SECTIONS.length) * 100) : 0
}

// ============================================================
// UNIFIED SUGGESTION GENERATION
// ============================================================

/**
 * Generate a coaching suggestion based on context
 */
export async function generateSuggestion(
  context: SessionContext,
  transcript: string,
  keyInfo: KeyInfo,
  previousSuggestions: string[] = [],
  options: {
    scriptSection?: string
    sectionOrder?: number
    personaId?: string
    objectives?: string[]
    detectedObjections?: ObjectionPattern[]
    detectedBuyingSignals?: BuyingSignal[]
  } = {}
): Promise<Partial<UnifiedSuggestion> | null> {
  let openai
  try {
    openai = getOpenAI()
  } catch {
    console.log('[Intelligence] No OpenAI API key configured')
    return null
  }

  const recentTranscript = transcript.slice(-3000)
  const systemPrompt = buildSuggestionPrompt(context, keyInfo, options)

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODELS.FAST, // Use mini for real-time efficiency
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `
Recent conversation:
${recentTranscript}

Previous suggestions (avoid repeating):
${previousSuggestions.slice(-5).join('\n')}

${options.detectedObjections?.length ? `\nOBJECTION DETECTED: ${options.detectedObjections[0].category}` : ''}
${options.detectedBuyingSignals?.length ? `\nBUYING SIGNAL: ${options.detectedBuyingSignals[0].signal}` : ''}

Generate ONE coaching suggestion or return null if none needed.
          `
        }
      ],
      max_tokens: TOKEN_LIMITS.SUGGESTION,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content || '{}'
    const result = JSON.parse(content)

    if (!result.content || result.content === 'null' || result.content === '') {
      return null
    }

    return {
      type: result.type || 'tip',
      content: result.content,
      priority: result.priority || 'medium',
      metadata: {
        stage: detectStage(transcript),
        scriptSection: options.scriptSection,
        confidence: result.confidence,
        reasoning: result.reasoning,
      },
    }
  } catch (error) {
    console.error('[Intelligence] Suggestion generation error:', error)
    return null
  }
}

/**
 * Build context-aware suggestion prompt
 */
function buildSuggestionPrompt(
  context: SessionContext,
  keyInfo: KeyInfo,
  options: {
    scriptSection?: string
    sectionOrder?: number
    personaId?: string
    objectives?: string[]
  }
): string {
  const basePrompt = `You are an expert sales coach providing real-time guidance.

KEY INFO DISCOVERED:
- Pain Points: ${keyInfo.painPoints.join(', ') || 'None identified yet'}
- Budget: ${keyInfo.budget || 'Not discussed'}
- Timeline: ${keyInfo.timeline || 'Not discussed'}
- Decision Makers: ${keyInfo.decisionMakers.join(', ') || 'Unknown'}
- Anchor Problem: ${keyInfo.anchorProblem?.identified ? keyInfo.anchorProblem.problem : 'Not identified yet'}

RULES:
- Be specific, reference what was just said
- Only suggest if there's a clear opportunity
- Return JSON: { "type": "question|tip|objection|positive|alert|transition", "content": "...", "priority": "high|medium|low", "reasoning": "...", "confidence": 0.0-1.0 }
- Return { "content": null } if no suggestion needed
`

  if (context === 'live_coaching') {
    const sectionWarning = options.sectionOrder && options.sectionOrder <= 6
      ? `\n\nRESTRICTION: Current section is ${options.sectionOrder}/17. NEVER suggest presenting solutions, pitching, or discussing pricing in early sections.`
      : ''

    return basePrompt + `
CONTEXT: Live sales call coaching
SCRIPT SECTION: ${options.scriptSection || 'unknown'} (${options.sectionOrder || 0}/17)
${sectionWarning}

Focus on:
- Helping them follow the RevPilot script
- Extracting key qualification info
- Handling objections as they arise
- Using their words back to them
`
  }

  if (context === 'practice') {
    return basePrompt + `
CONTEXT: AI roleplay practice session
PERSONA: ${options.personaId || 'unknown'}
OBJECTIVES: ${options.objectives?.join(', ') || 'none set'}

Focus on:
- Helping them achieve their practice objectives
- Technique improvement tips
- What they could say next
- Encouraging good behaviors
`
  }

  if (context === 'real_call_analysis') {
    return basePrompt + `
CONTEXT: Post-call analysis
Provide insights about what went well and what could be improved.
`
  }

  return basePrompt
}

// ============================================================
// FULL CALL ANALYSIS (Post-call)
// ============================================================

/**
 * Generate comprehensive call analysis
 */
export async function analyzeCall(
  transcript: string,
  keyInfo: KeyInfo,
  context: SessionContext,
  options: {
    durationSeconds: number
    challengeId?: string
    objectives?: string[]
    objectivesCompleted?: string[]
  } = { durationSeconds: 0 }
): Promise<{
  analysis: CallAnalysis
  overallScore: number
  xpEarned: number
  xpBreakdown: XPBreakdown
}> {
  let openai
  try {
    openai = getOpenAI()
  } catch {
    // Return basic analysis without AI
    const basicScore = calculateBasicScore(keyInfo, options.durationSeconds)
    return {
      analysis: createBasicAnalysis(basicScore),
      overallScore: basicScore,
      xpEarned: Math.round(basicScore * 0.5),
      xpBreakdown: {
        base: Math.round(basicScore * 0.5),
        objectives: 0,
        bonus: 0,
        difficulty: 1,
        streak: 0,
        total: Math.round(basicScore * 0.5),
      },
    }
  }

  const prompt = `Analyze this sales call and score it comprehensively.

CONTEXT: ${context}
DURATION: ${options.durationSeconds} seconds (${Math.round(options.durationSeconds / 60)} minutes)
${options.objectivesCompleted?.length ? `OBJECTIVES COMPLETED: ${options.objectivesCompleted.join(', ')}` : ''}

TRANSCRIPT:
${transcript.slice(-8000)}${transcript.length > 8000 ? '\n[...earlier conversation truncated...]' : ''}

KEY INFO EXTRACTED:
${JSON.stringify(keyInfo, null, 2)}

Provide a comprehensive JSON analysis:
{
  "overallScore": 0-100,
  "scores": {
    "discovery": 0-100,
    "qualification": 0-100,
    "valueArticulation": 0-100,
    "objectionHandling": 0-100,
    "closing": 0-100,
    "rapport": 0-100
  },
  "strengths": ["specific strength 1", "specific strength 2"],
  "improvements": ["specific improvement 1", "specific improvement 2"],
  "keyMoments": ["key moment 1", "key moment 2"],
  "missedOpportunities": ["missed opportunity 1"],
  "suggestedNextSteps": ["next step 1", "next step 2"],
  "followUpQuestions": ["question 1", "question 2"],
  "objectivesCompleted": ["objective 1"],
  "bonusObjectivesCompleted": ["bonus 1"]
}

SCORING RULES:
- Very short calls (<30 seconds): Max score 15
- Short calls (<60 seconds): Max score 30
- Incomplete discovery (no pain points): Max score 50
- Missing qualification (no budget/timeline): Max score 70
- No clear next steps: Reduce score by 10

Be specific in strengths/improvements - reference actual things said.`

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODELS.STANDARD, // Use full GPT-4o for comprehensive analysis (quality matters)
      messages: [
        {
          role: 'system',
          content: 'You are an expert sales coach analyzing call recordings. Provide detailed, actionable feedback.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: TOKEN_LIMITS.ANALYSIS,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content || '{}'
    const result = JSON.parse(content)

    const overallScore = result.overallScore || 0

    const analysis: CallAnalysis = {
      overallScore,
      discovery: result.scores?.discovery || 0,
      qualification: result.scores?.qualification || 0,
      valueArticulation: result.scores?.valueArticulation || 0,
      objectionHandling: result.scores?.objectionHandling || 0,
      closing: result.scores?.closing || 0,
      rapport: result.scores?.rapport || 0,
      strengths: result.strengths || [],
      improvements: result.improvements || [],
      keyMoments: result.keyMoments || [],
      missedOpportunities: result.missedOpportunities || [],
      suggestedNextSteps: result.suggestedNextSteps || [],
      followUpQuestions: result.followUpQuestions || [],
    }

    const xpBreakdown = calculateXP(
      overallScore,
      options.durationSeconds,
      context,
      result.objectivesCompleted?.length || 0,
      result.bonusObjectivesCompleted?.length || 0
    )

    return {
      analysis,
      overallScore,
      xpEarned: xpBreakdown.total,
      xpBreakdown,
    }
  } catch (error) {
    console.error('[Intelligence] Analysis generation error:', error)

    const basicScore = calculateBasicScore(keyInfo, options.durationSeconds)
    return {
      analysis: createBasicAnalysis(basicScore),
      overallScore: basicScore,
      xpEarned: Math.round(basicScore * 0.5),
      xpBreakdown: {
        base: Math.round(basicScore * 0.5),
        objectives: 0,
        bonus: 0,
        difficulty: 1,
        streak: 0,
        total: Math.round(basicScore * 0.5),
      },
    }
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Calculate basic score without AI
 */
function calculateBasicScore(keyInfo: KeyInfo, duration: number): number {
  let score = 0

  // Duration-based base score
  if (duration > 300) score += 30
  else if (duration > 120) score += 20
  else if (duration > 60) score += 10
  else score += 5

  // Pain points discovered
  score += Math.min(keyInfo.painPoints.length * 10, 30)

  // Anchor problem identified
  if (keyInfo.anchorProblem?.identified) score += 15

  // Qualification info
  if (keyInfo.budget) score += 10
  if (keyInfo.timeline) score += 10
  if (keyInfo.decisionMakers.length > 0) score += 5

  return Math.min(score, 100)
}

/**
 * Create basic analysis structure
 */
function createBasicAnalysis(score: number): CallAnalysis {
  return {
    overallScore: score,
    discovery: score,
    qualification: score,
    valueArticulation: score,
    objectionHandling: score,
    closing: score,
    rapport: score,
    strengths: [],
    improvements: ['Detailed analysis unavailable'],
    keyMoments: [],
    missedOpportunities: [],
    suggestedNextSteps: [],
    followUpQuestions: [],
  }
}

/**
 * Calculate XP breakdown
 */
function calculateXP(
  overallScore: number,
  duration: number,
  context: SessionContext,
  objectivesCount: number,
  bonusCount: number
): XPBreakdown {
  // Base XP from score (0-50)
  const base = Math.round(overallScore * 0.5)

  // Objectives XP (25 each)
  const objectives = objectivesCount * 25

  // Bonus objectives (50 each)
  const bonus = bonusCount * 50

  // Duration bonus
  let durationBonus = 0
  if (duration > 300) durationBonus = 25
  else if (duration > 120) durationBonus = 10

  // Difficulty multiplier (for future use)
  const difficulty = 1

  // Calculate total
  let total = base + objectives + bonus + durationBonus

  // Practice gets slightly less XP than real calls
  if (context === 'practice') {
    total = Math.round(total * 0.8)
  }

  return {
    base,
    objectives,
    bonus,
    difficulty,
    streak: 0,
    total,
  }
}

// ============================================================
// EXPORTS
// ============================================================

export {
  OBJECTION_PATTERNS,
  BUYING_SIGNALS,
  REVPILOT_SCRIPT,
  type ObjectionPattern,
  type BuyingSignal,
}
