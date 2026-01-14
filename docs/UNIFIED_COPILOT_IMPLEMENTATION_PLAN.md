# RevPilot Unified AI Co-Pilot Implementation Plan

**Version:** 1.0
**Created:** January 2025
**Status:** Ready for Implementation
**Timeline:** 10 weeks
**Team Size:** 2-3 developers

---

## Executive Summary

This document provides a step-by-step implementation plan to transform RevPilot's two separate AI features (Live Coaching + AI Practice) into a unified real-time AI co-pilot system.

**Current State:**
- Live Coaching: 11-16 second latency, Chrome extension, real calls
- AI Practice: 2-4 second latency, Vapi-powered, simulated calls
- Separate codebases, separate databases, separate experiences

**Future State:**
- Unified AI co-pilot: <2 second latency for both
- Shared infrastructure, shared intelligence, shared gamification
- Three modes: Live Coaching | Practice | Real Call Analysis

---

## Quick Reference: Implementation Order

```
WEEK 1-2:   Foundation + Quick Wins (immediate value)
WEEK 3-4:   Unified API + Streaming
WEEK 5-6:   Extension + UI Integration
WEEK 7-8:   Practice Enhancements + Adaptive AI
WEEK 9-10:  Testing + Migration + Launch
```

---

# PHASE 0: QUICK WINS (Days 1-5)

**Goal:** Ship immediate improvements while foundation work begins.

## Quick Win #1: Reduce Coaching Latency by 50%

**Current:** 8-second transcript batching
**Change:** Reduce to 3-second batching
**Impact:** 11-16s → 6-10s latency
**Time:** 2 hours

```javascript
// File: chrome-extension/offscreen.js
// Line 16: Change from:
const TRANSCRIPT_SEND_INTERVAL = 8000

// To:
const TRANSCRIPT_SEND_INTERVAL = 3000
```

**Test:** Start coaching session, verify suggestions appear faster.

---

## Quick Win #2: Add Streaming OpenAI Responses

**Current:** Wait for full GPT-4o response
**Change:** Stream tokens as they arrive
**Impact:** Perceived latency drops 60%
**Time:** 4 hours

```typescript
// File: src/app/api/coaching/analyze-transcript/route.ts
// Around line 471, change:

const completion = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [...],
  stream: true,  // ADD THIS
})

// Handle streaming response
let fullContent = ''
for await (const chunk of completion) {
  const content = chunk.choices[0]?.delta?.content || ''
  fullContent += content

  // Optional: Send partial suggestion via realtime
  // await supabase.from('coaching_suggestions').insert({
  //   session_id: sessionId,
  //   type: 'partial',
  //   content: fullContent,
  // })
}
```

---

## Quick Win #3: Use GPT-4o-mini for Real-Time

**Current:** GPT-4o for all analysis ($0.06/call)
**Change:** GPT-4o-mini for suggestions ($0.01/call)
**Impact:** 80% cost reduction on real-time, same quality
**Time:** 1 hour

```typescript
// File: src/app/api/coaching/analyze-transcript/route.ts
// Line 471, change model:

const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',  // Was 'gpt-4o'
  messages: [...],
})

// Keep GPT-4o for final analysis only (summary endpoint)
```

---

## Quick Win #4: Real-Time Coaching Tips in Practice

**Current:** Practice only shows objective completion
**Change:** Add coaching tips during practice calls
**Impact:** Practice feels like coaching
**Time:** 8 hours

```typescript
// File: src/app/api/practice/objectives/route.ts
// After line 75, add coaching tip generation:

// Existing: Check objectives
const completedObjectives = await checkObjectives(transcript)

// NEW: Generate coaching tip
const coachingTip = await generateQuickTip(transcript, personaState)

return NextResponse.json({
  completedObjectives,
  coachingTip,  // NEW
})

// Helper function (add to file):
async function generateQuickTip(transcript: string, persona: string): Promise<string | null> {
  const lastExchange = transcript.split('\n').slice(-4).join('\n')

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'system',
      content: `You are a sales coach. Based on this practice call exchange, give ONE brief tip (max 15 words). If they're doing well, say nothing.`
    }, {
      role: 'user',
      content: lastExchange
    }],
    max_tokens: 50,
  })

  const tip = response.choices[0]?.message?.content
  return tip && tip.length > 5 ? tip : null
}
```

**Update Practice UI:**
```typescript
// File: src/app/practice/page.tsx
// In checkObjectivesRealTime function (around line 350), update:

const result = await response.json()

// Existing
setCallState(prev => ({
  ...prev,
  liveObjectivesCompleted: result.completedObjectives
}))

