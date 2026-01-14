/**
 * UNIFIED INTELLIGENCE MODULE
 *
 * Shared AI analysis logic for both coaching and practice.
 * Consolidates: stage detection, objection detection, key info extraction,
 * suggestion generation, and script tracking.
 *
 * This module provides a unified interface that can be used by:
 * - Live Coaching (real sales calls)
 * - Practice (AI roleplay sessions)
 * - Real Call Analysis (post-call review)
 */

import OpenAI from 'openai'
import {
  KeyInfo,
  ConversationStage,
  UnifiedSuggestion,
  SessionContext,
  CallAnalysis,
  XPBreakdown,
} from './types'

// Import existing logic from coaching module
import {
  detectConversationStage as legacyDetectStage,
  detectObjections,
  detectBuyingSignals,
  OBJECTION_PATTERNS,
  BUYING_SIGNALS,
} from '@/lib/coaching/intelligence'
import { extractKeyInfo as legacyExtractKeyInfo } from '@/lib/coaching/session-state'
import {
  detectScriptSection,
  getScriptCoaching,
  getNextSection,
  REVPILOT_SCRIPT,
  validateSuggestion,
  type ScriptSection,
} from '@/lib/coaching/revpilot-script'

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ============================================================
// CONVERSATION STAGE DETECTION
// ============================================================

/**
 * Detects the current stage of the sales conversation.
 * Uses keyword matching and pattern recognition to identify
 * whether the call is in opening, discovery, qualification, etc.
 *
 * @param transcript - The full or recent transcript to analyze
 * @returns The detected conversation stage
 */
export function detectStage(transcript: string): ConversationStage {
  return legacyDetectStage(transcript)
}

/**
 * Detects the conversation stage with confidence score.
 * Provides more detailed analysis than simple stage detection.
 *
 * @param transcript - The transcript to analyze
 * @returns Stage with confidence and indicators
 */
export function detectStageWithConfidence(transcript: string): {
  stage: ConversationStage
  confidence: number
  indicators: string[]
} {
  const stage = legacyDetectStage(transcript)
  const objections = detectObjections(transcript)
  const buyingSignals = detectBuyingSignals(transcript)

  const indicators: string[] = []

  // Add detected objections as indicators
  if (objections.length > 0) {
    indicators.push(`Objections detected: ${objections.map(o => o.category).join(', ')}`)
  }

  // Add buying signals as indicators
  if (buyingSignals.length > 0) {
    indicators.push(`Buying signals: ${buyingSignals.map(s => s.signal).join(', ')}`)
  }

  // Calculate confidence based on transcript length and signal density
  const wordCount = transcript.split(/\s+/).length
  const signalDensity = (objections.length + buyingSignals.length) / Math.max(wordCount / 100, 1)
  const confidence = Math.min(0.5 + signalDensity * 0.1, 1.0)

  return { stage, confidence, indicators }
}

// ============================================================
// KEY INFORMATION EXTRACTION
// ============================================================

/**
 * Extracts key information from the transcript.
 * Accumulates information over the course of the call,
 * preserving existing info while adding new discoveries.
 *
 * @param transcript - The transcript to analyze
 * @param existingInfo - Previously extracted info to build upon
 * @returns Updated KeyInfo with newly discovered information
 */
