import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const FATHOM_API_BASE = 'https://api.fathom.ai/external/v1'

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured')
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

const SALES_ANALYSIS_PROMPT = `You are an expert sales coach analyzing a sales call transcript. Provide detailed, actionable feedback.

Analyze the following sales call transcript and provide feedback in the exact JSON format specified below. Be specific with examples from the transcript.

IMPORTANT: Return ONLY valid JSON, no additional text or markdown.

{
  "opening_rapport": {
    "score": <0-100>,
    "feedback": "<2-3 sentences about the opening and rapport building>",
    "highlights": ["<specific quote or moment from transcript>", "<another example>"]
  },
  "discovery_questions": {
    "score": <0-100>,
    "feedback": "<2-3 sentences about discovery questions asked>",
    "highlights": ["<good question asked>", "<another example>"]
  },
  "pain_identification": {
    "score": <0-100>,
    "feedback": "<2-3 sentences about how well pain points were identified>",
    "highlights": ["<pain point uncovered>", "<another example>"]
  },
  "value_proposition": {
    "score": <0-100>,
    "feedback": "<2-3 sentences about value proposition delivery>",
    "highlights": ["<value statement made>", "<another example>"]
  },
  "objection_handling": {
    "score": <0-100>,
    "feedback": "<2-3 sentences about objection handling>",
    "highlights": ["<objection handled>", "<another example>"]
  },
  "closing_techniques": {
    "score": <0-100>,
    "feedback": "<2-3 sentences about closing techniques used>",
    "highlights": ["<closing attempt>", "<another example>"]
  },
  "talk_listen_ratio": {
    "rep_percentage": <estimated % of time rep talked>,
    "prospect_percentage": <estimated % of time prospect talked>,
    "feedback": "<comment on the balance>"
  },
  "key_improvements": [
    "<specific actionable improvement 1>",
    "<specific actionable improvement 2>",
    "<specific actionable improvement 3>"
  ],
  "strengths": [
    "<strength 1>",
    "<strength 2>",
    "<strength 3>"
  ],
  "summary": "<2-3 sentence overall summary of the call performance>"
}

TRANSCRIPT:
`

export async function POST(request: NextRequest) {
  try {
    const { meetingId, userId, title } = await request.json()

    if (!meetingId || !userId) {
      return NextResponse.json({ error: 'Missing meetingId or userId' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user's Fathom API key
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('fathom_api_key')
      .eq('id', userId)
      .single()

    if (profileError || !profile?.fathom_api_key) {
      return NextResponse.json(
        { error: 'Fathom not connected' },
        { status: 400 }
      )
    }

    // Create a record in our database first
    const { data: recording, error: createError } = await supabase
      .from('call_recordings')
      .insert({
        user_id: userId,
        title: title || `Fathom Call ${meetingId}`,
        file_name: `fathom-${meetingId}`,
        file_url: `fathom://${meetingId}`,
        status: 'transcribing',
      })
      .select()
      .single()

    if (createError) {
      throw new Error('Failed to create recording record')
    }

    // Fetch transcript from Fathom API
    const transcriptResponse = await fetch(`${FATHOM_API_BASE}/recordings/${meetingId}/transcript`, {
      headers: {
        'X-Api-Key': profile.fathom_api_key,
        'Content-Type': 'application/json',
      },
    })

    if (!transcriptResponse.ok) {
      await supabase
        .from('call_recordings')
        .update({
          status: 'failed',
          error_message: 'Failed to fetch transcript from Fathom',
          updated_at: new Date().toISOString()
        })
        .eq('id', recording.id)

      return NextResponse.json(
        { error: 'Failed to fetch transcript from Fathom' },
        { status: 500 }
      )
    }

    const transcriptData = await transcriptResponse.json()

    // Extract transcript text - Fathom returns structured data
    // Format: { transcript: [{ speaker: { display_name: "Name" }, text: "...", timestamp: "..." }] }
    let transcript = ''
    if (transcriptData.transcript) {
      if (typeof transcriptData.transcript === 'string') {
        transcript = transcriptData.transcript
      } else if (Array.isArray(transcriptData.transcript)) {
        // Handle array of transcript segments from Fathom API
        transcript = transcriptData.transcript
          .map((seg: { speaker?: { display_name?: string } | string; text?: string }) => {
            // Handle both { speaker: { display_name: "..." } } and { speaker: "..." }
            const speakerName = typeof seg.speaker === 'object'
              ? seg.speaker?.display_name
              : seg.speaker
            return speakerName ? `${speakerName}: ${seg.text}` : seg.text
          })
          .filter(Boolean)
          .join('\n')
      }
    } else if (transcriptData.text) {
      transcript = transcriptData.text
    } else if (transcriptData.segments) {
      // Alternative format some versions use
      transcript = transcriptData.segments
        .map((seg: { speaker?: string; text?: string }) =>
          seg.speaker ? `${seg.speaker}: ${seg.text}` : seg.text
        )
        .filter(Boolean)
        .join('\n')
    } else {
      transcript = JSON.stringify(transcriptData)
    }

    // Update status to analyzing
    await supabase
      .from('call_recordings')
      .update({
        status: 'analyzing',
        transcript,
        updated_at: new Date().toISOString()
      })
      .eq('id', recording.id)

    // Analyze with GPT-4
    let analysis
    try {
      const openai = getOpenAIClient()
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert sales coach. Return only valid JSON, no markdown or additional text.'
          },
          {
            role: 'user',
            content: SALES_ANALYSIS_PROMPT + transcript
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      })

      const responseText = completion.choices[0]?.message?.content || ''
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()

      analysis = JSON.parse(cleanedResponse)
    } catch (analysisError) {
      console.error('Analysis error:', analysisError)
      await supabase
        .from('call_recordings')
        .update({
          status: 'failed',
          error_message: 'Failed to analyze transcript',
          updated_at: new Date().toISOString()
        })
        .eq('id', recording.id)

      return NextResponse.json(
        { error: 'Failed to analyze transcript' },
        { status: 500 }
      )
    }

    // Calculate overall score
    const scores = [
      analysis.opening_rapport?.score || 0,
      analysis.discovery_questions?.score || 0,
      analysis.pain_identification?.score || 0,
      analysis.value_proposition?.score || 0,
      analysis.objection_handling?.score || 0,
      analysis.closing_techniques?.score || 0,
    ]
    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)

    // Update with final results
    await supabase
      .from('call_recordings')
      .update({
        status: 'completed',
        transcript,
        analysis,
        overall_score: overallScore,
        updated_at: new Date().toISOString()
      })
      .eq('id', recording.id)

    return NextResponse.json({
      success: true,
      recordingId: recording.id,
      transcript,
      analysis,
      overall_score: overallScore
    })

  } catch (error) {
    console.error('Fathom transcript API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
