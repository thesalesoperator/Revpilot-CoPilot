// RevPilot Sales Coach - Background Service Worker
// Coordinates tab audio capture and coaching session management
// v2.0 - Bot-free tab capture edition

const API_BASE = 'https://revpilot-copilot.netlify.app'

let currentSession = null
let offscreenDocumentCreated = false

// Listen for messages from content script, popup, or offscreen document
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[RevPilot BG] Received message:', message.type)

  switch (message.type) {
    case 'START_COACHING':
      handleStartCoaching(message, sender)
        .then(sendResponse)
        .catch(err => {
          console.error('[RevPilot BG] Start coaching error:', err)
          sendResponse({ error: err.message })
        })
      return true // Keep channel open for async response

    case 'STOP_COACHING':
      handleStopCoaching(message)
        .then(sendResponse)
        .catch(err => {
          console.error('[RevPilot BG] Stop coaching error:', err)
          sendResponse({ error: err.message })
        })
      return true

    case 'GET_SESSION':
      chrome.storage.local.get(['coachingSession'], (result) => {
        sendResponse(result.coachingSession || null)
      })
      return true

    case 'CAPTURE_STARTED':
      console.log('[RevPilot BG] Capture started for session:', message.sessionId)
      notifyContentScript('CAPTURE_ACTIVE', { sessionId: message.sessionId })
      return false

    case 'CAPTURE_STOPPED':
      console.log('[RevPilot BG] Capture stopped for session:', message.sessionId)
      return false

    case 'TRANSCRIPT_UPDATE':
      // Forward transcript to content script for display
      notifyContentScript('TRANSCRIPT_UPDATE', { transcript: message.transcript })
      return false

    case 'SPEECH_EVENT':
      // Forward speech events to content script for talk ratio
      notifyContentScript('SPEECH_EVENT', {
        event: message.event,
        timestamp: message.timestamp
      })
      return false

    default:
      return false
  }
})

async function handleStartCoaching(message, sender) {
  const { meetingUrl, userId, authToken } = message
  const tabId = sender.tab?.id

  console.log('[RevPilot BG] Starting coaching session')
  console.log('[RevPilot BG] Tab ID:', tabId)
  console.log('[RevPilot BG] User ID:', userId)
  console.log('[RevPilot BG] Token exists:', !!authToken)

  if (!authToken) {
    throw new Error('No auth token available - please log in again')
  }

  if (!tabId) {
    throw new Error('Could not identify the meeting tab')
  }

  try {
    // Step 1: Create session on backend
    console.log('[RevPilot BG] Creating session on backend...')
    const sessionResponse = await fetch(`${API_BASE}/api/coaching/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        meetingUrl,
        userId,
        captureMethod: 'tab_audio' // Indicate we're using tab capture
      })
    })

    const sessionData = await sessionResponse.json()

    if (!sessionResponse.ok) {
      throw new Error(sessionData.error || 'Failed to create coaching session')
    }

    console.log('[RevPilot BG] Session created:', sessionData.id)

    // Step 2: Get the stream ID for tab capture
    console.log('[RevPilot BG] Getting tab capture stream ID...')
    let streamId
    try {
      streamId = await chrome.tabCapture.getMediaStreamId({
        targetTabId: tabId
      })
      console.log('[RevPilot BG] Got stream ID')
    } catch (captureError) {
      console.error('[RevPilot BG] Tab capture failed:', captureError)
      // Return session with fallback mode
      currentSession = {
        ...sessionData,
        tabId,
        captureMethod: 'fallback',
        captureError: captureError.message
      }
      await chrome.storage.local.set({ coachingSession: currentSession })
      return {
        ...sessionData,
        captureActive: false,
        botFree: true,
        captureError: captureError.message
      }
    }

    // Step 3: Create offscreen document if needed
    await ensureOffscreenDocument()

    // Step 4: Get selected methodology from storage (default to revpilot)
    const { selectedMethodology } = await chrome.storage.local.get(['selectedMethodology'])
    const methodology = selectedMethodology || 'revpilot'
    console.log('[RevPilot BG] Using methodology:', methodology)

    // Step 5: Start capture in offscreen document
    console.log('[RevPilot BG] Starting capture in offscreen document...')
    const captureResult = await sendMessageToOffscreen({
      type: 'START_CAPTURE',
      streamId,
      sessionId: sessionData.id,
      authToken,
      deepgramApiKey: sessionData.deepgramApiKey || null,
      methodology  // CRITICAL: Pass methodology for proper script tracking
    })

    if (captureResult.error) {
      throw new Error(captureResult.error)
    }

    // Step 5: Store session
    currentSession = {
      ...sessionData,
      tabId,
      startTime: Date.now(),
      captureMethod: 'tab_audio'
    }

    await chrome.storage.local.set({ coachingSession: currentSession })

    console.log('[RevPilot BG] Coaching session started successfully')

    return {
      ...sessionData,
      captureActive: true,
      botFree: true
    }

  } catch (error) {
    console.error('[RevPilot BG] Error starting coaching:', error)

    // Cleanup on error
    await cleanupOffscreenDocument()
    currentSession = null
    await chrome.storage.local.remove(['coachingSession'])

    throw error
  }
}

async function handleStopCoaching(message) {
  const { sessionId, authToken } = message

  console.log('[RevPilot BG] Stopping coaching session:', sessionId)

  try {
    // Step 1: Stop capture in offscreen document
    if (offscreenDocumentCreated) {
      try {
        await sendMessageToOffscreen({ type: 'STOP_CAPTURE' })
      } catch (e) {
        console.log('[RevPilot BG] Error stopping capture:', e.message)
      }
    }

    // Step 2: Clean up offscreen document
    await cleanupOffscreenDocument()

    // Step 3: Notify backend
    try {
      const response = await fetch(`${API_BASE}/api/coaching/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ sessionId })
      })

      if (!response.ok) {
        console.error('[RevPilot BG] Failed to stop session on backend')
      }
    } catch (e) {
      console.error('[RevPilot BG] Backend stop error:', e)
    }

    // Step 4: Clear session
    currentSession = null
    await chrome.storage.local.remove(['coachingSession'])

    // Step 5: Notify content script
    await notifyContentScript('SESSION_STOPPED', {})

    console.log('[RevPilot BG] Coaching session stopped')

    return { success: true }

  } catch (error) {
    console.error('[RevPilot BG] Error stopping coaching:', error)
    // Still clear local state even if backend call fails
    currentSession = null
    await chrome.storage.local.remove(['coachingSession'])
    throw error
  }
}

