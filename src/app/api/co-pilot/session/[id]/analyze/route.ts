/**
 * Unified Co-Pilot Session Analysis API
 *
 * Processes transcript chunks and provides real-time analysis:
 * - Extracts key information (pain points, budget, timeline, etc.)
 * - Detects conversation stage and script section
 * - Generates coaching suggestions
 * - Updates session state
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  SUPABASE_ANON_KEY,
  CORS_HEADERS,
} from '@/lib/coaching/config'
import {
  detectStage,
  extractKeyInfo,
  detectCurrentSection,
  generateSuggestion,
  calculateScriptProgress,
} from '@/lib/unified/intelligence'
import { KeyInfo } from '@/lib/unified/types'

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params

    // Verify authentication (support both token and header-based)
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      if (token && token !== 'undefined' && token !== 'null') {
        const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
        const { error: authError } = await authClient.auth.getUser(token)
        if (authError) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401, headers: CORS_HEADERS }
          )
        }
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

    // Parse request body
    const body = await request.json()
    const { transcripts, text } = body as {
      transcripts?: { text: string; speaker?: number }[]
      text?: string // Alternative: single text block
    }

    // Build new transcript from input
    let newTranscript = ''
    if (transcripts && transcripts.length > 0) {
      newTranscript = transcripts
        .map(t => `[Speaker ${t.speaker ?? 0}]: ${t.text}`)
        .join('\n')
    } else if (text) {
      newTranscript = text
    }

    if (!newTranscript) {
      return NextResponse.json(
        { error: 'No transcript data provided' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Append to full transcript
    const fullTranscript = ((session.transcript as string) || '') + '\n' + newTranscript

    // Extract key info (accumulates with existing info)
    const existingKeyInfo = (session.key_info as Partial<KeyInfo>) || {}
    const keyInfo = extractKeyInfo(fullTranscript, existingKeyInfo)

    // Detect conversation stage
    const stage = detectStage(fullTranscript)

    // Detect script section (for coaching and practice)
    const previousSection = (session.current_section as string) || 'set_expectations'
    const { section, confidence: sectionConfidence } = detectCurrentSection(
      fullTranscript,
      previousSection
    )

    // Calculate script progress
    const scriptProgress = calculateScriptProgress(section)

    // Track sections covered
    const sectionsCovered = (session.sections_covered as string[]) || []
    if (!sectionsCovered.includes(section)) {
      sectionsCovered.push(section)
    }

    // Generate suggestion (if real-time coaching is enabled)
    let suggestion = null
    if (session.context === 'live_coaching' || session.context === 'practice') {
      // Get previous suggestions to avoid repetition
      const { data: prevSuggestions } = await supabase
        .from('co_pilot_suggestions')
        .select('content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(10)

      const previousSuggestionTexts = prevSuggestions?.map(s => s.content) || []

      suggestion = await generateSuggestion(
        session.context,
        fullTranscript,
        keyInfo,
        previousSuggestionTexts,
        {
          scriptSection: section,
          personaId: session.persona_id,
          objectives: session.objectives_completed,
        }
      )

      // Save suggestion to database (enables realtime subscription)
      if (suggestion) {
        suggestion.sessionId = sessionId

        await supabase
          .from('co_pilot_suggestions')
          .insert({
            session_id: sessionId,
            context: session.context,
            type: suggestion.type,
            content: suggestion.content,
            priority: suggestion.priority,
            metadata: suggestion.metadata,
          })
      }
    }

    // Calculate duration
    const startedAt = session.started_at ? new Date(session.started_at) : new Date()
    const durationSeconds = Math.round((Date.now() - startedAt.getTime()) / 1000)

    // Update session
    const { error: updateError } = await supabase
      .from('co_pilot_sessions')
      .update({
        transcript: fullTranscript,
        key_info: keyInfo,
        current_section: section,
        script_progress: scriptProgress,
        sections_covered: sectionsCovered,
        status: 'active',
        duration_seconds: durationSeconds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('[CoPilot] Session update error:', updateError)
    }

    // Return analysis results
    return NextResponse.json({
      status: 'analyzed',
      stage,
      section,
      sectionConfidence,
      scriptProgress,
      keyInfo,
      suggestion,
      durationSeconds,
      transcriptLength: fullTranscript.length,
    }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[CoPilot] Analyze error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
