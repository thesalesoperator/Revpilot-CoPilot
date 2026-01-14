import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  SUPABASE_ANON_KEY,
  OPENAI_API_KEY,
  CORS_HEADERS,
} from '@/lib/coaching/config'
import {
  detectConversationStage,
  detectObjections,
  detectBuyingSignals,
  buildCoachingPrompt,
  buildScriptCoachingPrompt,
  SalesMethodology,
  ConversationContext,
  ScriptContext,
  detectScriptSection,
  getScriptCoaching,
} from '@/lib/coaching/intelligence'
import { validateSuggestion } from '@/lib/coaching/revpilot-script'
import {
  getSessionState,
  saveSessionState,
  extractKeyInfo,
  updateSectionCoverage,
  generateConversationSummary,
  type SessionState,
} from '@/lib/coaching/session-state'

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

interface TranscriptEntry {
  text: string
  speaker: number | null
  confidence: number
  timestamp: number
}

// Rate limiting per session
const recentAnalysis = new Map<string, number>()

export async function POST(request: NextRequest) {
  try {
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

    const { sessionId, transcripts, methodology = 'revpilot', flipSpeakers = false } = await request.json() as {
      sessionId: string
      transcripts: TranscriptEntry[]
      methodology?: SalesMethodology
      flipSpeakers?: boolean  // Manual speaker flip request
    }

    if (!sessionId || !transcripts || transcripts.length === 0) {
      return NextResponse.json(
        { error: 'Session ID and transcripts required' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Rate limit: don't analyze too frequently for the same session
    const lastAnalysis = recentAnalysis.get(sessionId) || 0
    const now = Date.now()
    if (now - lastAnalysis < 3000) { // Min 3 seconds between analyses
      return NextResponse.json({ status: 'rate_limited' }, { headers: CORS_HEADERS })
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

    // Verify session exists and belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('coaching_sessions')
      .select('id, user_id, status, created_at')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    if (session.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - session belongs to another user' },
        { status: 403, headers: CORS_HEADERS }
      )
    }

    // Get session state from database (with cache)
    const state = await getSessionState(sessionId, user.id, methodology)

    // Handle manual speaker flip request
    if (flipSpeakers) {
      console.log('[Analyze] Manual speaker flip requested')
      const speakerIds = Object.keys(state.speakerCalibration.speakerWordCounts).map(Number)

      if (speakerIds.length >= 2) {
        // Flip between the two speakers
        const currentRep = state.speakerCalibration.repSpeakerId ?? speakerIds[0]
        const otherSpeaker = speakerIds.find(id => id !== currentRep) ?? speakerIds[1]

        state.speakerCalibration.repSpeakerId = otherSpeaker
        state.speakerCalibration.manualOverride = true
        state.speakerCalibration.calibrated = true

        console.log(`[Analyze] Speakers flipped: rep changed from ${currentRep} to ${otherSpeaker}`)
      } else if (speakerIds.length === 1) {
        // Only one speaker - can't flip, but mark as acknowledged
        console.log('[Analyze] Only one speaker detected, cannot flip')
      }
    }

    // Combine transcripts into conversation text
    const recentTranscript = transcripts
      .map(t => {
        const speaker = t.speaker !== null ? `Speaker ${t.speaker}` : 'Unknown'
        return `[${speaker}]: ${t.text}`
      })
      .join('\n')

    // Update state with new transcript
    state.fullTranscript += '\n' + recentTranscript
    state.recentTranscriptChunks.push(recentTranscript)
    if (state.recentTranscriptChunks.length > 10) {
      state.recentTranscriptChunks = state.recentTranscriptChunks.slice(-10)
    }

    // Update word counts for talk ratio tracking with smart speaker identification
    // Instead of assuming speaker 0 = rep, we use calibration
    for (const t of transcripts) {
      const wordCount = t.text.split(/\s+/).length
      const speakerId = t.speaker ?? 0

      // Track words per speaker ID for calibration
      if (!state.speakerCalibration.speakerWordCounts[speakerId]) {
        state.speakerCalibration.speakerWordCounts[speakerId] = 0
      }
      state.speakerCalibration.speakerWordCounts[speakerId] += wordCount

      // Track first speaker (usually the rep starts the call)
      if (state.speakerCalibration.firstSpeakerId === null) {
        state.speakerCalibration.firstSpeakerId = speakerId
        console.log(`[Analyze] First speaker detected: ${speakerId}`)
      }

      state.speakerCalibration.calibrationTranscripts++
    }

    // Determine rep speaker ID using smart calibration
    // Priority: 1) Manual override, 2) Calibrated ID, 3) First speaker heuristic
    let repSpeakerId: number

    if (state.speakerCalibration.manualOverride && state.speakerCalibration.repSpeakerId !== null) {
      // User manually set who the rep is
      repSpeakerId = state.speakerCalibration.repSpeakerId
    } else if (state.speakerCalibration.calibrated && state.speakerCalibration.repSpeakerId !== null) {
      repSpeakerId = state.speakerCalibration.repSpeakerId
    } else {
      // Heuristic: First speaker is usually the rep (they initiate the call)
      // But also check: if only one speaker detected, they're probably the rep
      const speakerIds = Object.keys(state.speakerCalibration.speakerWordCounts).map(Number)

      if (speakerIds.length === 1) {
        // Only one speaker detected - definitely the rep
        repSpeakerId = speakerIds[0]
        console.log(`[Analyze] Single speaker detected (${repSpeakerId}), treating as rep`)
      } else if (state.speakerCalibration.firstSpeakerId !== null) {
        // Multiple speakers - first speaker is usually the rep
        repSpeakerId = state.speakerCalibration.firstSpeakerId
      } else {
        // Fallback to speaker 0
        repSpeakerId = 0
      }

      // Auto-calibrate after enough data (10+ transcripts)
      if (state.speakerCalibration.calibrationTranscripts >= 10 && !state.speakerCalibration.calibrated) {
        state.speakerCalibration.repSpeakerId = repSpeakerId
        state.speakerCalibration.calibrated = true
        console.log(`[Analyze] Speaker calibrated: rep = speaker ${repSpeakerId}`)
      }
    }

    // Now calculate word counts based on identified rep
    state.repWordCount = 0
    state.prospectWordCount = 0

    for (const [speakerId, wordCount] of Object.entries(state.speakerCalibration.speakerWordCounts)) {
      if (Number(speakerId) === repSpeakerId) {
        state.repWordCount += wordCount
      } else {
        state.prospectWordCount += wordCount
      }
    }
    state.totalWordCount = state.repWordCount + state.prospectWordCount

    // Store transcript in session for later summary
    const { data: existingSession } = await supabase
      .from('coaching_sessions')
      .select('transcript')
      .eq('id', sessionId)
      .single()

    const existingTranscript = existingSession?.transcript || ''
    const updatedTranscript = existingTranscript + '\n' + recentTranscript

    await supabase
      .from('coaching_sessions')
      .update({ transcript: updatedTranscript })
      .eq('id', sessionId)

    // =========================================================================
    // ENHANCED KEY INFO EXTRACTION
    // =========================================================================

    // Use the enhanced extraction that understands your script
    state.keyInfo = extractKeyInfo(recentTranscript, state.keyInfo)

    // =========================================================================
    // ANALYZE CONVERSATION CONTEXT
    // =========================================================================

    const currentStage = detectConversationStage(state.fullTranscript)
    const detectedObjections = detectObjections(recentTranscript)
    const detectedBuyingSignals = detectBuyingSignals(recentTranscript)

    // Calculate talk ratio from our tracked word counts
    const totalWords = state.repWordCount + state.prospectWordCount
    const talkRatio = {
      repPercent: totalWords > 0 ? Math.round((state.repWordCount / totalWords) * 100) : 50,
      prospectPercent: totalWords > 0 ? Math.round((state.prospectWordCount / totalWords) * 100) : 50,
    }

    const callDurationMinutes = Math.round((now - state.startTime) / 60000)

    // Update state
    state.lastStage = currentStage

    // Track detected objections and buying signals in state
    for (const obj of detectedObjections) {
      if (!state.keyInfo.objections.includes(obj.category)) {
        state.keyInfo.objections.push(obj.category)
      }
    }
    for (const signal of detectedBuyingSignals) {
      if (!state.keyInfo.buyingSignals.includes(signal.signal)) {
        state.keyInfo.buyingSignals.push(signal.signal)
      }
    }

    // =========================================================================
    // SCRIPT SECTION TRACKING (RevPilot methodology)
    // =========================================================================

    let scriptContext: ScriptContext | null = null
    let systemPrompt: string

    if (state.methodology === 'revpilot') {
      // Detect current script section
      const sectionDetection = detectScriptSection(
        state.fullTranscript,
        state.currentScriptSection
      )

      // Update section coverage tracking
      updateSectionCoverage(state, sectionDetection.section, state.fullTranscript)

      // Get script-specific coaching
      const scriptCoaching = getScriptCoaching(
        sectionDetection.section,
        state.fullTranscript,
        {
          painPoints: state.keyInfo.painPoints,
          budget: state.keyInfo.budget,
          timeline: state.keyInfo.timeline,
          decisionMakers: state.keyInfo.decisionMakers,
        }
      )

      // Update script progress
      state.scriptProgress = scriptCoaching.progressPercentage

      // =====================================================================
      // CRITICAL: ANCHOR PROBLEM VALIDATION FOR SECTION 2
      // =====================================================================

      let anchorProblemWarning: string | undefined = scriptCoaching.warningMessage

      if (sectionDetection.section === 'isolate_problem') {
        if (!state.keyInfo.anchorProblem.identified) {
          anchorProblemWarning = '🔴 CRITICAL: Stay in this section! No anchor problem identified yet. Keep asking "What made you book this call?" and "What\'s going on in your sales operations?"'
        } else {
          // Problem identified - show what we found
          anchorProblemWarning = `✅ Anchor problem found: ${state.keyInfo.anchorProblem.category?.toUpperCase()} - "${state.keyInfo.anchorProblem.problem?.substring(0, 80)}..."`
        }
      }

      // Build script context
      scriptContext = {
        currentSection: scriptCoaching.currentSection,
        previousSectionId: state.currentScriptSection,
        suggestedQuestions: scriptCoaching.suggestedQuestions,
        coachingTip: scriptCoaching.coachingTip,
        warningMessage: anchorProblemWarning,
        progressPercentage: scriptCoaching.progressPercentage,
        keyInfo: {
          painPoints: state.keyInfo.painPoints,
          budget: state.keyInfo.budget,
          timeline: state.keyInfo.timeline,
          decisionMakers: state.keyInfo.decisionMakers,
          objections: state.keyInfo.objections,
          buyingSignals: state.keyInfo.buyingSignals,
        },
      }

      // Build context with enhanced info
      const context: ConversationContext = {
        stage: currentStage,
        methodology: state.methodology,
        recentTranscript: state.recentTranscriptChunks.slice(-3).join('\n'),
        fullTranscript: state.fullTranscript,
        detectedObjections,
        detectedBuyingSignals,
        talkRatio,
        callDurationMinutes,
        previousSuggestions: state.previousSuggestions,
        scriptSection: sectionDetection.section,
        scriptProgress: scriptCoaching.progressPercentage,
        scriptWarning: anchorProblemWarning,
      }

      // Build script-aware coaching prompt with enhanced context
      systemPrompt = buildScriptCoachingPrompt(context, scriptContext)

      console.log(`[Analyze] Section: ${sectionDetection.section} | Progress: ${scriptCoaching.progressPercentage}% | Anchor Problem: ${state.keyInfo.anchorProblem.identified ? 'YES' : 'NO'}`)
    } else {
      // Standard methodology-based coaching
      const context: ConversationContext = {
        stage: currentStage,
        methodology: state.methodology,
        recentTranscript,
        fullTranscript: state.fullTranscript,
        detectedObjections,
        detectedBuyingSignals,
        talkRatio,
        callDurationMinutes,
        previousSuggestions: state.previousSuggestions,
      }

      systemPrompt = buildCoachingPrompt(context)
    }

    // =========================================================================
    // GENERATE AI COACHING
    // =========================================================================

    if (!OPENAI_API_KEY) {
      console.log('[Analyze] No OpenAI API key, skipping AI analysis')

      // Still save state
      await saveSessionState(state)

      return NextResponse.json({
        status: 'no_openai_key',
        stage: currentStage,
        talkRatio,
        keyInfo: {
          anchorProblem: state.keyInfo.anchorProblem,
          painPoints: state.keyInfo.painPoints,
          budget: state.keyInfo.budget,
          timeline: state.keyInfo.timeline,
          decisionMakers: state.keyInfo.decisionMakers,
        },
        ...(scriptContext ? {
          script: {
            section: scriptContext.currentSection.id,
            sectionName: scriptContext.currentSection.name,
            sectionOrder: scriptContext.currentSection.order,
            sectionObjective: scriptContext.currentSection.objective,
            progress: scriptContext.progressPercentage,
            suggestedQuestions: scriptContext.suggestedQuestions,
            coachingTip: scriptContext.coachingTip,
            warning: scriptContext.warningMessage,
          }
        } : {})
      }, { headers: CORS_HEADERS })
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

    // Keep user message minimal - system prompt has all the context now
    const userMessage = 'What should the rep say or ask next?'

    // Use GPT-4o for highest quality coaching - reduced tokens for brevity
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 150,  // Much shorter - we want brief suggestions
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const responseText = completion.choices[0]?.message?.content || '{}'
    let rawAnalysis

    try {
      rawAnalysis = JSON.parse(responseText)
    } catch {
      console.error('[Analyze] Failed to parse OpenAI response:', responseText)

      // Save state even on parse error
      await saveSessionState(state)

      return NextResponse.json({
        status: 'parse_error',
        stage: currentStage,
        talkRatio,
      }, { headers: CORS_HEADERS })
    }

    // Transform new compact format {"q": "...", "why": "..."} to expected format
    // New format from tight prompt: {"q": "question text", "why": "reason"}
    // Expected format: {"suggestion": {"type": "question", "content": "...", "priority": "..."}}
    let analysis: {
      suggestion: { type: string; content: string; priority: string } | null
      conversationInsight?: string
      predictedNextMove?: string
      shouldAdvanceSection?: boolean
      sectionCoverage?: string
    }

    if (rawAnalysis.q && typeof rawAnalysis.q === 'string') {
      // New compact format - transform to expected format
      analysis = {
        suggestion: {
          type: 'question',
          content: rawAnalysis.q,
          priority: 'medium'
        },
        conversationInsight: rawAnalysis.why || '',
        predictedNextMove: '',
        shouldAdvanceSection: false,
        sectionCoverage: ''
      }
    } else if (rawAnalysis.suggestion) {
      // Old format - use as-is
      analysis = rawAnalysis
    } else {
      // No suggestion needed
      analysis = {
        suggestion: null,
        conversationInsight: rawAnalysis.why || '',
        predictedNextMove: '',
        shouldAdvanceSection: false,
        sectionCoverage: ''
      }
    }

    // =========================================================================
    // POST-PROCESSING: VALIDATE SUGGESTION AGAINST CURRENT SECTION
    // Uses shared validation from revpilot-script.ts
    // =========================================================================

    if (analysis.suggestion && analysis.suggestion.content && scriptContext) {
      const sectionOrder = scriptContext.currentSection.order
      const validation = validateSuggestion(analysis.suggestion, sectionOrder)

      if (validation.blocked) {
        console.log(`[Analyze] ⛔ SUGGESTION BLOCKED: ${validation.reason}`)
        console.log(`[Analyze] Original suggestion: "${analysis.suggestion.content}"`)
        analysis.suggestion = validation.suggestion
        console.log(`[Analyze] ✅ Replaced with: "${analysis.suggestion.content}"`)
      }
    }

    // =========================================================================
    // TRACK SUGGESTION AND SAVE STATE
    // =========================================================================

    if (analysis.suggestion && analysis.suggestion.content) {
      // Track suggestion to avoid repetition
      state.previousSuggestions.push(analysis.suggestion.content)
      if (state.previousSuggestions.length > 15) {
        state.previousSuggestions = state.previousSuggestions.slice(-15)
      }
      state.suggestionCount++
      state.lastSuggestionTime = now

      // Insert suggestion into database
      const { error: insertError } = await supabase
        .from('coaching_suggestions')
        .insert({
          session_id: sessionId,
          type: analysis.suggestion.type || 'tip',
          content: analysis.suggestion.content,
          metadata: {
            priority: analysis.suggestion.priority,
            stage: currentStage,
            conversationInsight: analysis.conversationInsight,
            predictedNextMove: analysis.predictedNextMove,
            // Enhanced key info
            anchorProblem: state.keyInfo.anchorProblem,
            keyInfo: {
              companyName: state.keyInfo.companyName,
              teamSize: state.keyInfo.teamSize,
              budget: state.keyInfo.budget,
              timeline: state.keyInfo.timeline,
              decisionMakers: state.keyInfo.decisionMakers,
            },
            // Script-specific metadata
            ...(state.methodology === 'revpilot' && scriptContext ? {
              scriptSection: scriptContext.currentSection.id,
              scriptSectionName: scriptContext.currentSection.name,
              scriptProgress: scriptContext.progressPercentage,
              shouldAdvanceSection: analysis.shouldAdvanceSection,
              sectionCoverage: analysis.sectionCoverage,
              questionsAsked: state.sectionCoverage[scriptContext.currentSection.id]?.questionsAsked || [],
            } : {}),
          }
        })

      if (insertError) {
        console.error('[Analyze] Failed to insert suggestion:', insertError)
      } else {
        console.log(`[Analyze] ${analysis.suggestion.priority?.toUpperCase() || 'MEDIUM'} ${analysis.suggestion.type}: ${analysis.suggestion.content.substring(0, 60)}...`)
      }
    }

    // Update talk ratio stats
    await supabase
      .from('coaching_suggestions')
      .insert({
        session_id: sessionId,
        type: 'stats',
        content: JSON.stringify({
          talk_ratio: talkRatio.repPercent,
          stage: currentStage,
          duration_minutes: callDurationMinutes,
          anchor_problem_identified: state.keyInfo.anchorProblem.identified,
        }),
      })

    // Generate conversation summary periodically (every 2 minutes)
    if (!state.summary || (now - state.summary.lastUpdated) > 2 * 60 * 1000) {
      state.summary = await generateConversationSummary(state.fullTranscript, state.keyInfo)
    }

    // Save state to database
    await saveSessionState(state)

    // =========================================================================
    // BUILD RESPONSE
    // =========================================================================

    const response: Record<string, unknown> = {
      status: 'analyzed',
      suggestion: analysis.suggestion || null,
      conversationInsight: analysis.conversationInsight,
      predictedNextMove: analysis.predictedNextMove,
      stage: currentStage,
      talkRatio,
      // Enhanced key info in response
      keyInfo: {
        anchorProblem: state.keyInfo.anchorProblem,
        painPoints: state.keyInfo.painPoints,
        budget: state.keyInfo.budget,
        budgetConfirmed: state.keyInfo.budgetConfirmed,
        timeline: state.keyInfo.timeline,
        timelineUrgency: state.keyInfo.timelineUrgency,
        decisionMakers: state.keyInfo.decisionMakers,
        buyingSignals: state.keyInfo.buyingSignals,
        objections: state.keyInfo.objections,
        commitmentScore: state.keyInfo.commitmentScore,
        companyContext: {
          teamSize: state.keyInfo.teamSize,
          dealSize: state.keyInfo.dealSize,
          salesCycle: state.keyInfo.salesCycle,
          currentCRM: state.keyInfo.currentCRM,
        }
      },
    }

    // Add script-specific data for RevPilot methodology
    if (state.methodology === 'revpilot' && scriptContext) {
      response.script = {
        section: scriptContext.currentSection.id,
        sectionName: scriptContext.currentSection.name,
        sectionOrder: scriptContext.currentSection.order,
        sectionObjective: scriptContext.currentSection.objective,
        progress: scriptContext.progressPercentage,
        suggestedQuestions: scriptContext.suggestedQuestions,
        coachingTip: scriptContext.coachingTip,
        warning: scriptContext.warningMessage,
        shouldAdvance: analysis.shouldAdvanceSection,
        sectionCoverage: analysis.sectionCoverage,
        // Section coverage details
        coverage: state.sectionCoverage[scriptContext.currentSection.id],
        // Anchor problem status (critical for Section 2)
        anchorProblemIdentified: state.keyInfo.anchorProblem.identified,
        anchorProblemCategory: state.keyInfo.anchorProblem.category,
      }
    }

    return NextResponse.json(response, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[Analyze] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
