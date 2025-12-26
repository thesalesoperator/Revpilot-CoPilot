// RevPilot Close CRM Co-Pilot - Background Service Worker

const API_BASE = 'https://revpilot-copilot.netlify.app'

// Initialize on install
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[RevPilot Close] Extension installed:', details.reason)

  // Set default settings
  chrome.storage.local.set({
    overlayActive: false,
    highlightingActive: true
  })

  // Inject into existing Close.com tabs
  chrome.tabs.query({ url: 'https://*.close.com/*' }, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }).catch(() => {})

        chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['content.css']
        }).catch(() => {})
      }
    })
  })

  // Open dashboard on first install
  if (details.reason === 'install') {
    chrome.tabs.create({ url: `${API_BASE}/settings?close_extension=installed` })
  }
})

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Toggle overlay
  if (request.action === 'toggleOverlay') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'toggleOverlay',
          state: request.state
        }).catch(() => {})
      }
    })
    sendResponse({ success: true })
    return true
  }

  // Fetch keywords from API
  if (request.action === 'fetchKeywords') {
    fetchKeywords(request.authToken)
      .then(keywords => sendResponse({ keywords }))
      .catch(error => sendResponse({ error: error.message }))
    return true
  }

  // Send chat message
  if (request.action === 'sendChat') {
    sendChatMessage(request.authToken, request.message, request.sessionId, request.pageContext)
      .then(data => sendResponse(data))
      .catch(error => sendResponse({ error: error.message }))
    return true
  }

  // Sync keywords to content script
  if (request.action === 'syncKeywords') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'updateKeywords',
          keywords: request.keywords
        }).catch(() => {})
      }
    })
    sendResponse({ success: true })
    return true
  }
})

// Fetch keywords from API
async function fetchKeywords(authToken) {
  if (!authToken) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${API_BASE}/api/close/keywords`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch keywords')
  }

  const data = await response.json()
  return data.keywords || []
}

// Send chat message to API
async function sendChatMessage(authToken, message, sessionId, pageContext) {
  if (!authToken) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${API_BASE}/api/close/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      page_context: pageContext
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to send message')
  }

  return response.json()
}
