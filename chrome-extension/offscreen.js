// RevPilot Sales Coach - Offscreen Document for Tab Audio Capture
// This document captures tab audio and streams it to Deepgram for real-time transcription

const API_BASE = 'https://revpilot-copilot.netlify.app'

let mediaStream = null
let audioContext = null
let mediaRecorder = null
let deepgramSocket = null
let isCapturing = false
let sessionId = null
let authToken = null
let methodology = 'general' // Sales methodology: meddic, spin, challenger, sandler, bant, general
let transcriptBuffer = []
let lastTranscriptSendTime = 0
const TRANSCRIPT_SEND_INTERVAL = 3000 // Send transcripts to backend every 3 seconds

// Reconnection tracking
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5
const BASE_RECONNECT_DELAY = 1000 // 1 second base delay with exponential backoff

// Audio buffering during disconnects
let audioBuffer = []
const MAX_AUDIO_BUFFER_SIZE = 50 // ~200ms of audio at 4096 samples
let backendTranscriptionInterval = null // Track interval for cleanup
let audioProcessor = null // Track processor for cleanup

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Offscreen] Received message:', message.type)

  if (message.type === 'START_CAPTURE') {
    // Accept methodology preference from background script
    if (message.methodology) {
      methodology = message.methodology
    }
    startCapture(message.streamId, message.sessionId, message.authToken, message.deepgramApiKey)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ error: err.message }))
    return true // Keep channel open for async response
  }

  if (message.type === 'SET_METHODOLOGY') {
    methodology = message.methodology || 'general'
    console.log('[Offscreen] Methodology set to:', methodology)
    sendResponse({ success: true })
    return true
  }

  if (message.type === 'STOP_CAPTURE') {
    stopCapture()
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ error: err.message }))
    return true
  }

  if (message.type === 'GET_STATUS') {
    sendResponse({
      isCapturing,
      sessionId,
      hasStream: !!mediaStream,
      hasSocket: !!deepgramSocket
    })
    return true
  }
})

async function startCapture(streamId, sessionIdParam, authTokenParam, deepgramApiKey) {
  console.log('[Offscreen] Starting capture with streamId:', streamId?.substring(0, 20) + '...')

  if (isCapturing) {
    console.log('[Offscreen] Already capturing, stopping first')
    await stopCapture()
  }

  sessionId = sessionIdParam
  authToken = authTokenParam

  try {
    // Get the media stream from the tab
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      },
      video: false
    })

    console.log('[Offscreen] Got media stream, tracks:', mediaStream.getAudioTracks().length)

    // Create AudioContext to maintain playback while capturing
    // This routes the audio back to the user's speakers
    audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(mediaStream)

    // Connect to destination so user can still hear the meeting
    source.connect(audioContext.destination)
    console.log('[Offscreen] Audio routed to speakers')

    // Connect to Deepgram for transcription
    if (deepgramApiKey) {
      await connectDeepgram(deepgramApiKey)
    } else {
      console.log('[Offscreen] No Deepgram API key, will use backend proxy')
      await connectDeepgramViaBackend()
    }

    isCapturing = true

    // Notify background script that capture started
    chrome.runtime.sendMessage({
      type: 'CAPTURE_STARTED',
      sessionId
    })

    console.log('[Offscreen] Capture started successfully')

  } catch (error) {
    console.error('[Offscreen] Error starting capture:', error)
    await cleanup()
    throw error
  }
}

