// RevPilot Sales Coach - Background Service Worker

const API_BASE = 'https://revpilot-commission-calculator.netlify.app'

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_COACHING') {
    startCoachingSession(message.meetingUrl, message.userId, message.authToken)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }))
    return true // Keep channel open for async response
  }

  if (message.type === 'STOP_COACHING') {
    stopCoachingSession(message.sessionId, message.authToken)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }))
    return true
  }

  if (message.type === 'GET_SESSION') {
    chrome.storage.local.get(['coachingSession'], (result) => {
      sendResponse(result.coachingSession || null)
    })
    return true
  }
})

async function startCoachingSession(meetingUrl, userId, authToken) {
  const response = await fetch(`${API_BASE}/api/coaching/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ meetingUrl, userId })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to start coaching session')
  }

  const session = await response.json()

  // Store session info
  await chrome.storage.local.set({ coachingSession: session })

  // Notify content script
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tabs[0]) {
    chrome.tabs.sendMessage(tabs[0].id, { type: 'SESSION_STARTED', session })
  }

  return session
}

async function stopCoachingSession(sessionId, authToken) {
  const response = await fetch(`${API_BASE}/api/coaching/stop`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ sessionId })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to stop coaching session')
  }

  // Clear session
  await chrome.storage.local.remove(['coachingSession'])

  // Notify content script
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tabs[0]) {
    chrome.tabs.sendMessage(tabs[0].id, { type: 'SESSION_STOPPED' })
  }

  return { success: true }
}

// Handle extension install/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open settings page on first install
    chrome.tabs.create({ url: `${API_BASE}/settings?extension=installed` })
  }
})