// NEW: Show coaching tip
if (result.coachingTip) {
  setCoachingTip(result.coachingTip)
  setTimeout(() => setCoachingTip(null), 5000) // Auto-dismiss
}
```

---

## Quick Win #5: Shared Key Info Extraction

**Current:** Coaching extracts key info, Practice doesn't
**Change:** Add key info extraction to Practice
**Impact:** Practice sessions have same rich data
**Time:** 4 hours

```typescript
// File: src/app/api/practice/analyze/route.ts
// Import from coaching:
import { extractKeyInfo } from '@/lib/coaching/session-state'

// Before final analysis (around line 85), add:
const keyInfo = extractKeyInfo(transcript, {
  companyName: null,
  industry: null,
  teamSize: null,
  // ... default empty state
})

// Include in analysis result:
const analysisWithKeyInfo = {
  ...analysis,
  keyInfo,
}
```

---

## Quick Wins Summary

| Win | Time | Impact | Priority |
|-----|------|--------|----------|
| Reduce batching to 3s | 2h | 50% faster | P0 |
| Use GPT-4o-mini | 1h | 80% cost savings | P0 |
| Streaming responses | 4h | 60% perceived faster | P1 |
| Coaching tips in practice | 8h | Feature parity | P1 |
| Key info in practice | 4h | Data parity | P2 |

**Total:** 19 hours = 2-3 days for one developer

---

# PHASE 1: FOUNDATION (Week 1-2)

## 1.1 Create Unified Type System

**New File:** `src/lib/unified/types.ts`

```typescript
// ============================================================
// UNIFIED CO-PILOT TYPE SYSTEM
// ============================================================

export type SessionContext = 'live_coaching' | 'practice' | 'real_call_analysis'
export type CaptureMethod = 'tab_audio' | 'recall_bot' | 'vapi' | 'upload'
export type SessionStatus = 'starting' | 'active' | 'analyzing' | 'completed' | 'failed'

// ------------------------------------------------------------
// Core Session Interface
// ------------------------------------------------------------
export interface UnifiedSession {
  id: string
  userId: string
  context: SessionContext
  captureMethod: CaptureMethod
  status: SessionStatus

  // Source-specific
  meetingUrl?: string        // live_coaching
  challengeId?: string       // practice
  personaId?: string         // practice
  uploadedFileUrl?: string   // real_call_analysis

  // Transcript & Analysis
  transcript: string
  keyInfo: KeyInfo
  analysis?: CallAnalysis

  // Script Progress (applies to coaching + practice)
  scriptProgress: number      // 0-100
  currentSection?: string     // 'discovery', 'qualification', etc.
  sectionsCovered: string[]

  // Gamification
  xpEarned?: number
  xpBreakdown?: XPBreakdown
  objectivesCompleted?: string[]
  bonusObjectivesCompleted?: string[]

  // Timestamps
  startedAt: Date
  endedAt?: Date
  durationSeconds: number

  // Metadata
  createdAt: Date
  updatedAt: Date
}

// ------------------------------------------------------------
// Key Information (Extracted from calls)
// ------------------------------------------------------------
export interface KeyInfo {
  // Anchor Problem (critical for discovery)
  anchorProblem?: {
    identified: boolean
    category?: string
    problem?: string
    quotes?: string[]
    severity?: 'low' | 'medium' | 'high'
  }

  // Pain Points
  painPoints: string[]
  painSeverity?: 'low' | 'medium' | 'high'

  // Qualification
  budget?: string
  budgetConfirmed?: boolean
  timeline?: string
  timelineUrgency?: 'low' | 'medium' | 'high'
  decisionMakers: string[]
  decisionProcess?: string

  // Signals
  buyingSignals: string[]
  objections: string[]
  competitorsMentioned: string[]

  // Company Context
  companyName?: string
  industry?: string
  teamSize?: string
  dealSize?: string
  salesCycle?: string
  currentCRM?: string

  // Commitment (1-10 scale)
  commitmentScore?: number
  readyToClose?: boolean
}

// ------------------------------------------------------------
// Unified Suggestion
// ------------------------------------------------------------
export interface UnifiedSuggestion {
  id: string
  sessionId: string
  context: SessionContext

  // Content
  type: 'question' | 'tip' | 'objection' | 'positive' | 'alert' | 'transition'
  content: string
  priority: 'high' | 'medium' | 'low'

  // Context-specific metadata
  metadata: {
    // Coaching
    stage?: string
    scriptSection?: string
    scriptQuestion?: string

    // Practice
    objective?: string
    personaMood?: 'positive' | 'neutral' | 'negative'

    // Shared
    confidence?: number
    reasoning?: string
  }

