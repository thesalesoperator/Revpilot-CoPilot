import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  SUPABASE_ANON_KEY,
  DEEPGRAM_API_KEY,
  CORS_HEADERS,
} from '@/lib/coaching/config'

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

/**
 * Fallback endpoint for transcribing audio chunks when direct Deepgram connection fails.
 * Receives audio blobs from the extension and sends them to Deepgram's pre-recorded API.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify auth token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - no token provided' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const token = authHeader.split(' ')[1]
    if (!token || token === 'undefined' || token === 'null') {
      return NextResponse.json(
        { error: 'Unauthorized - token is empty' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    // Verify user token
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: authError?.message || 'Invalid token' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    // Check if Deepgram is configured
    if (!DEEPGRAM_API_KEY) {
      console.error('[Transcribe Chunk] No DEEPGRAM_API_KEY configured')
      return NextResponse.json(
        { error: 'Transcription service not configured' },
        { status: 503, headers: CORS_HEADERS }
      )
    }

    // Parse multipart form data
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const sessionId = formData.get('sessionId') as string | null

    if (!audioFile || !sessionId) {
      return NextResponse.json(
        { error: 'Audio file and session ID required' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Verify session belongs to user
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: session, error: sessionError } = await supabase
      .from('coaching_sessions')
      .select('id, user_id, status')
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

    // Convert File to ArrayBuffer
    const audioBuffer = await audioFile.arrayBuffer()

    console.log(`[Transcribe Chunk] Processing ${audioFile.size} bytes for session ${sessionId}`)

    // Send to Deepgram's pre-recorded API
    const deepgramResponse = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true&punctuate=true&diarize=true', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': audioFile.type || 'audio/webm',
      },
      body: audioBuffer,
    })

    if (!deepgramResponse.ok) {
      const errorText = await deepgramResponse.text()
      console.error('[Transcribe Chunk] Deepgram error:', errorText)
      return NextResponse.json(
        { error: 'Transcription failed' },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    const deepgramResult = await deepgramResponse.json()
    const transcript = deepgramResult.results?.channels?.[0]?.alternatives?.[0]?.transcript

    if (!transcript) {
      console.log('[Transcribe Chunk] No speech detected in audio chunk')
      return NextResponse.json({
        status: 'no_speech',
        transcript: null,
      }, { headers: CORS_HEADERS })
    }

    console.log(`[Transcribe Chunk] Transcribed: "${transcript.substring(0, 50)}..."`)

    // Store transcript in session
    const { data: existingSession } = await supabase
      .from('coaching_sessions')
      .select('transcript')
      .eq('id', sessionId)
      .single()

    const existingTranscript = existingSession?.transcript || ''
    const updatedTranscript = existingTranscript + '\n' + transcript

    await supabase
      .from('coaching_sessions')
      .update({ transcript: updatedTranscript })
      .eq('id', sessionId)

    return NextResponse.json({
      status: 'transcribed',
      transcript,
      words: deepgramResult.results?.channels?.[0]?.alternatives?.[0]?.words || [],
    }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[Transcribe Chunk] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