export function extractKeyInfo(
  transcript: string,
  existingInfo: Partial<KeyInfo> = {}
): KeyInfo {
  // Initialize with defaults
  const defaultInfo: KeyInfo = {
    painPoints: [],
    decisionMakers: [],
    buyingSignals: [],
    objections: [],
    competitorsMentioned: [],
    ...existingInfo,
  }

  // Use legacy extraction and map to unified format
  const legacyInfo = legacyExtractKeyInfo(transcript, {
    companyName: defaultInfo.companyName ?? null,
    industry: defaultInfo.industry ?? null,
    teamSize: defaultInfo.teamSize ?? null,
    dealSize: defaultInfo.dealSize ?? null,
    salesCycle: defaultInfo.salesCycle ?? null,
    currentCRM: defaultInfo.currentCRM ?? null,
    anchorProblem: defaultInfo.anchorProblem ?? {
      identified: false,
      problem: null,
      category: null,
      severity: null,
      quotes: [],
    },
    painPoints: defaultInfo.painPoints,
    painSeverity: defaultInfo.painSeverity ?? null,
    budget: defaultInfo.budget ?? null,
    budgetConfirmed: defaultInfo.budgetConfirmed ?? false,
    timeline: defaultInfo.timeline ?? null,
    timelineUrgency: defaultInfo.timelineUrgency ?? null,
    decisionMakers: defaultInfo.decisionMakers,
    decisionProcess: defaultInfo.decisionProcess ?? null,
    buyingSignals: defaultInfo.buyingSignals,
    objections: defaultInfo.objections,
    competitorsMentioned: defaultInfo.competitorsMentioned,
    commitmentScore: defaultInfo.commitmentScore ?? null,
    readyToClose: defaultInfo.readyToClose ?? false,
  })

  // Map back to unified KeyInfo format
  return {
    anchorProblem: legacyInfo.anchorProblem ? {
      identified: legacyInfo.anchorProblem.identified,
      category: legacyInfo.anchorProblem.category ?? undefined,
      problem: legacyInfo.anchorProblem.problem ?? undefined,
      quotes: legacyInfo.anchorProblem.quotes,
      severity: legacyInfo.anchorProblem.severity ?? undefined,
    } : undefined,
    painPoints: legacyInfo.painPoints,
    painSeverity: legacyInfo.painSeverity ?? undefined,
    budget: legacyInfo.budget ?? undefined,
    budgetConfirmed: legacyInfo.budgetConfirmed,
    timeline: legacyInfo.timeline ?? undefined,
    timelineUrgency: legacyInfo.timelineUrgency ?? undefined,
    decisionMakers: legacyInfo.decisionMakers,
    decisionProcess: legacyInfo.decisionProcess ?? undefined,
    buyingSignals: legacyInfo.buyingSignals,
    objections: legacyInfo.objections,
    competitorsMentioned: legacyInfo.competitorsMentioned,
    companyName: legacyInfo.companyName ?? undefined,
    industry: legacyInfo.industry ?? undefined,
    teamSize: legacyInfo.teamSize ?? undefined,
    dealSize: legacyInfo.dealSize ?? undefined,
    salesCycle: legacyInfo.salesCycle ?? undefined,
    currentCRM: legacyInfo.currentCRM ?? undefined,
    commitmentScore: legacyInfo.commitmentScore ?? undefined,
    readyToClose: legacyInfo.readyToClose,
  }
}

// ============================================================
// SCRIPT SECTION DETECTION
// ============================================================

/**
 * Detects the current section of the RevPilot script.
 * Uses pattern matching against section-specific keywords
 * and applies progression logic to prevent jumping ahead.
 *
 * @param transcript - The transcript to analyze
 * @param previousSection - The previously detected section
 * @returns Current section ID with confidence score
 */
export function detectCurrentSection(
  transcript: string,
  previousSection: string = 'set_expectations'
): { section: string; confidence: number } {
  const detection = detectScriptSection(transcript, previousSection)
  return {
    section: detection.section,
    confidence: detection.confidence,
  }
}

/**
 * Gets comprehensive coaching guidance for the current script section.
 *
 * @param sectionId - The current section ID
 * @param transcript - The conversation transcript
 * @param keyInfo - Extracted key information
 * @returns Coaching guidance including questions, tips, and warnings
 */