  createdAt: Date
}

// ------------------------------------------------------------
// Call Analysis Result
// ------------------------------------------------------------
export interface CallAnalysis {
  overallScore: number  // 0-100

  // Dimension scores
  discovery: number
  qualification: number
  valueArticulation: number
  objectionHandling: number
  closing: number
  rapport: number

  // Insights
  strengths: string[]
  improvements: string[]
  keyMoments: string[]
  missedOpportunities: string[]

  // Next steps
  suggestedNextSteps: string[]
  followUpQuestions: string[]
}

// ------------------------------------------------------------
// XP Breakdown
// ------------------------------------------------------------
export interface XPBreakdown {
  base: number
  objectives: number
  bonus: number
  difficulty: number
  streak: number
  total: number
}

// ------------------------------------------------------------
// Conversation Stage
// ------------------------------------------------------------
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
export interface ScriptSection {
  id: string
  name: string
  order: number
  objective: string
  keyQuestions: string[]
  transitionSignals: string[]
  warningPatterns: string[]
}
```

---

## 1.2 Create Database Migration

**New File:** `supabase/migrations/20250115_unified_copilot.sql`

```sql
-- ============================================================
-- UNIFIED CO-PILOT DATABASE SCHEMA
-- ============================================================

-- ------------------------------------------------------------
-- 1. Create unified sessions table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS co_pilot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Context
  context TEXT NOT NULL CHECK (context IN ('live_coaching', 'practice', 'real_call_analysis')),
  capture_method TEXT CHECK (capture_method IN ('tab_audio', 'recall_bot', 'vapi', 'upload')),
  status TEXT NOT NULL DEFAULT 'starting' CHECK (status IN ('starting', 'active', 'analyzing', 'completed', 'failed')),

  -- Source-specific
  meeting_url TEXT,
  challenge_id TEXT,
  persona_id TEXT,
  uploaded_file_url TEXT,

  -- Transcript & Analysis
  transcript TEXT,
  key_info JSONB DEFAULT '{}',
  analysis JSONB,

  -- Script Progress
  script_progress DECIMAL DEFAULT 0,
  current_section TEXT,
  sections_covered TEXT[] DEFAULT '{}',

  -- Gamification
  xp_earned INTEGER DEFAULT 0,
  xp_breakdown JSONB,
  objectives_completed TEXT[] DEFAULT '{}',
  bonus_objectives_completed TEXT[] DEFAULT '{}',
  overall_score INTEGER,

  -- Timestamps
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2. Create unified suggestions table (realtime enabled)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS co_pilot_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES co_pilot_sessions(id) ON DELETE CASCADE,

  -- Content
  context TEXT NOT NULL CHECK (context IN ('live_coaching', 'practice', 'real_call_analysis')),
  type TEXT NOT NULL CHECK (type IN ('question', 'tip', 'objection', 'positive', 'alert', 'transition', 'stats')),
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 3. Indexes for performance
-- ------------------------------------------------------------
CREATE INDEX idx_copilot_sessions_user ON co_pilot_sessions(user_id);
CREATE INDEX idx_copilot_sessions_status ON co_pilot_sessions(status);
CREATE INDEX idx_copilot_sessions_context ON co_pilot_sessions(context);
CREATE INDEX idx_copilot_suggestions_session ON co_pilot_suggestions(session_id);
CREATE INDEX idx_copilot_suggestions_created ON co_pilot_suggestions(created_at DESC);

-- ------------------------------------------------------------
-- 4. Enable realtime for suggestions
-- ------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE co_pilot_suggestions;

-- ------------------------------------------------------------
-- 5. Backward compatibility views
-- ------------------------------------------------------------

-- View for coaching sessions (maps to old table structure)
CREATE OR REPLACE VIEW coaching_sessions_unified AS
SELECT
  id,
  user_id,
  meeting_url,
  status,
  transcript,
  analysis,
  overall_score,
  duration_seconds,
  ended_at,
  created_at,
  updated_at
FROM co_pilot_sessions
WHERE context = 'live_coaching';

-- View for practice sessions (maps to old table structure)
CREATE OR REPLACE VIEW practice_sessions_unified AS
SELECT
  id,
  user_id,
  challenge_id,
  persona_id,
  'medium' as difficulty,  -- Default
  status,
  started_at,
  ended_at,
  duration_seconds,
  transcript,
  analysis,
  overall_score,
  objectives_completed,
  bonus_objectives_completed,
  xp_earned,
  xp_breakdown,
  created_at,
  updated_at
