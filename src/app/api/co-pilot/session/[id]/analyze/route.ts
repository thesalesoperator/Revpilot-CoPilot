/**
 * Unified Co-Pilot Transcript Analysis Endpoint
 * POST /api/co-pilot/session/[id]/analyze
 *
 * Processes transcript data for any session context:
 * - Extracts key information (pain points, budget, timeline, etc.)
 * - Detects conversation stage and script section
 * - Generates AI-powered coaching suggestions
 * - Updates session state in real-time
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { SessionContext, KeyInfo, UnifiedSuggestion } from '@/lib/unified/types'
import {
  detectConversationStage,
  detectObjections,
  detectBuyingSignals,
} from '@/lib/coaching/intelligence'
import { getOpenAI, OPENAI_MODELS, TOKEN_LIMITS } from '@/lib/openai'

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// CORS headers for Chrome extension requests
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Rate limiting per session
const recentAnalysis = new Map<string, number>()

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

interface TranscriptEntry {
  text: string
  speaker?: number | null
  confidence?: number
  timestamp?: number
}

interface AnalyzeRequest {
  transcripts: TranscriptEntry[]
  methodology?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params

    // Verify auth token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const token = authHeader.split(' ')[1]

    // Verify user token
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const body: AnalyzeRequest = await request.json()
    const { transcripts } = body

    if (!transcripts || transcripts.length === 0) {
      return NextResponse.json(
        { error: 'transcripts are required' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Rate limit: don't analyze too frequently for the same session
    const now = Date.now()
    const lastAnalysis = recentAnalysis.get(sessionId) || 0
    if (now - lastAnalysis < 2000) { // Min 2 seconds between analyses
      return NextResponse.json(
        { status: 'rate_limited' },
        { headers: CORS_HEADERS }
      )
    }
    recentAnalysis.set(sessionId, now)

    // Clean up old rate limit entries
    if (recentAnalysis.size > 100) {
      const cutoff = now - 60000
      for (const [key, time] of recentAnalysis.entries()) {
        if (time < cutoff) recentAnalysis.delete(key)
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('co_pilot_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    // Verify session belongs to user
    if (session.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - session belongs to another user' },
        { status: 403, headers: CORS_HEADERS }
      )
    }

    // Build transcript from new entries
    const newTranscript = transcripts
      .map(t => `[Speaker ${t.speaker ?? 0}]: ${t.text}`)
      .join('\n')

    const fullTranscript = (session.transcript || '') + '\n' + newTranscript

    // Extract key info from transcript
    const existingKeyInfo = (session.key_info as KeyInfo) || {
      anchorProblem: { identified: false },
      painPoints: [],
      decisionMakers: [],
      buyingSignals: [],
      objections: [],
      competitorsMentioned: [],
    }
    const keyInfo = extractKeyInfo(fullTranscript, existingKeyInfo)

    // Detect conversation stage
    const stage = detectConversationStage(fullTranscript)

    // Detect script section and progress
    const { section, sectionOrder } = detectCurrentSection(
      fullTranscript,
      session.current_section || 'set_expectations'
    )
    const scriptProgress = calculateProgress(section)

    // Update sections covered
    const sectionsCovered: string[] = session.sections_covered || []
    if (!sectionsCovered.includes(section)) {
      sectionsCovered.push(section)
    }

    // Detect objections and buying signals
    const recentTranscript = transcripts.map(t => t.text).join(' ')
    const detectedObjections = detectObjections(recentTranscript)
    const detectedBuyingSignals = detectBuyingSignals(recentTranscript)

    // Update key info with detected signals
    for (const obj of detectedObjections) {
      if (!keyInfo.objections.includes(obj.category)) {
        keyInfo.objections.push(obj.category)
      }
    }
    for (const signal of detectedBuyingSignals) {
      if (!keyInfo.buyingSignals.includes(signal.signal)) {
        keyInfo.buyingSignals.push(signal.signal)
      }
    }

    // Generate suggestion if OpenAI is configured
    let suggestion: Partial<UnifiedSuggestion> | null = null

    try {
      getOpenAI() // Check if OpenAI is available
      // Get previous suggestions to avoid repetition
      const { data: prevSuggestions } = await supabase
        .from('co_pilot_suggestions')
        .select('content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(10)

      const previousContents = prevSuggestions?.map(s => s.content) || []

      suggestion = await generateSuggestion(
        session.context as SessionContext,
        fullTranscript,
        keyInfo,
        previousContents,
        {
          scriptSection: section,
          sectionOrder,
          personaId: session.persona_id,
          detectedObjections,
          detectedBuyingSignals,
        }
      )
    } catch {
      // OpenAI not configured, skip suggestion generation
    }

    // Update session in database
    const { error: updateError } = await supabase
      .from('co_pilot_sessions')
      .update({
        transcript: fullTranscript,
        key_info: keyInfo,
        current_section: section,
        script_progress: scriptProgress,
        sections_covered: sectionsCovered,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('[CoPilot] Session update error:', updateError)
    }

    // Save suggestion if generated
    if (suggestion && suggestion.content) {
      const { error: suggestionError } = await supabase
        .from('co_pilot_suggestions')
        .insert({
          session_id: sessionId,
          context: session.context,
          type: suggestion.type || 'tip',
          content: suggestion.content,
          priority: suggestion.priority || 'medium',
          metadata: {
            stage,
            scriptSection: section,
            sectionOrder,
            confidence: suggestion.metadata?.confidence,
            reasoning: suggestion.metadata?.reasoning,
          },
        })

      if (suggestionError) {
        console.error('[CoPilot] Suggestion insert error:', suggestionError)
      } else {
        console.log(`[CoPilot] ${suggestion.priority?.toUpperCase() || 'MEDIUM'} ${suggestion.type}: ${suggestion.content?.substring(0, 60)}...`)
      }
    }

    // Build response
    const response = {
      status: 'analyzed',
      stage,
      section,
      sectionOrder,
      scriptProgress,
      keyInfo,
      suggestion: suggestion || null,
      sectionsCovered,
      detectedObjections: detectedObjections.map(o => o.category),
      detectedBuyingSignals: detectedBuyingSignals.map(s => s.signal),
    }

    return NextResponse.json(response, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[CoPilot] Analyze error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

/**
 * Extract key information from transcript
 */
