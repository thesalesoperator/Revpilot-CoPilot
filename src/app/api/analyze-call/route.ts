import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

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
    const { recordingId, userId } = await request.json()

    if (!recordingId || !userId) {
      return NextResponse.json(
        { error: 'Missing recordingId or userId' },
        { status: 400 }
      )
    }

    // Create admin Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the recording
    const { data: recording, error: fetchError } = await supabase
      .from('call_recordings')
      .select('*')
      .eq('id', recordingId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !recording) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      )
    }

    // Update status to transcribing
    await supabase
      .from('call_recordings')
      .update({ status: 'transcribing', updated_at: new Date().toISOString() })
      .eq('id', recordingId)

    // Download the audio file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('Call_Recordings')
      .download(recording.file_url)

    if (downloadError || !fileData) {
      await supabase
        .from('call_recordings')
        .update({
          status: 'failed',
          error_message: 'Failed to download audio file',
          updated_at: new Date().toISOString()
        })
        .eq('id', recordingId)

      return NextResponse.json(
        { error: 'Failed to download audio file' },
        { status: 500 }
      )
    }

    // Convert Blob to File for OpenAI
    const file = new File([fileData], recording.file_name, { type: fileData.type })

    // Transcribe with Whisper
    let transcript: string
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        response_format: 'text',
      })
      transcript = transcription
    } catch (whisperError) {
      console.error('Whisper error:', whisperError)
      await supabase
        .from('call_recordings')
        .update({
          status: 'failed',
          error_message: 'Failed to transcribe audio',
          updated_at: new Date().toISOString()
        })
        .eq('id', recordingId)

      return NextResponse.json(
        { error: 'Failed to transcribe audio' },
        { status: 500 }
      )
    }

    // Update status to analyzing
    await supabase
      .from('call_recordings')
      .update({
        status: 'analyzing',
        transcript,
        updated_at: new Date().toISOString()
      })
      .eq('id', recordingId)

    // Analyze with GPT-4
    let analysis
    try {
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
      // Clean the response - remove markdown code blocks if present
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
        .eq('id', recordingId)

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
      .eq('id', recordingId)

    return NextResponse.json({
      success: true,
      transcript,
      analysis,
      overall_score: overallScore
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