FROM co_pilot_sessions
WHERE context = 'practice';

-- ------------------------------------------------------------
-- 6. Update trigger for updated_at
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_copilot_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER copilot_sessions_updated
  BEFORE UPDATE ON co_pilot_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_copilot_updated_at();

-- ------------------------------------------------------------
-- 7. RLS Policies
-- ------------------------------------------------------------
ALTER TABLE co_pilot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_pilot_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view own sessions"
  ON co_pilot_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON co_pilot_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON co_pilot_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can view suggestions for their sessions
CREATE POLICY "Users can view session suggestions"
  ON co_pilot_suggestions FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM co_pilot_sessions WHERE user_id = auth.uid()
    )
  );

-- Service role can do anything (for API routes)
CREATE POLICY "Service role full access sessions"
  ON co_pilot_sessions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access suggestions"
  ON co_pilot_suggestions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

**Run migration:**
```bash
npx supabase db push
```

---

## 1.3 Create Unified Intelligence Module

**New File:** `src/lib/unified/intelligence.ts`

```typescript
/**
 * UNIFIED INTELLIGENCE MODULE
 *
 * Shared AI analysis logic for both coaching and practice.
 * Consolidates: stage detection, objection detection, key info extraction,
 * suggestion generation, and script tracking.
 */

import OpenAI from 'openai'
import {
  UnifiedSession,
  KeyInfo,
  ConversationStage,
  UnifiedSuggestion,
  SessionContext
} from './types'

// Import existing logic (will refactor to use this module)
import { detectConversationStage as legacyDetectStage } from '@/lib/coaching/intelligence'
import { extractKeyInfo as legacyExtractKeyInfo } from '@/lib/coaching/session-state'
import { detectScriptSection } from '@/lib/coaching/revpilot-script'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ============================================================
// CONVERSATION STAGE DETECTION
// ============================================================

export function detectStage(transcript: string): ConversationStage {
  return legacyDetectStage(transcript)
}

// ============================================================
// KEY INFORMATION EXTRACTION
// ============================================================

export function extractKeyInfo(
  transcript: string,
  existingInfo: Partial<KeyInfo> = {}
): KeyInfo {
  const defaultInfo: KeyInfo = {
    painPoints: [],
    decisionMakers: [],
    buyingSignals: [],
    objections: [],
    competitorsMentioned: [],
    ...existingInfo,
  }

  return legacyExtractKeyInfo(transcript, defaultInfo as any) as KeyInfo
}

// ============================================================
// SCRIPT SECTION DETECTION
// ============================================================

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

// ============================================================
// UNIFIED SUGGESTION GENERATION
// ============================================================

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
  const recentTranscript = transcript.slice(-3000)

  const systemPrompt = buildSuggestionPrompt(context, keyInfo, options)

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
        `
      }
    ],
    max_tokens: 200,
    temperature: 0.7,
    response_format: { type: 'json_object' },
  })

  try {
    const result = JSON.parse(response.choices[0]?.message?.content || '{}')

    if (!result.content || result.content === 'null') {
      return null
    }

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
  } catch {
    return null
  }
}

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
- Return JSON: { type, content, priority, reasoning }
- Return { content: null } if no suggestion needed
`

  if (context === 'live_coaching') {
    return basePrompt + `
CONTEXT: Live sales call coaching
SCRIPT SECTION: ${options.scriptSection || 'unknown'}

Focus on:
- Helping them follow the RevPilot script
- Extracting key qualification info
- Handling objections as they arise
`
  }

  if (context === 'practice') {
    return basePrompt + `
CONTEXT: AI roleplay practice
PERSONA: ${options.personaId || 'unknown'}
OBJECTIVES: ${options.objectives?.join(', ') || 'none set'}

Focus on:
- Helping them achieve their objectives
- Technique improvement tips
- What they could say next
`
  }

  return basePrompt
}

// ============================================================
// FULL CALL ANALYSIS (Post-call)
// ============================================================

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
  analysis: any
  xpEarned: number
}> {
  const prompt = `Analyze this sales call and score it.

CONTEXT: ${context}
DURATION: ${options.duration} seconds
${options.objectives ? `OBJECTIVES: ${options.objectives.join(', ')}` : ''}

TRANSCRIPT:
${transcript}

KEY INFO EXTRACTED:
${JSON.stringify(keyInfo, null, 2)}

Provide JSON response:
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
  "strengths": ["..."],
  "improvements": ["..."],
  "keyMoments": ["..."],
  "missedOpportunities": ["..."],
  "objectivesCompleted": ["..."],
  "bonusObjectivesCompleted": ["..."]
}