function extractKeyInfo(transcript: string, existing: KeyInfo): KeyInfo {
  const lowerTranscript = transcript.toLowerCase()
  const result: KeyInfo = { ...existing }

  // Extract pain points
  const painPatterns = [
    /(?:struggling with|problem with|challenge is|issue is|pain point is|frustrated by)\s+([^.!?]+)/gi,
    /(?:our|the) biggest (?:challenge|problem|issue) is\s+([^.!?]+)/gi,
  ]

  for (const pattern of painPatterns) {
    let match
    while ((match = pattern.exec(lowerTranscript)) !== null) {
      const painPoint = match[1].trim()
      if (painPoint.length > 5 && painPoint.length < 200) {
        if (!result.painPoints.some(p => p.toLowerCase().includes(painPoint.toLowerCase().substring(0, 20)))) {
          result.painPoints.push(painPoint)
        }
      }
    }
  }

  // Extract budget mentions
  const budgetPatterns = [
    /budget (?:is|of|around) \$?([\d,]+(?:k|K|m|M)?)/i,
    /\$?([\d,]+(?:k|K|m|M)?) (?:budget|allocated)/i,
    /(?:spend|invest) (?:around |about )?\$?([\d,]+(?:k|K|m|M)?)/i,
  ]

  for (const pattern of budgetPatterns) {
    const match = transcript.match(pattern)
    if (match) {
      result.budget = match[1]
      result.budgetConfirmed = true
      break
    }
  }

  // Extract timeline mentions
  const timelinePatterns = [
    /(?:by|within|in) ((?:next )?(?:Q[1-4]|\d+ (?:weeks?|months?|days?)|end of (?:year|month|quarter)))/i,
    /(?:deadline|target date|need this by)\s+([^.!?]+)/i,
    /(?:looking to|want to|need to) (?:implement|start|launch|go live) (?:by |in |within )?([^.!?]+)/i,
  ]

  for (const pattern of timelinePatterns) {
    const match = transcript.match(pattern)
    if (match) {
      result.timeline = match[1].trim()
      // Determine urgency
      if (/urgent|asap|immediately|this week/i.test(match[1])) {
        result.timelineUrgency = 'high'
      } else if (/next month|this quarter|Q[1-4]/i.test(match[1])) {
        result.timelineUrgency = 'medium'
      } else {
        result.timelineUrgency = 'low'
      }
      break
    }
  }

  // Extract decision makers
  const dmPatterns = [
    /(?:involve|include|check with|talk to|run by)\s+(?:my |our )?(\w+(?:\s+\w+)?(?:\s*,\s*\w+(?:\s+\w+)?)*)/gi,
    /(?:CEO|CTO|CFO|COO|VP|Director|Manager|Head of)\s+(?:of\s+)?(\w+)/gi,
  ]

  for (const pattern of dmPatterns) {
    let match
    while ((match = pattern.exec(transcript)) !== null) {
      const dm = match[1].trim()
      if (dm.length > 2 && !result.decisionMakers.includes(dm)) {
        result.decisionMakers.push(dm)
      }
    }
  }

  // Extract company context
  const teamSizeMatch = transcript.match(/(\d+)(?:\s*[-–]\s*\d+)?\s*(?:person|people|reps?|sdrs?|aes?|sales)/i)
  if (teamSizeMatch) {
    result.teamSize = teamSizeMatch[1]
  }

  const dealSizeMatch = transcript.match(/(?:deal size|average deal|typical deal|contract value)(?:\s+is)?\s*\$?([\d,]+(?:k|K|m|M)?)/i)
  if (dealSizeMatch) {
    result.dealSize = dealSizeMatch[1]
  }

  // Detect anchor problem
  if (!result.anchorProblem?.identified) {
    const anchorPatterns = [
      /(?:what made you book|why did you take|what prompted) this call[?]?\s*([^.!?]+)/i,
      /(?:the main|biggest|primary) (?:reason|problem|challenge|issue)\s+(?:is|was)\s+([^.!?]+)/i,
    ]

    for (const pattern of anchorPatterns) {
      const match = transcript.match(pattern)
      if (match && match[1].length > 10) {
        result.anchorProblem = {
          identified: true,
          problem: match[1].trim(),
          quotes: [match[0]],
        }
        break
      }
    }
  }

  return result
}