async function ensureOffscreenDocument() {
  // Check if offscreen document already exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  })

  if (existingContexts.length > 0) {
    console.log('[RevPilot BG] Offscreen document already exists')
    offscreenDocumentCreated = true
    return
  }

  console.log('[RevPilot BG] Creating offscreen document...')

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['USER_MEDIA', 'AUDIO_PLAYBACK'],
    justification: 'Recording tab audio for real-time transcription and coaching'
  })

  offscreenDocumentCreated = true

  // Give offscreen document time to initialize
  await new Promise(resolve => setTimeout(resolve, 100))

  console.log('[RevPilot BG] Offscreen document created')
}

async function cleanupOffscreenDocument() {
  if (!offscreenDocumentCreated) return

  try {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    })

    if (existingContexts.length > 0) {
      console.log('[RevPilot BG] Closing offscreen document...')
      await chrome.offscreen.closeDocument()
    }
  } catch (e) {
    console.log('[RevPilot BG] Error closing offscreen document:', e.message)
  }

  offscreenDocumentCreated = false
}

async function sendMessageToOffscreen(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else {
        resolve(response || {})
      }
    })
  })
}

async function notifyContentScript(type, data) {
  try {
    // Try to send to the meeting tab specifically
    if (currentSession?.tabId) {
      chrome.tabs.sendMessage(currentSession.tabId, { type, ...data })
      return
    }

    // Fallback to active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type, ...data })
    }
  } catch (e) {
    console.log('[RevPilot BG] Could not notify content script:', e.message)
  }
}

// Handle extension install/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open settings page on first install
    chrome.tabs.create({ url: `${API_BASE}/settings?extension=installed` })
  } else if (details.reason === 'update') {
    console.log('[RevPilot BG] Extension updated to version:', chrome.runtime.getManifest().version)
    // Clean up any stale sessions
    chrome.storage.local.remove(['coachingSession'])
    cleanupOffscreenDocument()
  }
})

// Handle tab close - stop coaching if the meeting tab closes
chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (currentSession && currentSession.tabId === tabId) {
    console.log('[RevPilot BG] Meeting tab closed, stopping coaching')
    try {
      const stored = await chrome.storage.local.get(['authToken'])
      if (stored.authToken) {
        await handleStopCoaching({
          sessionId: currentSession.id,
          authToken: stored.authToken
        })
      } else {
        // Just clean up locally
        await cleanupOffscreenDocument()
        currentSession = null
        await chrome.storage.local.remove(['coachingSession'])
      }
    } catch (e) {
      console.error('[RevPilot BG] Error stopping session on tab close:', e)
    }
  }
})

// Handle service worker startup - restore session state
chrome.storage.local.get(['coachingSession'], (result) => {
  if (result.coachingSession) {
    console.log('[RevPilot BG] Found stored session on startup:', result.coachingSession.id)
    // Note: We don't restore currentSession here because the offscreen document
    // won't be running. The user will need to restart if the service worker reloads.
    // This is expected behavior - clear the stale session.
    console.log('[RevPilot BG] Clearing stale session from storage')
    chrome.storage.local.remove(['coachingSession'])
  }
})

console.log('[RevPilot BG] Service worker loaded - Bot-Free Tab Capture Edition v2.0')