SCORING RULES:
- Short calls (<30s): Max score 15
- Short calls (<60s): Max score 30
- Incomplete discovery: Max score 50
- Missing commitment: Max score 70
`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are an expert sales coach scoring calls.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  })

  const analysis = JSON.parse(response.choices[0]?.message?.content || '{}')

  // Calculate XP
  const xpEarned = calculateXP(analysis, options.duration, context)

  return {
    overallScore: analysis.overallScore || 0,
    analysis,
    xpEarned,
  }
}

function calculateXP(
  analysis: any,
  duration: number,
  context: SessionContext
): number {
  const baseXP = Math.round(analysis.overallScore * 0.5) // 0-50 base
  const objectiveXP = (analysis.objectivesCompleted?.length || 0) * 25
  const bonusXP = (analysis.bonusObjectivesCompleted?.length || 0) * 50
  const durationBonus = duration > 300 ? 25 : duration > 120 ? 10 : 0

  let total = baseXP + objectiveXP + bonusXP + durationBonus

  // Practice gets slightly less XP than real calls
  if (context === 'practice') {
    total = Math.round(total * 0.8)
  }

  return total
}
```

---

## 1.4 Create API Adapter Layer

**New File:** `src/app/api/co-pilot/session/start/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SessionContext, CaptureMethod, UnifiedSession } from '@/lib/unified/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      context,
      captureMethod,
      meetingUrl,
      challengeId,
      personaId,
      userId,
    } = body as {
      context: SessionContext
      captureMethod?: CaptureMethod
      meetingUrl?: string
      challengeId?: string
      personaId?: string
      userId: string
    }

    // Validate required fields
    if (!context || !userId) {
      return NextResponse.json(
        { error: 'context and userId are required' },
        { status: 400 }
      )
    }

    // Create unified session
    const { data: session, error } = await supabase
      .from('co_pilot_sessions')
      .insert({
        user_id: userId,
        context,
        capture_method: captureMethod,
        meeting_url: meetingUrl,
        challenge_id: challengeId,
        persona_id: personaId,
        status: 'starting',
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[CoPilot] Session creation error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Return session with context-specific config
    const config = getContextConfig(context, { challengeId, personaId })

    return NextResponse.json({
      sessionId: session.id,
      session,
      config,
    })

  } catch (error) {
    console.error('[CoPilot] Start error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getContextConfig(
  context: SessionContext,
  options: { challengeId?: string; personaId?: string }
) {
  if (context === 'live_coaching') {
    return {
      analysisInterval: 3000,
      suggestionTypes: ['question', 'tip', 'objection', 'alert'],
      showScriptProgress: true,
      showKeyInfo: true,
    }
  }

  if (context === 'practice') {
    return {
      analysisInterval: 10000,
      suggestionTypes: ['tip', 'positive'],
      showObjectives: true,
      showPersonaMood: true,
      challengeId: options.challengeId,
      personaId: options.personaId,
    }
  }

  return {
    analysisInterval: 5000,
    suggestionTypes: ['tip'],
  }
}
```

---

# PHASE 2: UNIFIED API (Week 3-4)

## 2.1 Unified Analysis Endpoint

**New File:** `src/app/api/co-pilot/session/[id]/analyze/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  detectStage,
  extractKeyInfo,
  detectCurrentSection,
  generateSuggestion
} from '@/lib/unified/intelligence'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id
    const body = await request.json()
    const { transcripts } = body as { transcripts: { text: string; speaker?: number }[] }

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('co_pilot_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Build transcript
    const newTranscript = transcripts
      .map(t => `[Speaker ${t.speaker ?? 0}]: ${t.text}`)
      .join('\n')

    const fullTranscript = (session.transcript || '') + '\n' + newTranscript

    // Extract key info
    const keyInfo = extractKeyInfo(fullTranscript, session.key_info || {})

    // Detect stage and section
    const stage = detectStage(fullTranscript)
    const { section, confidence } = detectCurrentSection(
      fullTranscript,
      session.current_section
    )

    // Calculate progress
    const scriptProgress = calculateProgress(section)

    // Generate suggestion (if needed)
    const suggestion = await generateSuggestion(
      session.context,
      fullTranscript,
      keyInfo,
      [], // TODO: Load previous suggestions
      { scriptSection: section }
    )

    // Update session
    await supabase
      .from('co_pilot_sessions')
      .update({
        transcript: fullTranscript,
        key_info: keyInfo,
        current_section: section,
        script_progress: scriptProgress,
        status: 'active',
      })
      .eq('id', sessionId)

    // Save suggestion if generated
    if (suggestion) {
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

    return NextResponse.json({
      status: 'analyzed',
      stage,
      section,
      scriptProgress,
      keyInfo,
      suggestion,
    })

  } catch (error) {
    console.error('[CoPilot] Analyze error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateProgress(section: string): number {
  const sections = [
    'set_expectations', 'isolate_problem', 'background_questions',
    'current_situation', 'assess_efforts', 'chunking_down',
    'financial_qualifier', 'doubt_questions', 'solution_questions',
    'why_now', 'support_questions', 'desired_situation',
    'transition', 'pitch', 'commitment', 'onboarding', 'investment'
  ]
  const index = sections.indexOf(section)
  return index >= 0 ? Math.round((index / sections.length) * 100) : 0
}
```