export function getScriptGuidance(
  sectionId: string,
  transcript: string,
  keyInfo: KeyInfo
): {
  currentSection: ScriptSection
  suggestedQuestions: string[]
  coachingTip: string
  warningMessage?: string
  progressPercentage: number
  nextSection?: ScriptSection
} {
  const coaching = getScriptCoaching(sectionId, transcript, {
    painPoints: keyInfo.painPoints,
    budget: keyInfo.budget ?? null,
    timeline: keyInfo.timeline ?? null,
    decisionMakers: keyInfo.decisionMakers,
  })

  const nextSection = getNextSection(sectionId)

  return {
    ...coaching,
    nextSection,
  }
}

/**
 * Calculates overall script progress as a percentage.
 *
 * @param currentSection - The current section ID
 * @returns Progress percentage (0-100)
 */
export function calculateScriptProgress(currentSection: string): number {
  const sections = REVPILOT_SCRIPT.sections
  const index = sections.findIndex(s => s.id === currentSection)
  return index >= 0 ? Math.round((index / sections.length) * 100) : 0
}

// ============================================================
// UNIFIED SUGGESTION GENERATION
// ============================================================

/**
 * Generates a real-time coaching suggestion using GPT-4o-mini.
 * Provides context-aware tips, questions, and guidance based on
 * the current conversation state.
 *
 * @param context - The session context (live_coaching, practice, etc.)
 * @param transcript - The conversation transcript
 * @param keyInfo - Extracted key information
 * @param previousSuggestions - Previously given suggestions to avoid repetition
 * @param options - Additional options for suggestion generation
 * @returns A suggestion or null if no intervention needed
 */
export async function generateSuggestion(
  context: SessionContext,
  transcript: string,
  keyInfo: KeyInfo,
  previousSuggestions: string[] = [],
  options: {
    scriptSection?: string
    personaId?: string
    objectives?: string[]
  } = {}
): Promise<UnifiedSuggestion | null> {
  // Use only recent transcript to reduce token usage
  const recentTranscript = transcript.slice(-3000)

  // Build context-specific system prompt
  const systemPrompt = buildSuggestionPrompt(context, keyInfo, options)

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `
Recent conversation:
${recentTranscript}

Previous suggestions (avoid repeating):
${previousSuggestions.slice(-5).join('\n')}

Generate ONE coaching suggestion or return null if none needed.
Response must be valid JSON.
          `.trim()
        }
      ],
      max_tokens: 200,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) return null

    const result = JSON.parse(content)

    // Handle null/empty responses
    if (!result.content || result.content === 'null' || result.content === '') {
      return null
    }

    // Validate suggestion against current section constraints
    if (options.scriptSection) {
      const sectionOrder = REVPILOT_SCRIPT.sections.find(s => s.id === options.scriptSection)?.order
      if (sectionOrder) {
        const validation = validateSuggestion(
          { type: result.type || 'tip', content: result.content },
          sectionOrder
        )
        if (validation.blocked) {
          // Use the fallback suggestion instead
          return {
            id: crypto.randomUUID(),
            sessionId: '', // Set by caller
            context,
            type: validation.suggestion.type as UnifiedSuggestion['type'],
            content: validation.suggestion.content,
            priority: validation.suggestion.priority as 'high' | 'medium' | 'low',
            metadata: {
              stage: detectStage(transcript),
              scriptSection: options.scriptSection,
              confidence: 1.0,
              reasoning: validation.reason,
            },
            createdAt: new Date(),
          }
        }
      }
    }

    // Construct the unified suggestion
    return {
      id: crypto.randomUUID(),
      sessionId: '', // Set by caller
      context,
      type: result.type || 'tip',
      content: result.content,
      priority: result.priority || 'medium',
      metadata: {
        stage: detectStage(transcript),
        scriptSection: options.scriptSection,
        objective: result.objective,
        confidence: result.confidence,
        reasoning: result.reasoning,
      },
      createdAt: new Date(),
    }
  } catch (error) {
    console.error('[UnifiedIntelligence] Error generating suggestion:', error)
    return null
  }
}