/**
 * Detect current script section based on transcript
 */
function detectCurrentSection(
  transcript: string,
  previousSection: string
): { section: string; sectionOrder: number } {
  const lowerTranscript = transcript.toLowerCase()
  const sections = [
    { id: 'set_expectations', order: 1, keywords: ['thanks for taking', 'appreciate your time', 'before we begin', 'quick questions'] },
    { id: 'isolate_problem', order: 2, keywords: ['what made you book', 'what prompted', 'what\'s going on', 'what brings you'] },
    { id: 'background_questions', order: 3, keywords: ['tell me about your company', 'how big is your team', 'what do you sell'] },
    { id: 'current_situation', order: 4, keywords: ['walk me through', 'current process', 'how do you currently', 'right now'] },
    { id: 'assess_efforts', order: 5, keywords: ['what have you tried', 'tried before', 'attempted to', 'previous solutions'] },
    { id: 'chunking_down', order: 6, keywords: ['specific example', 'last week', 'give me an example', 'concrete instance'] },
    { id: 'financial_qualifier', order: 7, keywords: ['what do you think this costs', 'put a number', 'budget allocated', 'investment'] },
    { id: 'doubt_questions', order: 8, keywords: ['what happens if', 'don\'t fix this', 'cost of waiting', 'risk of'] },
    { id: 'solution_questions', order: 9, keywords: ['ideal world', 'when it\'s fixed', 'what does success look like'] },
    { id: 'why_now', order: 10, keywords: ['why now', 'right time', 'timing', 'urgency'] },
    { id: 'support_questions', order: 11, keywords: ['who else', 'decision makers', 'stakeholders', 'involved in'] },
    { id: 'desired_situation', order: 12, keywords: ['imagine 90 days', 'future state', 'envision', 'what would it look like'] },
    { id: 'transition', order: 13, keywords: ['would you like me to', 'walk you through', 'based on everything', 'permission to share'] },
    { id: 'pitch', order: 14, keywords: ['how we work', 'our approach', 'what we do', 'our process'] },
    { id: 'commitment', order: 15, keywords: ['scale of 1 to 10', 'where are you', 'how do you feel', 'ready to move forward'] },
    { id: 'onboarding', order: 16, keywords: ['getting started', 'next steps', 'onboarding', 'implementation'] },
    { id: 'investment', order: 17, keywords: ['investment is', 'pricing is', 'cost is', 'it would be'] },
  ]

  // Score each section
  const scores: Record<string, number> = {}
  for (const section of sections) {
    scores[section.id] = 0
    for (const keyword of section.keywords) {
      if (lowerTranscript.includes(keyword)) {
        scores[section.id]++
      }
    }
  }

  // Find section with highest score in recent transcript
  const recentTranscript = lowerTranscript.slice(-2000)
  let maxScore = 0
  let detectedSection = previousSection

  for (const section of sections) {
    let recentScore = 0
    for (const keyword of section.keywords) {
      if (recentTranscript.includes(keyword)) {
        recentScore += 2 // Weight recent mentions higher
      }
    }
    recentScore += scores[section.id]

    if (recentScore > maxScore) {
      maxScore = recentScore
      detectedSection = section.id
    }
  }

  const sectionInfo = sections.find(s => s.id === detectedSection) || sections[0]
  return {
    section: detectedSection,
    sectionOrder: sectionInfo.order,
  }
}