async function connectDeepgram(apiKey) {
  console.log('[Offscreen] Connecting to Deepgram...')

  // Deepgram WebSocket URL with configuration
  const deepgramUrl = new URL('wss://api.deepgram.com/v1/listen')
  deepgramUrl.searchParams.set('model', 'nova-2')
  deepgramUrl.searchParams.set('language', 'en')
  deepgramUrl.searchParams.set('smart_format', 'true')
  deepgramUrl.searchParams.set('punctuate', 'true')
  deepgramUrl.searchParams.set('diarize', 'true') // Speaker diarization
  deepgramUrl.searchParams.set('interim_results', 'true')
  deepgramUrl.searchParams.set('utterance_end_ms', '1000')
  deepgramUrl.searchParams.set('vad_events', 'true')
  deepgramUrl.searchParams.set('encoding', 'linear16')
  deepgramUrl.searchParams.set('sample_rate', '48000')
  deepgramUrl.searchParams.set('channels', '1')

  return new Promise((resolve, reject) => {
    deepgramSocket = new WebSocket(deepgramUrl.toString(), ['token', apiKey])

    deepgramSocket.onopen = () => {
      console.log('[Offscreen] Deepgram WebSocket connected')
      reconnectAttempts = 0  // Reset on successful connection
      startAudioStreaming()
      resolve()
    }

    deepgramSocket.onmessage = (event) => {
      handleDeepgramMessage(JSON.parse(event.data))
    }

    deepgramSocket.onerror = (error) => {
      console.error('[Offscreen] Deepgram WebSocket error:', error)
      deepgramSocket = null  // CRITICAL: Nullify so reconnect check works
      reject(new Error('Deepgram connection failed'))
    }

    deepgramSocket.onclose = (event) => {
      console.log('[Offscreen] Deepgram WebSocket closed:', event.code, event.reason)
      deepgramSocket = null  // CRITICAL: Nullify on close

      if (isCapturing) {
        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++
          const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1)
          console.log(`[Offscreen] Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`)

          setTimeout(() => {
            if (isCapturing && !deepgramSocket) {
              console.log('[Offscreen] Attempting to reconnect to Deepgram...')
              connectDeepgram(apiKey).catch(err => {
                console.error('[Offscreen] Reconnection failed:', err)
                // Notify UI about connection issues
                chrome.runtime.sendMessage({
                  type: 'TRANSCRIPTION_ERROR',
                  error: 'connection_lost',
                  message: `Reconnect attempt ${reconnectAttempts} failed`
                })
              })
            }
          }, delay)
        } else {
          console.error('[Offscreen] Max reconnection attempts reached. Falling back to backend transcription.')
          // Notify UI that transcription has failed
          chrome.runtime.sendMessage({
            type: 'TRANSCRIPTION_ERROR',
            error: 'max_reconnects_exceeded',
            message: 'Live transcription unavailable. Some conversation may not be captured.'
          })
          // Fall back to backend transcription
          startBackendTranscription()
        }
      }
    }
  })
}

async function connectDeepgramViaBackend() {
  console.log('[Offscreen] Connecting to Deepgram via backend proxy...')

  // Get a Deepgram session token from our backend
  try {
    const response = await fetch(`${API_BASE}/api/coaching/deepgram-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ sessionId })
    })

    if (!response.ok) {
      throw new Error('Failed to get Deepgram token')
    }

    const { apiKey } = await response.json()
    await connectDeepgram(apiKey)
  } catch (error) {
    console.error('[Offscreen] Failed to connect via backend:', error)
    // Fall back to sending raw audio to backend for processing
    startBackendTranscription()
  }
}

function startBackendTranscription() {
  console.log('[Offscreen] Starting backend transcription fallback')

  // Use MediaRecorder to capture audio chunks and send to backend
  const audioTrack = mediaStream.getAudioTracks()[0]
  const recordingStream = new MediaStream([audioTrack])

  mediaRecorder = new MediaRecorder(recordingStream, {
    mimeType: 'audio/webm;codecs=opus'
  })

  const audioChunks = []

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      audioChunks.push(event.data)
    }
  }

  // Send audio to backend every 5 seconds
  mediaRecorder.onstop = async () => {
    if (audioChunks.length === 0) return

    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
    audioChunks.length = 0

    // Send to backend for transcription
    const formData = new FormData()
    formData.append('audio', audioBlob)
    formData.append('sessionId', sessionId)

    try {
      await fetch(`${API_BASE}/api/coaching/transcribe-chunk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      })
    } catch (error) {
      console.error('[Offscreen] Error sending audio chunk:', error)
    }
  }

  // Record in 5-second intervals
  mediaRecorder.start()
  backendTranscriptionInterval = setInterval(() => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
      mediaRecorder.start()
    }
  }, 5000)
}