/**
 * Builds a context-specific system prompt for suggestion generation.
 */
function buildSuggestionPrompt(
  context: SessionContext,
  keyInfo: KeyInfo,
  options: { scriptSection?: string; personaId?: string; objectives?: string[] }
): string {
  const basePrompt = `You are an expert sales coach providing real-time guidance.

KEY INFO DISCOVERED:
${JSON.stringify(keyInfo, null, 2)}

RULES:
- Be specific, reference what was just said
- Only suggest if there's a clear opportunity
- Return JSON: { "type": "question|tip|objection|positive|alert|transition", "content": "...", "priority": "high|medium|low", "reasoning": "..." }
- Return { "content": null } if no suggestion needed
- Keep suggestions brief (1-2 sentences max) and highly actionable
`

  if (context === 'live_coaching') {
    return basePrompt + `
CONTEXT: Live sales call coaching
SCRIPT SECTION: ${options.scriptSection || 'unknown'}

Focus on:
- Helping them follow the RevPilot script
- Extracting key qualification info
- Handling objections as they arise
- Using their specific pain points and information

STAGE-SPECIFIC CONSTRAINTS:
- If in sections 1-6 (discovery): NEVER suggest presenting solutions, pitching, or discussing pricing
- If in sections 7-11 (qualification): Focus on budget/timeline/authority questions
- Only suggest closing techniques in sections 14-17
`
  }

  if (context === 'practice') {
    return basePrompt + `
CONTEXT: AI roleplay practice session
PERSONA: ${options.personaId || 'unknown'}
OBJECTIVES: ${options.objectives?.join(', ') || 'none set'}

Focus on:
- Helping them achieve their objectives
- Technique improvement tips
- What they could say next
- Encouraging experimentation with different approaches
`
  }

  // Default for real_call_analysis
  return basePrompt + `
CONTEXT: Post-call analysis
Focus on identifying key moments and learning opportunities.
`
}

// ============================================================
// FULL CALL ANALYSIS (Post-call)
// ============================================================

/**
 * Performs comprehensive analysis of a completed call using GPT-4o.
 * Generates scores across multiple dimensions, identifies strengths
 * and improvements, and calculates XP earned.
 *
 * @param transcript - The full call transcript
 * @param keyInfo - Extracted key information
 * @param context - The session context
 * @param options - Analysis options including duration and objectives
 * @returns Analysis results with scores and XP
 */
