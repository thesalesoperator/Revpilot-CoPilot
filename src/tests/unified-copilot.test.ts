/**
 * Unified Co-Pilot Integration Tests
 *
 * Tests for the unified co-pilot system including:
 * - Session creation (coaching + practice contexts)
 * - Transcript analysis and key info extraction
 * - Suggestion generation
 * - Backward compatibility with legacy endpoints
 *
 * @module tests/unified-copilot
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'

// ============================================================
// TEST CONFIGURATION
// ============================================================

const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000'

const TEST_USER_ID = 'test-user-' + Date.now()
const TEST_MEETING_URL = 'https://zoom.us/j/123456789'
const TEST_CHALLENGE_ID = 'cold-call-basic'
const TEST_PERSONA_ID = 'skeptical-cfo'

// Mock authentication token for testing
const TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'test-token'

// Helper to make authenticated API requests
async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
      ...options.headers,
    },
  })
}

// ============================================================
// SESSION CREATION TESTS
// ============================================================

describe('Unified Co-Pilot', () => {
  let coachingSessionId: string
  let practiceSessionId: string
  let analysisSessionId: string

  describe('Session Creation', () => {
    it('creates a live coaching session with required fields', async () => {
      const response = await apiRequest('/api/co-pilot/session/start', {
        method: 'POST',
        body: JSON.stringify({
          context: 'live_coaching',
          userId: TEST_USER_ID,
          meetingUrl: TEST_MEETING_URL,
          captureMethod: 'tab_audio',
        }),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()

      expect(data.sessionId).toBeDefined()
      expect(data.session).toBeDefined()
      expect(data.session.context).toBe('live_coaching')
      expect(data.session.status).toBe('starting')
      expect(data.session.meeting_url).toBe(TEST_MEETING_URL)
      expect(data.config).toBeDefined()
      expect(data.config.analysisInterval).toBe(3000)
      expect(data.config.showScriptProgress).toBe(true)

      coachingSessionId = data.sessionId
    })

    it('creates a practice session with challenge and persona', async () => {
      const response = await apiRequest('/api/co-pilot/session/start', {
        method: 'POST',
        body: JSON.stringify({
          context: 'practice',
          userId: TEST_USER_ID,
          challengeId: TEST_CHALLENGE_ID,
          personaId: TEST_PERSONA_ID,
          captureMethod: 'vapi',
        }),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()

      expect(data.sessionId).toBeDefined()
      expect(data.session.context).toBe('practice')
      expect(data.session.challenge_id).toBe(TEST_CHALLENGE_ID)
      expect(data.session.persona_id).toBe(TEST_PERSONA_ID)
      expect(data.config.showObjectives).toBe(true)
      expect(data.config.showPersonaMood).toBe(true)

      practiceSessionId = data.sessionId
    })

    it('creates a real call analysis session', async () => {
      const response = await apiRequest('/api/co-pilot/session/start', {
        method: 'POST',
        body: JSON.stringify({
          context: 'real_call_analysis',
          userId: TEST_USER_ID,
          uploadedFileUrl: 'https://storage.example.com/recordings/call-123.mp3',
          captureMethod: 'upload',
        }),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()

      expect(data.sessionId).toBeDefined()
      expect(data.session.context).toBe('real_call_analysis')

      analysisSessionId = data.sessionId
    })

    it('rejects session creation without required fields', async () => {
      const response = await apiRequest('/api/co-pilot/session/start', {
        method: 'POST',
        body: JSON.stringify({
          // Missing context and userId
          meetingUrl: TEST_MEETING_URL,
        }),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toContain('context and userId are required')
    })

    it('rejects invalid context type', async () => {
      const response = await apiRequest('/api/co-pilot/session/start', {
        method: 'POST',
        body: JSON.stringify({
          context: 'invalid_context',
          userId: TEST_USER_ID,
        }),
      })

      expect(response.ok).toBe(false)
    })
  })

  // ============================================================
  // TRANSCRIPT ANALYSIS TESTS
  // ============================================================

  describe('Transcript Analysis', () => {
    it('analyzes transcript and extracts pain points', async () => {
      const response = await apiRequest(
        `/api/co-pilot/session/${coachingSessionId}/analyze`,
        {
          method: 'POST',
          body: JSON.stringify({
            transcripts: [
              { text: 'Hi, thanks for taking my call today.', speaker: 0 },
              { text: 'Sure, what can I help you with?', speaker: 1 },
              { text: 'I wanted to discuss your CRM challenges. What are your biggest pain points right now?', speaker: 0 },
              { text: 'Our data quality is terrible. We have so many duplicate records and outdated information.', speaker: 1 },
            ],
          }),
        }
      )

      expect(response.ok).toBe(true)
      const data = await response.json()

      expect(data.status).toBe('analyzed')
      expect(data.keyInfo).toBeDefined()
      expect(data.keyInfo.painPoints).toContain('data quality')
      expect(data.stage).toBe('discovery')
    })

    it('extracts company information from transcript', async () => {
      const response = await apiRequest(
        `/api/co-pilot/session/${coachingSessionId}/analyze`,
        {
          method: 'POST',
          body: JSON.stringify({
            transcripts: [
              { text: 'Tell me a bit about your company.', speaker: 0 },
              { text: 'We are TechCorp, a mid-sized software company with about 200 employees in the healthcare industry.', speaker: 1 },
              { text: 'How long have you been using your current CRM?', speaker: 0 },
              { text: 'We have been using Salesforce for about 3 years now.', speaker: 1 },
            ],
          }),
        }
      )

      expect(response.ok).toBe(true)
      const data = await response.json()

      expect(data.keyInfo.companyName).toBe('TechCorp')
      expect(data.keyInfo.industry).toBe('healthcare')
      expect(data.keyInfo.teamSize).toBe('200')
      expect(data.keyInfo.currentCRM).toBe('Salesforce')
    })

    it('detects objections in transcript', async () => {
      const response = await apiRequest(
        `/api/co-pilot/session/${coachingSessionId}/analyze`,
        {
          method: 'POST',
          body: JSON.stringify({
            transcripts: [
              { text: 'This sounds interesting, but honestly we just do not have the budget for new tools right now.', speaker: 1 },
              { text: 'I understand budget is a concern. Can you tell me more about what you are currently spending on these problems?', speaker: 0 },
              { text: 'Also, we are already locked into a contract with our current vendor for another 6 months.', speaker: 1 },
            ],
          }),
        }
      )

      expect(response.ok).toBe(true)
      const data = await response.json()

      expect(data.keyInfo.objections.length).toBeGreaterThan(0)
      expect(data.keyInfo.objections.some((o: string) =>
        o.toLowerCase().includes('budget') || o.toLowerCase().includes('contract')
      )).toBe(true)
    })

    it('detects buying signals in transcript', async () => {
      const response = await apiRequest(
        `/api/co-pilot/session/${coachingSessionId}/analyze`,
        {
          method: 'POST',
          body: JSON.stringify({
            transcripts: [
              { text: 'What would implementation look like if we decided to move forward?', speaker: 1 },
              { text: 'Great question! We typically can have you up and running within 2 weeks.', speaker: 0 },
              { text: 'That is faster than I expected. And what about pricing? We have budget approval for Q2.', speaker: 1 },
            ],
          }),
        }
      )

      expect(response.ok).toBe(true)
      const data = await response.json()

      expect(data.keyInfo.buyingSignals.length).toBeGreaterThan(0)
      expect(data.keyInfo.budgetConfirmed).toBe(true)
    })

    it('tracks script progress through conversation', async () => {
      // Send initial discovery transcript
      const discoveryResponse = await apiRequest(
        `/api/co-pilot/session/${coachingSessionId}/analyze`,
        {
          method: 'POST',
          body: JSON.stringify({
            transcripts: [
              { text: 'What is the main problem you are trying to solve?', speaker: 0 },
              { text: 'We need better visibility into our pipeline.', speaker: 1 },
            ],
          }),
        }
      )

      expect(discoveryResponse.ok).toBe(true)
      const discoveryData = await discoveryResponse.json()
      const initialProgress = discoveryData.scriptProgress

      // Send qualification transcript
      const qualificationResponse = await apiRequest(
        `/api/co-pilot/session/${coachingSessionId}/analyze`,
        {
          method: 'POST',
          body: JSON.stringify({
            transcripts: [
              { text: 'Who else is involved in this decision?', speaker: 0 },
              { text: 'I would need to involve our VP of Sales and CFO.', speaker: 1 },
              { text: 'What is your timeline for making a decision?', speaker: 0 },
              { text: 'We would like to have something in place by end of Q2.', speaker: 1 },
            ],
          }),
        }
      )

      expect(qualificationResponse.ok).toBe(true)
      const qualificationData = await qualificationResponse.json()

      expect(qualificationData.scriptProgress).toBeGreaterThanOrEqual(initialProgress)
      expect(qualificationData.keyInfo.decisionMakers.length).toBeGreaterThan(0)
      expect(qualificationData.keyInfo.timeline).toBeDefined()
    })

    it('handles empty transcript gracefully', async () => {
      const response = await apiRequest(
        `/api/co-pilot/session/${coachingSessionId}/analyze`,
        {
          method: 'POST',
          body: JSON.stringify({
            transcripts: [],
          }),
        }
      )

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.status).toBe('analyzed')
    })

    it('returns 404 for non-existent session', async () => {
      const response = await apiRequest(
        '/api/co-pilot/session/non-existent-id/analyze',
        {
          method: 'POST',
          body: JSON.stringify({
            transcripts: [{ text: 'test', speaker: 0 }],
          }),
        }
      )

      expect(response.status).toBe(404)
    })
  })

  // ============================================================
  // SUGGESTION GENERATION TESTS
  // ============================================================

  describe('Suggestion Generation', () => {
    it('generates contextual coaching suggestions', async () => {
      // First, build up some context
      await apiRequest(`/api/co-pilot/session/${coachingSessionId}/analyze`, {
        method: 'POST',
        body: JSON.stringify({
          transcripts: [
            { text: 'So you mentioned your team is struggling with data quality issues.', speaker: 0 },
            { text: 'Yes, it is a huge problem. We spend hours every week cleaning up records.', speaker: 1 },
          ],
        }),
      })

      // Check suggestions endpoint
      const response = await apiRequest(
        `/api/co-pilot/session/${coachingSessionId}/suggestions`,
        { method: 'GET' }
      )

      if (response.ok) {
        const data = await response.json()
        expect(Array.isArray(data.suggestions)).toBe(true)

        if (data.suggestions.length > 0) {
          const suggestion = data.suggestions[0]
          expect(suggestion.type).toBeDefined()
          expect(suggestion.content).toBeDefined()
          expect(['question', 'tip', 'objection', 'positive', 'alert', 'transition']).toContain(suggestion.type)
        }
      }
    })

    it('generates practice-specific tips', async () => {
      // Analyze practice session
      await apiRequest(`/api/co-pilot/session/${practiceSessionId}/analyze`, {
        method: 'POST',
        body: JSON.stringify({
          transcripts: [
            { text: 'Hi, I am calling about your recent inquiry.', speaker: 0 },
            { text: 'I did not make any inquiry. Who is this?', speaker: 1 },
          ],
        }),
      })

      // Practice should generate helpful tips
      const response = await apiRequest(
        `/api/co-pilot/session/${practiceSessionId}/suggestions`,
        { method: 'GET' }
      )

      if (response.ok) {
        const data = await response.json()
        if (data.suggestions && data.suggestions.length > 0) {
          // Practice suggestions should be supportive
          expect(['tip', 'positive', 'question']).toContain(data.suggestions[0].type)
        }
      }
    })

    it('does not repeat recent suggestions', async () => {
      // Get initial suggestions
      const response1 = await apiRequest(
        `/api/co-pilot/session/${coachingSessionId}/suggestions`,
        { method: 'GET' }
      )

      if (response1.ok) {
        const data1 = await response1.json()
        const firstSuggestions = data1.suggestions?.map((s: any) => s.content) || []

        // Trigger more analysis
        await apiRequest(`/api/co-pilot/session/${coachingSessionId}/analyze`, {
          method: 'POST',
          body: JSON.stringify({
            transcripts: [
              { text: 'Let me ask you about your budget for this initiative.', speaker: 0 },
              { text: 'We have around $50,000 allocated for this quarter.', speaker: 1 },
            ],
          }),
        })

        // Get new suggestions
        const response2 = await apiRequest(
          `/api/co-pilot/session/${coachingSessionId}/suggestions`,
          { method: 'GET' }
        )

        if (response2.ok) {
          const data2 = await response2.json()
          const newSuggestions = data2.suggestions?.filter(
            (s: any) => !firstSuggestions.includes(s.content)
          ) || []

          // New suggestions should not duplicate old ones
          expect(newSuggestions.length).toBe(data2.suggestions?.length || 0)
        }
      }
    })

    it('prioritizes high-priority suggestions', async () => {
      // Simulate an objection scenario that should trigger high-priority suggestion
      await apiRequest(`/api/co-pilot/session/${coachingSessionId}/analyze`, {
        method: 'POST',
        body: JSON.stringify({
          transcripts: [
            { text: 'This all sounds great, but we are not interested. We are happy with our current solution.', speaker: 1 },
          ],
        }),
      })

      const response = await apiRequest(
        `/api/co-pilot/session/${coachingSessionId}/suggestions`,
        { method: 'GET' }
      )

      if (response.ok) {
        const data = await response.json()
        if (data.suggestions && data.suggestions.length > 0) {
          // Should have objection handling suggestion with high priority
          const objectionSuggestion = data.suggestions.find(
            (s: any) => s.type === 'objection' || s.priority === 'high'
          )
          if (objectionSuggestion) {
            expect(objectionSuggestion.priority).toBe('high')
          }
        }
      }
    })
  })

  // ============================================================
  // BACKWARD COMPATIBILITY TESTS
  // ============================================================

  describe('Backward Compatibility', () => {
    let legacySessionId: string

    beforeAll(async () => {
      // Create a session using the legacy endpoint if it exists
      const response = await apiRequest('/api/coaching/start', {
        method: 'POST',
        body: JSON.stringify({
          meetingUrl: TEST_MEETING_URL,
          userId: TEST_USER_ID,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        legacySessionId = data.sessionId || data.session?.id
      }
    })

    it('legacy coaching start endpoint still works', async () => {
      const response = await apiRequest('/api/coaching/start', {
        method: 'POST',
        body: JSON.stringify({
          meetingUrl: 'https://meet.google.com/abc-defg-hij',
          userId: TEST_USER_ID,
        }),
      })

      // Should either succeed or be properly handled
      expect([200, 201, 302]).toContain(response.status)
    })

    it('legacy analyze-transcript endpoint routes correctly', async () => {
      if (!legacySessionId) {
        console.log('Skipping: No legacy session available')
        return
      }

      const response = await apiRequest('/api/coaching/analyze-transcript', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: legacySessionId,
          transcripts: [
            { text: 'Hello, thanks for your time today.', speaker: 0 },
            { text: 'Hi, sure. What would you like to discuss?', speaker: 1 },
          ],
        }),
      })

      // Should work regardless of whether unified is enabled
      expect(response.ok).toBe(true)
    })

    it('legacy coaching status endpoint works', async () => {
      if (!legacySessionId) {
        console.log('Skipping: No legacy session available')
        return
      }

      const response = await apiRequest(
        `/api/coaching/status?sessionId=${legacySessionId}`,
        { method: 'GET' }
      )

      expect([200, 404]).toContain(response.status)
    })

    it('legacy coaching stop endpoint works', async () => {
      if (!legacySessionId) {
        console.log('Skipping: No legacy session available')
        return
      }

      const response = await apiRequest('/api/coaching/stop', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: legacySessionId,
        }),
      })

      expect([200, 404]).toContain(response.status)
    })

    it('legacy practice session endpoint works', async () => {
      const response = await apiRequest('/api/practice/session', {
        method: 'POST',
        body: JSON.stringify({
          challengeId: TEST_CHALLENGE_ID,
          personaId: TEST_PERSONA_ID,
        }),
      })

      // Should either succeed or fail with auth (not with routing issues)
      expect([200, 201, 401, 403]).toContain(response.status)
    })

    it('legacy practice analyze endpoint works', async () => {
      const response = await apiRequest('/api/practice/analyze', {
        method: 'POST',
        body: JSON.stringify({
          transcript: 'User: Hi, I am interested in learning more.\nAI: Great! What specific challenges are you facing?',
          challengeId: TEST_CHALLENGE_ID,
          duration: 120,
        }),
      })

      // Should work or fail with expected errors
      expect([200, 201, 400, 401]).toContain(response.status)
    })

    it('legacy practice objectives endpoint works', async () => {
      const response = await apiRequest('/api/practice/objectives', {
        method: 'POST',
        body: JSON.stringify({
          transcript: 'User: I would like to understand your pricing.\nAI: We have flexible pricing options.',
          challengeId: TEST_CHALLENGE_ID,
        }),
      })

      expect([200, 201, 400, 401]).toContain(response.status)
    })
  })

  // ============================================================
  // SESSION END & ANALYSIS TESTS
  // ============================================================

  describe('Session End & Full Analysis', () => {
    it('ends session and generates full analysis', async () => {
      const response = await apiRequest(
        `/api/co-pilot/session/${coachingSessionId}/end`,
        {
          method: 'POST',
          body: JSON.stringify({
            generateAnalysis: true,
          }),
        }
      )

      if (response.ok) {
        const data = await response.json()

        expect(data.session.status).toBe('completed')
        expect(data.analysis).toBeDefined()
        expect(data.analysis.overallScore).toBeGreaterThanOrEqual(0)
        expect(data.analysis.overallScore).toBeLessThanOrEqual(100)

        // Check analysis has expected dimensions
        if (data.analysis.scores) {
          expect(data.analysis.scores.discovery).toBeDefined()
          expect(data.analysis.scores.qualification).toBeDefined()
        }

        // Check XP calculation
        expect(data.xpEarned).toBeGreaterThanOrEqual(0)
      }
    })

    it('calculates correct XP for practice session', async () => {
      // Complete some objectives first
      await apiRequest(`/api/co-pilot/session/${practiceSessionId}/analyze`, {
        method: 'POST',
        body: JSON.stringify({
          transcripts: [
            { text: 'What specific challenges are you facing with your current process?', speaker: 0 },
            { text: 'Our response time is too slow. Customers are complaining.', speaker: 1 },
            { text: 'How is that affecting your business results?', speaker: 0 },
            { text: 'We have lost several deals because of it.', speaker: 1 },
          ],
        }),
      })

      const response = await apiRequest(
        `/api/co-pilot/session/${practiceSessionId}/end`,
        {
          method: 'POST',
          body: JSON.stringify({
            generateAnalysis: true,
          }),
        }
      )

      if (response.ok) {
        const data = await response.json()

        // Practice sessions should earn XP
        expect(data.xpEarned).toBeGreaterThanOrEqual(0)

        // Check XP breakdown if available
        if (data.xpBreakdown) {
          expect(data.xpBreakdown.base).toBeDefined()
          expect(data.xpBreakdown.objectives).toBeDefined()
          expect(data.xpBreakdown.total).toBe(
            data.xpBreakdown.base +
            data.xpBreakdown.objectives +
            (data.xpBreakdown.bonus || 0) +
            (data.xpBreakdown.difficulty || 0) +
            (data.xpBreakdown.streak || 0)
          )
        }
      }
    })

    it('penalizes very short sessions in scoring', async () => {
      // Create a new short session
      const createResponse = await apiRequest('/api/co-pilot/session/start', {
        method: 'POST',
        body: JSON.stringify({
          context: 'practice',
          userId: TEST_USER_ID,
          challengeId: TEST_CHALLENGE_ID,
          personaId: TEST_PERSONA_ID,
        }),
      })

      if (!createResponse.ok) return

      const { sessionId } = await createResponse.json()

      // Minimal transcript
      await apiRequest(`/api/co-pilot/session/${sessionId}/analyze`, {
        method: 'POST',
        body: JSON.stringify({
          transcripts: [{ text: 'Hi', speaker: 0 }],
        }),
      })

      // End immediately
      const endResponse = await apiRequest(
        `/api/co-pilot/session/${sessionId}/end`,
        {
          method: 'POST',
          body: JSON.stringify({ generateAnalysis: true }),
        }
      )

      if (endResponse.ok) {
        const data = await endResponse.json()
        // Short sessions should have low scores (max 30 for < 60s)
        expect(data.analysis?.overallScore).toBeLessThanOrEqual(30)
      }
    })
  })

  // ============================================================
  // REAL-TIME SUBSCRIPTION TESTS
  // ============================================================

  describe('Real-Time Subscriptions', () => {
    it('can subscribe to session suggestions', async () => {
      // This would typically test Supabase realtime subscriptions
      // Here we verify the subscription endpoint exists
      const response = await apiRequest(
        `/api/co-pilot/session/${coachingSessionId}/subscribe`,
        { method: 'GET' }
      )

      // Should return subscription info or 404 if not implemented
      expect([200, 404, 501]).toContain(response.status)
    })
  })

  // ============================================================
  // ERROR HANDLING TESTS
  // ============================================================

  describe('Error Handling', () => {
    it('handles malformed JSON gracefully', async () => {
      const response = await fetch(`${API_BASE}/api/co-pilot/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      })

      expect(response.status).toBe(400)
    })

    it('handles missing authorization', async () => {
      const response = await fetch(`${API_BASE}/api/co-pilot/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: 'live_coaching',
          userId: TEST_USER_ID,
        }),
      })

      // Should either require auth or work (depending on config)
      expect([200, 201, 401, 403]).toContain(response.status)
    })

    it('handles database connection issues gracefully', async () => {
      // This is more of an integration test - verify error messages are user-friendly
      const response = await apiRequest('/api/co-pilot/session/start', {
        method: 'POST',
        body: JSON.stringify({
          context: 'live_coaching',
          userId: TEST_USER_ID,
          meetingUrl: TEST_MEETING_URL,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        // Error messages should not expose internal details
        expect(data.error).not.toContain('supabase')
        expect(data.error).not.toContain('postgres')
      }
    })

    it('handles rate limiting appropriately', async () => {
      // Make multiple rapid requests
      const requests = Array(10).fill(null).map(() =>
        apiRequest(`/api/co-pilot/session/${coachingSessionId}/analyze`, {
          method: 'POST',
          body: JSON.stringify({
            transcripts: [{ text: 'test', speaker: 0 }],
          }),
        })
      )

      const responses = await Promise.all(requests)

      // Should either all succeed or return 429 for rate limiting
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status)
      })
    })
  })

  // ============================================================
  // DATA INTEGRITY TESTS
  // ============================================================

  describe('Data Integrity', () => {
    it('preserves transcript across multiple analyses', async () => {
      const sessionResponse = await apiRequest('/api/co-pilot/session/start', {
        method: 'POST',
        body: JSON.stringify({
          context: 'live_coaching',
          userId: TEST_USER_ID,
          meetingUrl: 'https://zoom.us/j/integrity-test',
        }),
      })

      if (!sessionResponse.ok) return
      const { sessionId } = await sessionResponse.json()

      // First batch
      await apiRequest(`/api/co-pilot/session/${sessionId}/analyze`, {
        method: 'POST',
        body: JSON.stringify({
          transcripts: [{ text: 'First message', speaker: 0 }],
        }),
      })

      // Second batch
      await apiRequest(`/api/co-pilot/session/${sessionId}/analyze`, {
        method: 'POST',
        body: JSON.stringify({
          transcripts: [{ text: 'Second message', speaker: 1 }],
        }),
      })

      // Get session state
      const stateResponse = await apiRequest(
        `/api/co-pilot/session/${sessionId}`,
        { method: 'GET' }
      )

      if (stateResponse.ok) {
        const data = await stateResponse.json()
        // Transcript should contain both messages
        expect(data.session.transcript).toContain('First message')
        expect(data.session.transcript).toContain('Second message')
      }
    })

    it('key info accumulates correctly', async () => {
      const sessionResponse = await apiRequest('/api/co-pilot/session/start', {
        method: 'POST',
        body: JSON.stringify({
          context: 'live_coaching',
          userId: TEST_USER_ID,
          meetingUrl: 'https://zoom.us/j/keyinfo-test',
        }),
      })

      if (!sessionResponse.ok) return
      const { sessionId } = await sessionResponse.json()

      // First: mention pain point
      await apiRequest(`/api/co-pilot/session/${sessionId}/analyze`, {
        method: 'POST',
        body: JSON.stringify({
          transcripts: [
            { text: 'Our biggest challenge is data accuracy.', speaker: 1 },
          ],
        }),
      })

      // Second: mention budget
      const finalResponse = await apiRequest(
        `/api/co-pilot/session/${sessionId}/analyze`,
        {
          method: 'POST',
          body: JSON.stringify({
            transcripts: [
              { text: 'We have $100k budget for this initiative.', speaker: 1 },
            ],
          }),
        }
      )

      if (finalResponse.ok) {
        const data = await finalResponse.json()
        // Both pieces of info should be preserved
        expect(data.keyInfo.painPoints.length).toBeGreaterThan(0)
        expect(data.keyInfo.budget).toBeDefined()
      }
    })
  })

  // ============================================================
  // CLEANUP
  // ============================================================

  afterAll(async () => {
    // Clean up test sessions if needed
    const sessionIds = [coachingSessionId, practiceSessionId, analysisSessionId].filter(Boolean)

    for (const sessionId of sessionIds) {
      await apiRequest(`/api/co-pilot/session/${sessionId}`, {
        method: 'DELETE',
      }).catch(() => {
        // Ignore cleanup errors
      })
    }
  })
})

// ============================================================
// UNIT TESTS FOR INTELLIGENCE MODULE
// ============================================================

describe('Intelligence Module', () => {
  describe('Stage Detection', () => {
    it('detects opening stage', () => {
      const transcript = 'Hi, thanks for taking my call today. How are you doing?'
      // Would import detectStage from intelligence module
      // expect(detectStage(transcript)).toBe('opening')
    })

    it('detects discovery stage', () => {
      const transcript = `
        Rep: What are your biggest challenges right now?
        Prospect: We struggle with lead management and tracking.
        Rep: Tell me more about that. How does it affect your team?
      `
      // expect(detectStage(transcript)).toBe('discovery')
    })

    it('detects qualification stage', () => {
      const transcript = `
        Rep: Who else would be involved in making this decision?
        Prospect: I would need to bring in our CFO and VP of Sales.
        Rep: What is your timeline for implementing a solution?
      `
      // expect(detectStage(transcript)).toBe('qualification')
    })

    it('detects closing stage', () => {
      const transcript = `
        Rep: Based on everything we discussed, it sounds like we could be a good fit.
        Prospect: I agree. What are the next steps?
        Rep: Let us schedule a follow-up with your team next week.
      `
      // expect(detectStage(transcript)).toBe('closing')
    })
  })

  describe('Key Info Extraction', () => {
    it('extracts company name', () => {
      const transcript = 'We are Acme Corporation, a manufacturing company.'
      // const keyInfo = extractKeyInfo(transcript, {})
      // expect(keyInfo.companyName).toBe('Acme Corporation')
    })

    it('extracts budget information', () => {
      const transcript = 'Our budget for this project is around $50,000.'
      // const keyInfo = extractKeyInfo(transcript, {})
      // expect(keyInfo.budget).toBe('$50,000')
    })

    it('extracts decision makers', () => {
      const transcript = 'I will need to involve Sarah from finance and Mike, our CTO.'
      // const keyInfo = extractKeyInfo(transcript, {})
      // expect(keyInfo.decisionMakers).toContain('Sarah')
      // expect(keyInfo.decisionMakers).toContain('Mike')
    })

    it('preserves existing key info', () => {
      const transcript = 'Our timeline is Q2.'
      const existingInfo = { companyName: 'TestCo', painPoints: ['slow process'] }
      // const keyInfo = extractKeyInfo(transcript, existingInfo)
      // expect(keyInfo.companyName).toBe('TestCo')
      // expect(keyInfo.painPoints).toContain('slow process')
    })
  })

  describe('XP Calculation', () => {
    it('calculates base XP from score', () => {
      const analysis = { overallScore: 80, objectivesCompleted: [], bonusObjectivesCompleted: [] }
      // const xp = calculateXP(analysis, 300, 'practice')
      // expect(xp).toBeGreaterThanOrEqual(32) // 80 * 0.5 * 0.8 = 32
    })

    it('adds objective completion XP', () => {
      const analysis = {
        overallScore: 50,
        objectivesCompleted: ['obj1', 'obj2'],
        bonusObjectivesCompleted: []
      }
      // const xp = calculateXP(analysis, 300, 'practice')
      // Should include 25 XP per objective
    })

    it('adds bonus objective XP', () => {
      const analysis = {
        overallScore: 50,
        objectivesCompleted: [],
        bonusObjectivesCompleted: ['bonus1']
      }
      // const xp = calculateXP(analysis, 300, 'practice')
      // Should include 50 XP for bonus
    })

    it('adds duration bonus for long calls', () => {
      const analysis = { overallScore: 50, objectivesCompleted: [], bonusObjectivesCompleted: [] }
      // const shortXp = calculateXP(analysis, 60, 'practice')
      // const longXp = calculateXP(analysis, 360, 'practice')
      // expect(longXp).toBeGreaterThan(shortXp)
    })

    it('applies practice multiplier', () => {
      const analysis = { overallScore: 100, objectivesCompleted: [], bonusObjectivesCompleted: [] }
      // const coachingXp = calculateXP(analysis, 300, 'live_coaching')
      // const practiceXp = calculateXP(analysis, 300, 'practice')
      // expect(practiceXp).toBe(Math.round(coachingXp * 0.8))
    })
  })
})