function startAudioStreaming() {
  console.log('[Offscreen] Starting audio streaming to Deepgram')

  // Create a MediaRecorder to capture audio chunks
  const audioTrack = mediaStream.getAudioTracks()[0]
  const recordingStream = new MediaStream([audioTrack])

  // Use ScriptProcessorNode for raw PCM (linear16) data
  // This is more compatible with Deepgram than MediaRecorder
  const source = audioContext.createMediaStreamSource(recordingStream)
  audioProcessor = audioContext.createScriptProcessor(4096, 1, 1)

  audioProcessor.onaudioprocess = (event) => {
    // Get the raw audio data
    const inputData = event.inputBuffer.getChannelData(0)

    // Convert float32 to int16 (linear16)
    const pcmData = new Int16Array(inputData.length)
    for (let i = 0; i < inputData.length; i++) {
      // Clamp and convert to 16-bit
      const s = Math.max(-1, Math.min(1, inputData[i]))
      pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }

    if (deepgramSocket && deepgramSocket.readyState === WebSocket.OPEN) {
      // Socket is open - first flush any buffered audio, then send current
      if (audioBuffer.length > 0) {
        console.log(`[Offscreen] Flushing ${audioBuffer.length} buffered audio frames`)
        for (const bufferedData of audioBuffer) {
          deepgramSocket.send(bufferedData)
        }
        audioBuffer = []
      }
      // Send current audio
      deepgramSocket.send(pcmData.buffer)
    } else if (isCapturing && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      // Socket is disconnected but we're reconnecting - buffer the audio
      if (audioBuffer.length < MAX_AUDIO_BUFFER_SIZE) {
        // Make a copy of the buffer since ArrayBuffer can be reused
        audioBuffer.push(pcmData.buffer.slice(0))
      } else if (audioBuffer.length === MAX_AUDIO_BUFFER_SIZE) {
        console.warn('[Offscreen] Audio buffer full - dropping oldest frames')
        audioBuffer.shift()
        audioBuffer.push(pcmData.buffer.slice(0))
      }
    }
    // If we've exceeded max reconnects and have no socket, audio is just dropped
  }

  source.connect(audioProcessor)
  audioProcessor.connect(audioContext.destination)

  console.log('[Offscreen] Audio streaming started')
}

function handleDeepgramMessage(data) {
  // Handle Deepgram transcription results
  if (data.type === 'Results' && data.channel) {
    const transcript = data.channel.alternatives[0]

    if (transcript && transcript.transcript) {
      const isFinal = data.is_final
      const text = transcript.transcript
      const confidence = transcript.confidence

      // Get speaker info if available (diarization)
      let speaker = null
      if (transcript.words && transcript.words.length > 0) {
        speaker = transcript.words[0].speaker
      }

      console.log('[Offscreen] Transcript:', isFinal ? 'FINAL' : 'interim',
                  speaker !== null ? `[Speaker ${speaker}]` : '',
                  text.substring(0, 50) + (text.length > 50 ? '...' : ''))

      if (isFinal && text.trim()) {
        // Add to buffer
        transcriptBuffer.push({
          text: text.trim(),
          speaker,
          confidence,
          timestamp: Date.now()
        })

        // Send to content script for immediate display
        chrome.runtime.sendMessage({
          type: 'TRANSCRIPT_UPDATE',
          transcript: {
            text: text.trim(),
            speaker,
            isFinal: true
          }
        })

        // Check if we should send accumulated transcripts to backend for analysis
        const now = Date.now()
        if (now - lastTranscriptSendTime >= TRANSCRIPT_SEND_INTERVAL && transcriptBuffer.length > 0) {
          sendTranscriptsForAnalysis()
        }
      }
    }
  }

  // Handle utterance end (speaker finished talking)
  if (data.type === 'UtteranceEnd') {
    console.log('[Offscreen] Utterance ended')
    // Good time to send transcripts for analysis
    if (transcriptBuffer.length > 0) {
      sendTranscriptsForAnalysis()
    }
  }

  // Handle speech started/ended for talk ratio
  if (data.type === 'SpeechStarted') {
    chrome.runtime.sendMessage({
      type: 'SPEECH_EVENT',
      event: 'started',
      timestamp: data.timestamp
    })
  }
}

const MAX_TRANSCRIPT_BUFFER_SIZE = 100  // Prevent unbounded memory growth