/**
 * Calculate script progress percentage
 */
function calculateProgress(section: string): number {
  const sections = [
    'set_expectations', 'isolate_problem', 'background_questions',
    'current_situation', 'assess_efforts', 'chunking_down',
    'financial_qualifier', 'doubt_questions', 'solution_questions',
    'why_now', 'support_questions', 'desired_situation',
    'transition', 'pitch', 'commitment', 'onboarding', 'investment'
  ]
  const index = sections.indexOf(section)
  return index >= 0 ? Math.round(((index + 1) / sections.length) * 100) : 0
}

/**
 * Generate AI-powered coaching suggestion
 */
async function generateSuggestion(
  context: SessionContext,
  transcript: string,
  keyInfo: KeyInfo,
  previousSuggestions: string[],
  options: {
    scriptSection?: string
    sectionOrder?: number
    personaId?: string | null
    detectedObjections?: { category: string }[]
    detectedBuyingSignals?: { signal: string }[]
  }
): Promise<Partial<UnifiedSuggestion> | null> {
  const openai = getOpenAI()
  const recentTranscript = transcript.slice(-3000)

  const systemPrompt = buildSuggestionPrompt(context, keyInfo, options)

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODELS.FAST, // Use mini for real-time (cost efficient)
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
        confidence: result.confidence,
        reasoning: result.reasoning,
        scriptSection: options.scriptSection,
      },
    }
  } catch (error) {
    console.error('[CoPilot] Suggestion generation error:', error)
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
    personaId?: string | null
    detectedObjections?: { category: string }[]
    detectedBuyingSignals?: { signal: string }[]
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
- Return JSON: { "type": "question|tip|objection|positive|alert|transition", "content": "...", "priority": "high|medium|low", "reasoning": "..." }
- Return { "content": null } if no suggestion needed
`

  if (context === 'live_coaching') {
    const sectionWarning = options.sectionOrder && options.sectionOrder <= 6
      ? `\n\n RESTRICTION: Current section is ${options.sectionOrder}/17. NEVER suggest presenting solutions, pitching, or discussing pricing in early sections.`
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

Focus on:
- Helping them achieve practice objectives
- Technique improvement tips
- What they could say next
- Encouraging good behaviors
`
  }

  return basePrompt
}