export async function analyzeCall(
  transcript: string,
  keyInfo: KeyInfo,
  context: SessionContext,
  options: {
    challengeId?: string
    objectives?: string[]
    duration: number
  } = { duration: 0 }
): Promise<{
  overallScore: number
  analysis: CallAnalysis
  xpEarned: number
  xpBreakdown: XPBreakdown
}> {
  const prompt = `Analyze this sales call and provide a comprehensive evaluation.

CONTEXT: ${context}
DURATION: ${options.duration} seconds (${Math.round(options.duration / 60)} minutes)
${options.objectives ? `OBJECTIVES: ${options.objectives.join(', ')}` : ''}

TRANSCRIPT:
${transcript}

KEY INFO EXTRACTED:
${JSON.stringify(keyInfo, null, 2)}

Provide JSON response with this exact structure:
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
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "keyMoments": ["moment1", "moment2"],
  "missedOpportunities": ["opportunity1"],
  "suggestedNextSteps": ["step1", "step2"],
  "followUpQuestions": ["question1", "question2"],
  "objectivesCompleted": ["objective1"],
  "bonusObjectivesCompleted": ["bonus1"]
}

SCORING RULES:
- Very short calls (<30s): Max overall score 15
- Short calls (<60s): Max overall score 30
- Missing anchor problem: Max score 40
- Incomplete discovery: Max score 50
- Missing qualification (no budget/timeline): Max score 60
- Missing commitment: Max score 70
- Be constructive but honest in feedback
`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert sales coach evaluating call performance. Provide detailed, actionable feedback.',
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from analysis')
    }

    const result = JSON.parse(content)

    // Construct the analysis object
    const analysis: CallAnalysis = {
      overallScore: result.overallScore || 0,
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

    // Calculate XP
    const xpBreakdown = calculateXP(
      {
        overallScore: analysis.overallScore,
        objectivesCompleted: result.objectivesCompleted || [],
        bonusObjectivesCompleted: result.bonusObjectivesCompleted || [],
      },
      options.duration,
      context
    )

    return {
      overallScore: analysis.overallScore,
      analysis,
      xpEarned: xpBreakdown.total,
      xpBreakdown,
    }
  } catch (error) {
    console.error('[UnifiedIntelligence] Error analyzing call:', error)

    // Return minimal analysis on error
    const minimalAnalysis: CallAnalysis = {
      overallScore: 0,
      discovery: 0,
      qualification: 0,
      valueArticulation: 0,
      objectionHandling: 0,
      closing: 0,
      rapport: 0,
      strengths: [],
      improvements: ['Unable to complete analysis'],
      keyMoments: [],
      missedOpportunities: [],
      suggestedNextSteps: [],
      followUpQuestions: [],
    }

    return {
      overallScore: 0,
      analysis: minimalAnalysis,
      xpEarned: 0,
      xpBreakdown: { base: 0, objectives: 0, bonus: 0, difficulty: 0, streak: 0, total: 0 },
    }
  }
}

// ============================================================
// XP CALCULATION
// ============================================================

/**
 * Calculates XP earned from a session based on performance.
 *
 * @param analysis - Analysis results with scores and objectives
 * @param duration - Duration of the call in seconds
 * @param context - The session context
 * @returns Detailed XP breakdown
 */
export function calculateXP(
  analysis: {
    overallScore: number
    objectivesCompleted?: string[]
    bonusObjectivesCompleted?: string[]
  },
  duration: number,
  context: SessionContext
): XPBreakdown {
  // Base XP from overall score (0-50 points)
  const baseXP = Math.round(analysis.overallScore * 0.5)

  // Objectives XP (25 points each)
  const objectiveXP = (analysis.objectivesCompleted?.length || 0) * 25

  // Bonus objectives XP (50 points each)
  const bonusXP = (analysis.bonusObjectivesCompleted?.length || 0) * 50

  // Duration bonus
  let durationBonus = 0
  if (duration > 300) {
    durationBonus = 25 // 5+ minutes
  } else if (duration > 120) {
    durationBonus = 10 // 2-5 minutes
  }

  // Difficulty multiplier (default 1.0)
  const difficultyMultiplier = 1.0

  // Streak bonus (would be calculated based on user's streak, default 0)
  const streakBonus = 0

  let total = baseXP + objectiveXP + bonusXP + durationBonus + streakBonus
  total = Math.round(total * difficultyMultiplier)

  // Practice sessions get slightly less XP than real calls
  // to encourage real call participation
  if (context === 'practice') {
    total = Math.round(total * 0.8)
  }

  return {
    base: baseXP,
    objectives: objectiveXP,
    bonus: bonusXP,
    difficulty: Math.round(durationBonus * difficultyMultiplier),
    streak: streakBonus,
    total,
  }
}

// ============================================================
// QUICK TIP GENERATION (for Practice mode)
// ============================================================

/**
 * Generates a quick coaching tip for practice mode.
 * Uses GPT-4o-mini for fast, low-cost suggestions.
 *
 * @param transcript - Recent transcript to analyze
 * @param personaState - Current state/mood of the AI persona
 * @returns A brief tip or null if doing well
 */
