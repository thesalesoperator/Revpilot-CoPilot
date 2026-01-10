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
let transcriptBuffer = []
let lastTranscriptSendTime = 0
const TRANSCRIPT_SEND_INTERVAL = 3000 // Send transcripts to backend every 3 seconds

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Offscreen] Received message:', message.type)

  if (message.type === 'START_CAPTURE') {
    startCapture(message.streamId, message.sessionId, message.authToken, message.deepgramApiKey)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ error: err.message }))
    return true // Keep channel open for async response
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
      startAudioStreaming()
      resolve()
    }

    deepgramSocket.onmessage = (event) => {
      handleDeepgramMessage(JSON.parse(event.data))
    }

    deepgramSocket.onerror = (error) => {
      console.error('[Offscreen] Deepgram WebSocket error:', error)
      reject(new Error('Deepgram connection failed'))
    }

    deepgramSocket.onclose = (event) => {
      console.log('[Offscreen] Deepgram WebSocket closed:', event.code, event.reason)
      if (isCapturing) {
        // Attempt to reconnect if still capturing
        setTimeout(() => {
          if (isCapturing && !deepgramSocket) {
            console.log('[Offscreen] Attempting to reconnect to Deepgram...')
            connectDeepgram(apiKey).catch(console.error)
          }
        }, 2000)
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
  setInterval(() => {
    if (mediaRecorder.state === 'recording') {
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
  const processor = audioContext.createScriptProcessor(4096, 1, 1)

  processor.onaudioprocess = (event) => {
    if (!deepgramSocket || deepgramSocket.readyState !== WebSocket.OPEN) {
      return
    }

    // Get the raw audio data
    const inputData = event.inputBuffer.getChannelData(0)

    // Convert float32 to int16 (linear16)
    const pcmData = new Int16Array(inputData.length)
    for (let i = 0; i < inputData.length; i++) {
      // Clamp and convert to 16-bit
      const s = Math.max(-1, Math.min(1, inputData[i]))
      pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }

    // Send to Deepgram
    deepgramSocket.send(pcmData.buffer)
  }

  source.connect(processor)
  processor.connect(audioContext.destination)

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

async function sendTranscriptsForAnalysis() {
  if (transcriptBuffer.length === 0) return

  const transcripts = [...transcriptBuffer]
  transcriptBuffer = []
  lastTranscriptSendTime = Date.now()

  console.log('[Offscreen] Sending', transcripts.length, 'transcripts for analysis')

  try {
    const response = await fetch(`${API_BASE}/api/coaching/analyze-transcript`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        sessionId,
        transcripts
      })
    })

    if (!response.ok) {
      console.error('[Offscreen] Failed to send transcripts:', response.status)
    }
  } catch (error) {
    console.error('[Offscreen] Error sending transcripts:', error)
    // Put transcripts back in buffer to retry
    transcriptBuffer = [...transcripts, ...transcriptBuffer]
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

  transcriptBuffer = []
  lastTranscriptSendTime = 0

  console.log('[Offscreen] Cleanup complete')
}

// Handle unload - ensure cleanup happens
window.addEventListener('beforeunload', () => {
  if (isCapturing) {
    stopCapture()
  }
})

console.log('[Offscreen] Document loaded and ready')