---

## 2.2 Update Legacy Endpoints

**File:** `src/app/api/coaching/analyze-transcript/route.ts`

Add at the top of the file (after imports):

```typescript
// LEGACY ADAPTER: Routes to unified endpoint
// TODO: Remove after migration complete

const USE_UNIFIED = process.env.ENABLE_UNIFIED_COPILOT === 'true'

// In the POST function, add at the start:
if (USE_UNIFIED) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/co-pilot/session/${sessionId}/analyze`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcripts, methodology }),
    }
  )
  return response
}

// ... rest of existing code
```

---

# PHASE 3: EXTENSION INTEGRATION (Week 5-6)

## 3.1 Update Extension to Use Unified API

**File:** `chrome-extension/content.js`

Update the API calls to use unified endpoints:

```javascript
// Around line 739, in startCoaching():

// BEFORE:
chrome.runtime.sendMessage({
  type: 'START_COACHING',
  meetingUrl,
  userId,
  authToken
}, ...)

// AFTER (gradual migration):
const useUnified = await chrome.storage.local.get(['useUnifiedCopilot'])

if (useUnified.useUnifiedCopilot) {
  // Use new unified endpoint
  const response = await fetch(`${API_BASE}/api/co-pilot/session/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      context: 'live_coaching',
      captureMethod: 'tab_audio',
      meetingUrl,
      userId,
    })
  })

  const data = await response.json()
  session = { id: data.sessionId, ...data.session }
  // ... continue with session
} else {
  // Use legacy endpoint
  chrome.runtime.sendMessage({
    type: 'START_COACHING',
    meetingUrl,
    userId,
    authToken
  }, ...)
}
```

---

## 3.2 Add Session Type Selector to Popup

**File:** `chrome-extension/popup.html`

Add after the sign-in section:

```html
<!-- Session Type Selector -->
<div id="session-type-section" class="hidden">
  <h3>Session Type</h3>
  <div class="session-type-buttons">
    <button id="type-coaching" class="type-btn active">
      <span class="icon">🎯</span>
      <span class="label">Live Coaching</span>
      <span class="desc">Get coached on real calls</span>
    </button>
    <button id="type-practice" class="type-btn">
      <span class="icon">🎭</span>
      <span class="label">Practice</span>
      <span class="desc">Practice with AI</span>
    </button>
    <button id="type-analyze" class="type-btn">
      <span class="icon">📊</span>
      <span class="label">Analyze</span>
      <span class="desc">Review past calls</span>
    </button>
  </div>
</div>

<style>
.session-type-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.type-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
}

.type-btn.active {
  background: rgba(0, 255, 193, 0.1);
  border-color: rgba(0, 255, 193, 0.3);
}

.type-btn .icon {
  font-size: 24px;
}

.type-btn .label {
  font-weight: 600;
  color: #fff;
}

.type-btn .desc {
  font-size: 11px;
  color: #94a3b8;
}
</style>
```

---

# PHASE 4: PRACTICE ENHANCEMENTS (Week 7-8)

## 4.1 Add Script Progress to Practice

**File:** `src/app/practice/page.tsx`

Add to the callState:

```typescript
// Around line 105, add to CallState:
interface CallState {
  // ... existing fields
  scriptSection?: string
  scriptProgress?: number
  keyInfo?: KeyInfo
  coachingTip?: string
}

// In checkObjectivesRealTime (around line 350), update:
const result = await response.json()

setCallState(prev => ({
  ...prev,
  liveObjectivesCompleted: result.completedObjectives,
  scriptSection: result.scriptSection,      // NEW
  scriptProgress: result.scriptProgress,    // NEW
  keyInfo: result.keyInfo,                  // NEW
  coachingTip: result.coachingTip,          // NEW
}))
```

---

## 4.2 Add Adaptive Persona Difficulty

**File:** `src/app/api/practice/session/route.ts`

After line 60, add:

```typescript
// Get user's performance history for this persona
const { data: history } = await supabase
  .from('practice_sessions')
  .select('overall_score')
  .eq('user_id', user.id)
  .eq('persona_id', persona_id)
  .order('created_at', { ascending: false })
  .limit(5)

// Calculate adaptive difficulty
const avgScore = history?.length
  ? history.reduce((sum, s) => sum + (s.overall_score || 0), 0) / history.length
  : 50

let adaptiveDifficulty = 'medium'
if (avgScore > 80) adaptiveDifficulty = 'hard'
if (avgScore > 90) adaptiveDifficulty = 'expert'
if (avgScore < 40) adaptiveDifficulty = 'easy'

// Add to system prompt
const difficultyModifier = {
  easy: 'Be slightly easier to convince. Give more buying signals.',
  medium: 'Follow your normal personality.',
  hard: 'Be more skeptical. Raise more objections.',
  expert: 'Be very challenging. Require excellent technique to win over.',
}

// Inject into persona system prompt
const enhancedSystemPrompt = personaSystemPrompt + `

DIFFICULTY ADJUSTMENT (${adaptiveDifficulty}):
${difficultyModifier[adaptiveDifficulty]}
`
```

---

# PHASE 5: TESTING & MIGRATION (Week 9-10)

## 5.1 Integration Tests

**New File:** `src/tests/unified-copilot.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest'

describe('Unified Co-Pilot', () => {
  let sessionId: string

  describe('Session Creation', () => {
    it('creates coaching session', async () => {
      const response = await fetch('/api/co-pilot/session/start', {
        method: 'POST',
        body: JSON.stringify({
          context: 'live_coaching',
          userId: 'test-user',
          meetingUrl: 'https://zoom.us/j/123',
        }),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.sessionId).toBeDefined()
      sessionId = data.sessionId
    })

    it('creates practice session', async () => {
      const response = await fetch('/api/co-pilot/session/start', {
        method: 'POST',
        body: JSON.stringify({
          context: 'practice',
          userId: 'test-user',
          challengeId: 'cold-call-basic',
          personaId: 'skeptical-cfo',
        }),
      })

      expect(response.ok).toBe(true)
    })
  })

  describe('Transcript Analysis', () => {
    it('analyzes transcript and extracts key info', async () => {
      const response = await fetch(`/api/co-pilot/session/${sessionId}/analyze`, {
        method: 'POST',
        body: JSON.stringify({
          transcripts: [
            { text: 'Hi, thanks for taking my call', speaker: 0 },
            { text: 'Sure, what can I help you with?', speaker: 1 },
            { text: 'I wanted to discuss your CRM challenges. What are your biggest pain points?', speaker: 0 },
            { text: 'Our data quality is terrible. We have so many duplicates.', speaker: 1 },
          ],
        }),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()

      expect(data.keyInfo.painPoints).toContain('data quality')
      expect(data.stage).toBe('discovery')
    })
  })

  describe('Suggestion Generation', () => {
    it('generates contextual suggestions', async () => {
      // ... test suggestion generation
    })
  })

  describe('Backward Compatibility', () => {
    it('legacy coaching endpoint still works', async () => {
      const response = await fetch('/api/coaching/analyze-transcript', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          transcripts: [{ text: 'test', speaker: 0 }],
        }),
      })

      expect(response.ok).toBe(true)
    })
  })
})
```

---

## 5.2 Data Migration Script

**New File:** `scripts/migrate-to-unified.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function migrateCoachingSessions() {
  console.log('Migrating coaching sessions...')

  const { data: sessions, error } = await supabase
    .from('coaching_sessions')
    .select('*')

  if (error) throw error

  for (const session of sessions) {
    await supabase.from('co_pilot_sessions').insert({
      id: session.id,
      user_id: session.user_id,
      context: 'live_coaching',
      capture_method: session.bot_id ? 'recall_bot' : 'tab_audio',
      status: session.status,
      meeting_url: session.meeting_url,
      transcript: session.transcript,
      analysis: session.analysis,
      overall_score: session.overall_score,
      duration_seconds: session.duration_seconds,
      started_at: session.created_at,
      ended_at: session.ended_at,
      created_at: session.created_at,
      updated_at: session.updated_at,
    })
  }

  console.log(`Migrated ${sessions.length} coaching sessions`)
}

async function migratePracticeSessions() {
  console.log('Migrating practice sessions...')

  const { data: sessions, error } = await supabase
    .from('practice_sessions')
    .select('*')

  if (error) throw error

  for (const session of sessions) {
    await supabase.from('co_pilot_sessions').insert({
      id: session.id,
      user_id: session.user_id,
      context: 'practice',
      capture_method: 'vapi',
      status: session.status,
      challenge_id: session.challenge_id,
      persona_id: session.persona_id,
      transcript: session.transcript,
      analysis: session.analysis,
      overall_score: session.overall_score,
      xp_earned: session.xp_earned,
      xp_breakdown: session.xp_breakdown,
      objectives_completed: session.objectives_completed,
      bonus_objectives_completed: session.bonus_objectives_completed,
      duration_seconds: session.duration_seconds,
      started_at: session.started_at,
      ended_at: session.ended_at,
      created_at: session.created_at,
      updated_at: session.updated_at,
    })
  }

  console.log(`Migrated ${sessions.length} practice sessions`)
}

async function main() {
  try {
    await migrateCoachingSessions()
    await migratePracticeSessions()
    console.log('Migration complete!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

main()
```

**Run:**
```bash
npx tsx scripts/migrate-to-unified.ts
```

---

# ENVIRONMENT VARIABLES

Add to `.env.local`:

```env
# Unified Co-Pilot
ENABLE_UNIFIED_COPILOT=true
COPILOT_SUGGESTION_INTERVAL=3000
COPILOT_USE_MINI_MODEL=true
COPILOT_ENABLE_STREAMING=true

# Feature Flags
FEATURE_PRACTICE_COACHING_TIPS=true
FEATURE_ADAPTIVE_DIFFICULTY=true
FEATURE_REAL_CALL_ANALYSIS=false
```

---

# ROLLBACK PLAN

If issues occur after migration:

## 1. Disable Unified Endpoints
```env
ENABLE_UNIFIED_COPILOT=false
```

## 2. Restore Legacy Endpoints
The adapter pattern means legacy endpoints still work. Simply toggle the flag.

## 3. Data Recovery
Views (`coaching_sessions_unified`, `practice_sessions_unified`) allow reading unified data through old table structure.

## 4. Full Rollback
```sql
-- Only if needed: Drop unified tables
DROP TABLE IF EXISTS co_pilot_suggestions CASCADE;
DROP TABLE IF EXISTS co_pilot_sessions CASCADE;
```

---

# SUCCESS METRICS

Track these after each phase:

| Metric | Current | Phase 1 | Phase 5 |
|--------|---------|---------|---------|
| Coaching latency | 11-16s | 6-10s | 3-5s |
| Practice coaching tips | None | Basic | Full |
| API cost per call | $0.06 | $0.02 | $0.01 |
| Key info in practice | No | Yes | Yes |
| Unified leaderboard | No | No | Yes |
| User confusion rate | N/A | Measure | <5% |

---

# TIMELINE SUMMARY

```
WEEK 1:  Quick Wins (Days 1-5) ✓
         Foundation Types (Days 3-5) ✓

WEEK 2:  Database Migration
         Unified Intelligence Module

WEEK 3:  Unified API (Start)
         Legacy Adapters

WEEK 4:  Unified API (Complete)
         Extension Updates (Start)

WEEK 5:  Extension Updates (Complete)
         UI Integration (Start)

WEEK 6:  UI Integration (Complete)
         Practice Enhancements

WEEK 7:  Adaptive AI
         Script Progress in Practice

WEEK 8:  Integration Testing
         Bug Fixes

WEEK 9:  Data Migration
         A/B Testing Setup

WEEK 10: Full Launch
         Monitor & Iterate
```

---

# NEXT STEPS

1. **Immediate (Today):**
   - [ ] Implement Quick Win #1 (reduce batching)
   - [ ] Implement Quick Win #3 (use GPT-4o-mini)

2. **This Week:**
   - [ ] Create `src/lib/unified/types.ts`
   - [ ] Run database migration
   - [ ] Implement Quick Win #4 (coaching tips in practice)

3. **Next Week:**
   - [ ] Create unified intelligence module
   - [ ] Create `/api/co-pilot/session/start` endpoint
   - [ ] Create `/api/co-pilot/session/[id]/analyze` endpoint

4. **Review Points:**
   - End of Week 2: Foundation complete, quick wins shipped
   - End of Week 4: Unified API functional
   - End of Week 6: Extension using unified API
   - End of Week 8: All features working
   - End of Week 10: Migration complete, launch

---

*Document maintained by RevPilot Engineering Team*