export async function generateQuickTip(
  transcript: string,
  personaState: string
): Promise<string | null> {
  // Get just the last few exchanges
  const lastExchange = transcript.split('\n').slice(-4).join('\n')

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a sales coach. Based on this practice call exchange, give ONE brief tip (max 15 words). If they're doing well, respond with just the word "null".`,
        },
        {
          role: 'user',
          content: `Persona state: ${personaState}\n\nRecent exchange:\n${lastExchange}`,
        }
      ],
      max_tokens: 50,
      temperature: 0.7,
    })

    const tip = response.choices[0]?.message?.content?.trim()

    // Return null if no tip needed or response is "null"
    if (!tip || tip.toLowerCase() === 'null' || tip.length < 5) {
      return null
    }

    return tip
  } catch (error) {
    console.error('[UnifiedIntelligence] Error generating quick tip:', error)
    return null
  }
}

// ============================================================
// STREAMING SUGGESTION GENERATION
// ============================================================

/**
 * Generates suggestions with streaming for faster perceived response.
 * Yields partial results as they become available.
 *
 * @param context - The session context
 * @param transcript - The conversation transcript
 * @param keyInfo - Extracted key information
 * @param options - Generation options
 * @yields Partial suggestion content as it streams
 */
export async function* generateSuggestionStream(
  context: SessionContext,
  transcript: string,
  keyInfo: KeyInfo,
  options: {
    scriptSection?: string
    personaId?: string
    objectives?: string[]
  } = {}
): AsyncGenerator<string, UnifiedSuggestion | null, unknown> {
  const recentTranscript = transcript.slice(-3000)
  const systemPrompt = buildSuggestionPrompt(context, keyInfo, options)

  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `
Recent conversation:
${recentTranscript}

Generate ONE coaching suggestion. Respond with just the suggestion text, no JSON.
If no suggestion needed, respond with "null".
          `.trim()
        }
      ],
      max_tokens: 150,
      temperature: 0.7,
      stream: true,
    })

    let fullContent = ''

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
      fullContent += content
      yield content // Yield each chunk for real-time display
    }

    // Check if no suggestion needed
    if (!fullContent || fullContent.trim().toLowerCase() === 'null') {
      return null
    }

    // Construct final suggestion
    return {
      id: crypto.randomUUID(),
      sessionId: '',
      context,
      type: 'tip',
      content: fullContent.trim(),
      priority: 'medium',
      metadata: {
        stage: detectStage(transcript),
        scriptSection: options.scriptSection,
      },
      createdAt: new Date(),
    }
  } catch (error) {
    console.error('[UnifiedIntelligence] Error in streaming suggestion:', error)
    return null
  }
}

// ============================================================
// OBJECTION AND BUYING SIGNAL DETECTION
// ============================================================

/**
 * Detects objections in the transcript with response suggestions.
 *
 * @param transcript - The transcript to analyze
 * @returns Detected objections with handling suggestions
 */
export function detectObjectionsWithResponses(transcript: string): Array<{
  category: string
  detected: boolean
  suggestedResponses: string[]
  frameworkTip: string
}> {
  const detected = detectObjections(transcript)

  return detected.map(obj => ({
    category: obj.category,
    detected: true,
    suggestedResponses: obj.suggestedResponses,
    frameworkTip: obj.frameworkTip,
  }))
}

/**
 * Detects buying signals in the transcript with recommended actions.
 *
 * @param transcript - The transcript to analyze
 * @returns Detected buying signals with action recommendations
 */
export function detectBuyingSignalsWithActions(transcript: string): Array<{
  signal: string
  detected: boolean
  recommendedAction: string
}> {
  const detected = detectBuyingSignals(transcript)

  return detected.map(sig => ({
    signal: sig.signal,
    detected: true,
    recommendedAction: sig.recommendedAction,
  }))
}

// ============================================================
// EXPORTS
// ============================================================

// Re-export useful types and constants for consumers
export {
  OBJECTION_PATTERNS,
  BUYING_SIGNALS,
  REVPILOT_SCRIPT,
  type ScriptSection,
}