async function sendTranscriptsForAnalysis() {
  if (transcriptBuffer.length === 0) return

  // Take transcripts but DON'T clear buffer yet - wait for success
  const transcripts = [...transcriptBuffer]
  lastTranscriptSendTime = Date.now()

  console.log('[Offscreen] Sending', transcripts.length, 'transcripts for analysis with methodology:', methodology)

  try {
    const response = await fetch(`${API_BASE}/api/coaching/analyze-transcript`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        sessionId,
        transcripts,
        methodology  // Include sales methodology for coaching framework
      })
    })

    const data = await response.json()

    // Check for rate limiting or other soft failures
    if (data.status === 'rate_limited') {
      console.log('[Offscreen] Rate limited - keeping transcripts in buffer for retry')
      // Don't clear buffer - will retry on next interval
      return
    }

    if (response.ok) {
      // SUCCESS - Now safe to clear the buffer
      transcriptBuffer = []

      console.log('[Offscreen] Analysis response:', {
        hasStage: !!data.stage,
        hasScript: !!data.script,
        scriptSection: data.script?.sectionName,
        scriptOrder: data.script?.sectionOrder,
        hasSuggestion: !!data.suggestion,
        talkRatio: data.talkRatio
      })

      // Send coaching data back to content script
      // Include script data for RevPilot methodology section tracking
      if (data.stage || data.conversationInsight || data.predictedNextMove || data.script || data.suggestion) {
        chrome.runtime.sendMessage({
          type: 'COACHING_INSIGHT',
          stage: data.stage,
          insight: data.conversationInsight,
          prediction: data.predictedNextMove,
          keyInfo: data.keyInfo,
          talkRatio: data.talkRatio,
          script: data.script,  // CRITICAL: Include script section data for UI updates
          suggestion: data.suggestion  // Include suggestion for immediate display
        })
      }
    } else {
      console.error('[Offscreen] Failed to send transcripts:', response.status, data)
      // Keep transcripts in buffer for retry, but limit size to prevent memory issues
      if (transcriptBuffer.length > MAX_TRANSCRIPT_BUFFER_SIZE) {
        console.warn('[Offscreen] Buffer overflow - dropping oldest transcripts')
        transcriptBuffer = transcriptBuffer.slice(-MAX_TRANSCRIPT_BUFFER_SIZE)
      }
    }
  } catch (error) {
    console.error('[Offscreen] Error sending transcripts:', error)
    // Keep transcripts in buffer for retry, but limit size
    if (transcriptBuffer.length > MAX_TRANSCRIPT_BUFFER_SIZE) {
      console.warn('[Offscreen] Buffer overflow - dropping oldest transcripts')
      transcriptBuffer = transcriptBuffer.slice(-MAX_TRANSCRIPT_BUFFER_SIZE)
    }
  }
}

async function stopCapture() {
  console.log('[Offscreen] Stopping capture')

  isCapturing = false

  // Send any remaining transcripts
  if (transcriptBuffer.length > 0) {
    await sendTranscriptsForAnalysis()
  }

  await cleanup()

  // Notify background script
  chrome.runtime.sendMessage({
    type: 'CAPTURE_STOPPED',
    sessionId
  })

  sessionId = null
  authToken = null

  console.log('[Offscreen] Capture stopped')
}

async function cleanup() {
  console.log('[Offscreen] Cleaning up resources')

  // Clear backend transcription interval
  if (backendTranscriptionInterval) {
    clearInterval(backendTranscriptionInterval)
    backendTranscriptionInterval = null
  }

  // Disconnect audio processor to stop audio processing
  if (audioProcessor) {
    try {
      audioProcessor.disconnect()
    } catch (e) {
      console.error('[Offscreen] Error disconnecting audio processor:', e)
    }
    audioProcessor = null
  }

  // Close Deepgram WebSocket
  if (deepgramSocket) {
    try {
      // Send close message to Deepgram
      if (deepgramSocket.readyState === WebSocket.OPEN) {
        deepgramSocket.send(JSON.stringify({ type: 'CloseStream' }))
      }
      deepgramSocket.close()
    } catch (e) {
      console.error('[Offscreen] Error closing Deepgram socket:', e)
    }
    deepgramSocket = null
  }

  // Stop MediaRecorder if using backend fallback
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try {
      mediaRecorder.stop()
    } catch (e) {
      console.error('[Offscreen] Error stopping MediaRecorder:', e)
    }
    mediaRecorder = null
  }

  // Close AudioContext
  if (audioContext && audioContext.state !== 'closed') {
    try {
      await audioContext.close()
    } catch (e) {
      console.error('[Offscreen] Error closing AudioContext:', e)
    }
    audioContext = null
  }

  // Stop all tracks in media stream
  if (mediaStream) {
    try {
      mediaStream.getTracks().forEach(track => {
        track.stop()
      })
    } catch (e) {
      console.error('[Offscreen] Error stopping media tracks:', e)
    }
    mediaStream = null
  }

  // Reset all buffers and tracking
  transcriptBuffer = []
  audioBuffer = []
  lastTranscriptSendTime = 0
  reconnectAttempts = 0

  console.log('[Offscreen] Cleanup complete')
}

// Handle unload - ensure cleanup happens
window.addEventListener('beforeunload', () => {
  if (isCapturing) {
    stopCapture()
  }
})

console.log('[Offscreen] Document loaded and ready')
