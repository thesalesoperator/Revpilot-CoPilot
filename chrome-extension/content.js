// RevPilot Sales Coach - Content Script (Injected into Zoom pages)

;(function() {
  'use strict'

  // Only run in top frame to avoid multiple instances
  if (window !== window.top) {
    console.log('[RevPilot] Skipping - not top frame')
    return
  }

  const SUPABASE_URL = 'https://eetumeyptiosseazudwk.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVldHVtZXlwdGlvc3NlYXp1ZHdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyOTM0ODcsImV4cCI6MjA4MTg2OTQ4N30.7CJTB3RWuVEiGORea6CjeY6p-VeVGfyOiM6WEgFgzuI'

  let overlay = null
  let session = null
  let realtimeChannel = null
  let suggestions = []
  let isPinned = false
  let pollInterval = null  // Track polling interval for cleanup

  // Initialize immediately
  console.log('[RevPilot] Content script loaded on:', window.location.href)
  console.log('[RevPilot] Running in top frame')

  // Try to initialize now and also watch for changes
  setTimeout(init, 1000) // Delay slightly to let Zoom load
  setTimeout(init, 3000) // Try again after 3s
  setTimeout(init, 5000) // Try again after 5s

  function init() {
    // Don't create multiple overlays
    if (overlay) return

    // Check if we're on a Zoom page
    if (!isZoomPage()) {
      console.log('[RevPilot] Not a Zoom meeting page')
      return
    }

    console.log('[RevPilot] Zoom page detected, creating overlay...')
    createOverlay()
    loadStoredSession()
  }

  function isZoomPage() {
    const url = window.location.href
    const hostname = window.location.hostname

    // Must be on a zoom.us domain
    if (!hostname.includes('zoom.us')) {
      return false
    }

    // Check for actual meeting URLs (more strict patterns)
    const isMeetingUrl = url.includes('zoom.us/wc/') ||  // Web client meeting
                         url.includes('zoom.us/j/') ||   // Join meeting
                         url.includes('zoom.us/s/') ||   // Scheduled meeting
                         (url.includes('/start') && url.match(/\/wc\/\d+\/start/)) ||  // Starting a meeting
                         (url.includes('/join') && url.match(/\/wc\/\d+\/join/))       // Joining a meeting

    // Also check for meeting UI elements (specific to Zoom web client)
    const hasMeetingUI = document.querySelector('#webclient') !== null ||
                         document.querySelector('.meeting-client') !== null ||
                         document.querySelector('[data-type="meeting"]') !== null

    console.log('[RevPilot] isZoomPage check - URL match:', isMeetingUrl, 'UI match:', hasMeetingUI)

    return isMeetingUrl || hasMeetingUI
  }

  function createOverlay() {
    if (overlay) return

    overlay = document.createElement('div')
    overlay.id = 'revpilot-overlay'
    overlay.innerHTML = `
      <div class="revpilot-container" id="revpilot-container">
        <div class="revpilot-header">
          <div class="revpilot-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#00ffc1" stroke-width="2"/>
              <path d="M8 12l3 3 5-6" stroke="#00ffc1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>RevPilot Coach</span>
          </div>
          <div class="revpilot-controls">
            <button id="revpilot-pin" class="revpilot-btn-icon" title="Pin to top">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v10M12 12l4-4M12 12l-4-4M5 22h14"/>
              </svg>
            </button>
            <button id="revpilot-minimize" class="revpilot-btn-icon" title="Minimize">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14"/>
              </svg>
            </button>
            <button id="revpilot-close" class="revpilot-btn-icon" title="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="revpilot-body" id="revpilot-body">
          <div class="revpilot-status" id="revpilot-status">
            <div class="revpilot-status-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00ffc1" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <p>Ready to coach</p>
            <button id="revpilot-start" class="revpilot-btn-primary">
              Start Coaching
            </button>
          </div>

          <div class="revpilot-coaching hidden" id="revpilot-coaching">
            <div class="revpilot-live-indicator">
              <span class="revpilot-pulse"></span>
              <span>LIVE</span>
            </div>

            <div class="revpilot-suggestions" id="revpilot-suggestions">
              <div class="revpilot-empty">
                <p>Listening to your call...</p>
                <p class="revpilot-subtext">Coaching suggestions will appear here</p>
              </div>
            </div>

            <div class="revpilot-stats" id="revpilot-stats">
              <div class="revpilot-stat">
                <span class="revpilot-stat-label">You</span>
                <div class="revpilot-stat-bar">
                  <div class="revpilot-stat-fill" id="revpilot-talk-ratio" style="width: 50%"></div>
                </div>
                <span class="revpilot-stat-value" id="revpilot-talk-percent">50%</span>
              </div>
              <div class="revpilot-stat">
                <span class="revpilot-stat-label">Prospect</span>
                <div class="revpilot-stat-bar prospect">
                  <div class="revpilot-stat-fill" id="revpilot-listen-ratio" style="width: 50%"></div>
                </div>
                <span class="revpilot-stat-value" id="revpilot-listen-percent">50%</span>
              </div>
            </div>

            <button id="revpilot-stop" class="revpilot-btn-danger">
              End Coaching
            </button>
          </div>
        </div>
      </div>

      <div class="revpilot-minimized hidden" id="revpilot-minimized">
        <button id="revpilot-expand" class="revpilot-fab" title="Expand RevPilot">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#00ffc1" stroke-width="2"/>
            <path d="M8 12l3 3 5-6" stroke="#00ffc1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="revpilot-notification-dot hidden" id="revpilot-notification"></span>
        </button>
      </div>
    `

    document.body.appendChild(overlay)

    // Make draggable
    makeDraggable(overlay.querySelector('.revpilot-container'))
    makeDraggable(overlay.querySelector('.revpilot-minimized'))

    // Event listeners
    document.getElementById('revpilot-start').addEventListener('click', startCoaching)
    document.getElementById('revpilot-stop').addEventListener('click', stopCoaching)
    document.getElementById('revpilot-minimize').addEventListener('click', minimize)
    document.getElementById('revpilot-expand').addEventListener('click', expand)
    document.getElementById('revpilot-close').addEventListener('click', closeOverlay)
    document.getElementById('revpilot-pin').addEventListener('click', togglePin)

    console.log('[RevPilot] Overlay created successfully!')
  }

  function makeDraggable(element) {
    if (!element) return

    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0
    let isDragging = false

    const header = element.querySelector('.revpilot-header') || element
    header.style.cursor = 'move'
    header.addEventListener('mousedown', dragMouseDown)

    function dragMouseDown(e) {
      if (e.target.closest('button')) return
      e.preventDefault()
      e.stopPropagation()
      isDragging = true
      pos3 = e.clientX
      pos4 = e.clientY
      document.addEventListener('mouseup', closeDragElement)
      document.addEventListener('mousemove', elementDrag)
    }

    function elementDrag(e) {
      if (!isDragging) return
      e.preventDefault()
      pos1 = pos3 - e.clientX
      pos2 = pos4 - e.clientY
      pos3 = e.clientX
      pos4 = e.clientY

      const newTop = element.offsetTop - pos2
      const newLeft = element.offsetLeft - pos1

      // Keep within viewport
      const maxTop = window.innerHeight - 100
      const maxLeft = window.innerWidth - 100

      element.style.top = Math.max(0, Math.min(newTop, maxTop)) + "px"
      element.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + "px"
      element.style.right = "auto"
      element.style.bottom = "auto"
    }

    function closeDragElement() {
      isDragging = false
      document.removeEventListener('mouseup', closeDragElement)
      document.removeEventListener('mousemove', elementDrag)
    }
  }

  function togglePin() {
    isPinned = !isPinned
    const container = document.getElementById('revpilot-container')
    const pinBtn = document.getElementById('revpilot-pin')

    if (isPinned) {
      container.classList.add('revpilot-pinned')
      pinBtn.classList.add('revpilot-btn-active')
      pinBtn.title = 'Unpin'
    } else {
      container.classList.remove('revpilot-pinned')
      pinBtn.classList.remove('revpilot-btn-active')
      pinBtn.title = 'Pin to top'
    }
  }

  function minimize() {
    overlay.querySelector('.revpilot-container').classList.add('hidden')
    overlay.querySelector('.revpilot-minimized').classList.remove('hidden')
  }

  function expand() {
    overlay.querySelector('.revpilot-minimized').classList.add('hidden')
    overlay.querySelector('.revpilot-container').classList.remove('hidden')
    document.getElementById('revpilot-notification').classList.add('hidden')
  }

  function closeOverlay() {
    if (session) {
      if (confirm('End coaching session and close?')) {
        stopCoaching()
        overlay.remove()
        overlay = null
      }
    } else {
      overlay.remove()
      overlay = null
    }
  }

  async function loadStoredSession() {
    console.log('[RevPilot] Checking for stored session...')

    try {
      // First check chrome.storage directly for the session
      const stored = await chrome.storage.local.get(['coachingSession', 'authToken'])
      console.log('[RevPilot] Storage check - session exists:', !!stored.coachingSession, 'authToken exists:', !!stored.authToken)

      if (stored.coachingSession) {
        session = stored.coachingSession
        console.log('[RevPilot] Restored session from storage:', session.id)
        showCoachingUI()
        subscribeToSuggestions()

        // Show appropriate banner
        if (session.botId) {
          showLiveTranscriptionBanner()
        } else {
          startDemoMode(session.botError)
        }
        return
      }
    } catch (e) {
      console.error('[RevPilot] Error checking storage:', e)
    }

    // Fallback: Try message to background script
    chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (storedSession) => {
      if (chrome.runtime.lastError) {
        console.log('[RevPilot] GET_SESSION error:', chrome.runtime.lastError.message)
        return
      }

      if (storedSession) {
        console.log('[RevPilot] Got session from background:', storedSession.id)
        session = storedSession
        showCoachingUI()
        subscribeToSuggestions()

        if (storedSession.botId) {
          showLiveTranscriptionBanner()
        } else {
          startDemoMode(storedSession.botError)
        }
      } else {
        console.log('[RevPilot] No stored session found')
      }
    })
  }

  async function startCoaching() {
    const startBtn = document.getElementById('revpilot-start')
    startBtn.disabled = true
    startBtn.textContent = 'Connecting...'

    try {
      // Get stored auth
      const stored = await chrome.storage.local.get(['authToken', 'userId'])
      const authToken = stored.authToken
      const userId = stored.userId

      console.log('[RevPilot] Auth check - token exists:', !!authToken, 'userId:', userId)

      if (!authToken || !userId) {
        alert('Please log in to RevPilot first. Click the extension icon to sign in.')
        startBtn.disabled = false
        startBtn.textContent = 'Start Coaching'
        return
      }

      const meetingUrl = window.location.href

      chrome.runtime.sendMessage({
        type: 'START_COACHING',
        meetingUrl,
        userId,
        authToken
      }, (response) => {
        // Check for extension context invalidation
        if (chrome.runtime.lastError) {
          const errorMsg = chrome.runtime.lastError.message || ''
          console.error('[RevPilot] Runtime error:', errorMsg)
          if (errorMsg.includes('Extension context invalidated') || errorMsg.includes('message channel closed')) {
            alert('Extension was updated. Please refresh this page (Cmd+R) and try again.')
          } else {
            alert('Connection error: ' + errorMsg)
          }
          startBtn.disabled = false
          startBtn.textContent = 'Start Coaching'
          return
        }

        if (response && response.error) {
          alert('Failed to start: ' + response.error)
          startBtn.disabled = false
          startBtn.textContent = 'Start Coaching'
          return
        }

        if (response) {
          console.log('[RevPilot] Session started successfully:', response)
          session = response
          console.log('[RevPilot] Switching to coaching UI...')
          showCoachingUI()
          console.log('[RevPilot] Subscribing to realtime...')
          subscribeToSuggestions()

          // Start demo mode if no bot (Recall.ai not configured or failed)
          if (!response.botId) {
            console.log('[RevPilot] No bot ID - starting demo mode for live suggestions')
            if (response.botError) {
              console.warn('[RevPilot] Bot error:', response.botError)
            }
            startDemoMode(response.botError)
          } else {
            console.log('[RevPilot] Bot ID present:', response.botId, '- waiting for real transcription')
            showLiveTranscriptionBanner()
          }
        } else {
          console.error('[RevPilot] Empty response received')
          alert('Failed to start: No response from server')
          startBtn.disabled = false
          startBtn.textContent = 'Start Coaching'
        }
      })
    } catch (error) {
      console.error('[RevPilot] Start error:', error)
      alert('Failed to start coaching: ' + error.message)
      startBtn.disabled = false
      startBtn.textContent = 'Start Coaching'
    }
  }

  async function stopCoaching() {
    if (!session) {
      console.log('[RevPilot] stopCoaching called but no session')
      return
    }

    const stopBtn = document.getElementById('revpilot-stop')
    if (stopBtn) {
      stopBtn.disabled = true
      stopBtn.textContent = 'Ending...'
    }

    try {
      const { authToken } = await chrome.storage.local.get(['authToken'])

      chrome.runtime.sendMessage({
        type: 'STOP_COACHING',
        sessionId: session.id,
        authToken
      }, (response) => {
        // Clean up regardless of response
        cleanupSession()

        // Check for errors
        if (chrome.runtime.lastError) {
          console.error('[RevPilot] Stop error:', chrome.runtime.lastError.message)
        }
      })
    } catch (error) {
      console.error('[RevPilot] Stop error:', error)
      // Still cleanup on error
      cleanupSession()
    }
  }

  // Centralized cleanup function
  function cleanupSession() {
    console.log('[RevPilot] Cleaning up session')

    // Stop realtime subscription
    if (realtimeChannel) {
      try {
        realtimeChannel.unsubscribe()
      } catch (e) {
        console.error('[RevPilot] Error unsubscribing:', e)
      }
      realtimeChannel = null
    }

    // Stop polling
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }

    // Stop demo mode
    stopDemoMode()

    // Reset state
    session = null
    suggestions = []

    // Update UI
    showStatusUI()
  }

  function showCoachingUI() {
    console.log('[RevPilot] showCoachingUI called')
    const statusEl = document.getElementById('revpilot-status')
    const coachingEl = document.getElementById('revpilot-coaching')

    if (!statusEl || !coachingEl) {
      console.error('[RevPilot] UI elements not found! statusEl:', !!statusEl, 'coachingEl:', !!coachingEl)
      return
    }

    statusEl.classList.add('hidden')
    coachingEl.classList.remove('hidden')
    console.log('[RevPilot] Coaching UI now visible')
  }

  function showStatusUI() {
    const coachingEl = document.getElementById('revpilot-coaching')
    const statusEl = document.getElementById('revpilot-status')
    const startBtn = document.getElementById('revpilot-start')
    const stopBtn = document.getElementById('revpilot-stop')

    if (coachingEl) coachingEl.classList.add('hidden')
    if (statusEl) statusEl.classList.remove('hidden')

    // Reset start button
    if (startBtn) {
      startBtn.disabled = false
      startBtn.textContent = 'Start Coaching'
    }

    // Reset stop button for next session
    if (stopBtn) {
      stopBtn.disabled = false
      stopBtn.textContent = 'End Coaching'
    }

    // Clear suggestions container
    const suggestionsContainer = document.getElementById('revpilot-suggestions')
    if (suggestionsContainer) {
      suggestionsContainer.innerHTML = `
        <div class="revpilot-empty">
          <p>Listening to your call...</p>
          <p class="revpilot-subtext">Coaching suggestions will appear here</p>
        </div>
      `
    }

    console.log('[RevPilot] Switched to status UI')
  }

  function subscribeToSuggestions() {
    if (!session) return

    // Create Supabase realtime subscription
    const ws = new WebSocket(`wss://eetumeyptiosseazudwk.supabase.co/realtime/v1/websocket?apikey=${SUPABASE_ANON_KEY}&vsn=1.0.0`)

    ws.onopen = () => {
      console.log('[RevPilot] Connected to realtime')

      // Join the channel for this session
      ws.send(JSON.stringify({
        topic: `realtime:public:coaching_suggestions:session_id=eq.${session.id}`,
        event: 'phx_join',
        payload: {},
        ref: '1'
      }))
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.event === 'INSERT') {
        const suggestion = data.payload.record
        addSuggestion(suggestion)
      }

      if (data.event === 'UPDATE' && data.payload.record.type === 'stats') {
        updateStats(data.payload.record)
      }
    }

    ws.onerror = (error) => {
      console.error('[RevPilot] WebSocket error:', error)
    }

    realtimeChannel = { unsubscribe: () => ws.close() }

    // Also poll as fallback
    startPolling()
  }

  function startPolling() {
    // Clear any existing polling first
    if (pollInterval) {
      clearInterval(pollInterval)
    }

    console.log('[RevPilot] Starting polling for suggestions')

    pollInterval = setInterval(async () => {
      if (!session) {
        console.log('[RevPilot] No session, stopping polling')
        clearInterval(pollInterval)
        pollInterval = null
        return
      }

      try {
        // Get user's auth token for RLS - anon key won't work because RLS requires auth.uid()
        const stored = await chrome.storage.local.get(['authToken'])
        const authToken = stored.authToken || SUPABASE_ANON_KEY

        console.log('[RevPilot] Polling for session:', session.id, 'authToken exists:', !!stored.authToken)

        // Filter out 'stats' type - those are for talk ratio updates, not coaching suggestions
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/coaching_suggestions?session_id=eq.${session.id}&type=neq.stats&order=created_at.desc&limit=10`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${authToken}`
            }
          }
        )

        console.log('[RevPilot] Poll response status:', response.status)

        if (response.ok) {
          const newSuggestions = await response.json()
          console.log('[RevPilot] Fetched suggestions:', newSuggestions.length, 'existing:', suggestions.length)
          newSuggestions.reverse().forEach(s => {
            if (!suggestions.find(existing => existing.id === s.id)) {
              console.log('[RevPilot] New suggestion found:', s.type, s.content?.substring(0, 50))
              addSuggestion(s)
            }
          })
        } else {
          const errorText = await response.text()
          console.log('[RevPilot] Poll response not ok:', response.status, errorText)
        }

        // Also fetch latest stats for talk ratio
        const statsResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/coaching_suggestions?session_id=eq.${session.id}&type=eq.stats&order=created_at.desc&limit=1`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${authToken}`
            }
          }
        )
        if (statsResponse.ok) {
          const statsRecords = await statsResponse.json()
          if (statsRecords.length > 0) {
            try {
              const statsData = JSON.parse(statsRecords[0].content)
              updateStats(statsData)
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
        }
      } catch (error) {
        console.error('[RevPilot] Poll error:', error)
      }
    }, 3000)  // Poll every 3 seconds
  }

  function addSuggestion(suggestion) {
    console.log('[RevPilot] addSuggestion called with:', suggestion.type, suggestion.content?.substring(0, 30))
    suggestions.push(suggestion)

    const container = document.getElementById('revpilot-suggestions')
    if (!container) {
      console.error('[RevPilot] Suggestions container not found!')
      return
    }

    const empty = container.querySelector('.revpilot-empty')
    if (empty) {
      console.log('[RevPilot] Removing empty placeholder')
      empty.remove()
    }

    const el = document.createElement('div')
    el.className = `revpilot-suggestion revpilot-suggestion-${suggestion.type}`
    el.innerHTML = `
      <div class="revpilot-suggestion-header">
        <span class="revpilot-suggestion-type">${getSuggestionIcon(suggestion.type)} ${suggestion.type}</span>
        <span class="revpilot-suggestion-time">${formatTime(suggestion.created_at)}</span>
      </div>
      <p class="revpilot-suggestion-text">${suggestion.content}</p>
    `

    container.insertBefore(el, container.firstChild)

    // Keep only last 10 suggestions visible
    while (container.children.length > 10) {
      container.removeChild(container.lastChild)
    }

    // Show notification if minimized
    if (overlay && overlay.querySelector('.revpilot-minimized:not(.hidden)')) {
      document.getElementById('revpilot-notification').classList.remove('hidden')
    }

    // Highlight animation
    el.classList.add('revpilot-suggestion-new')
    setTimeout(() => el.classList.remove('revpilot-suggestion-new'), 2000)
  }

  function updateStats(stats) {
    const talkPercent = stats.talk_ratio || 50
    const listenPercent = 100 - talkPercent

    const talkRatio = document.getElementById('revpilot-talk-ratio')
    const listenRatio = document.getElementById('revpilot-listen-ratio')
    const talkPct = document.getElementById('revpilot-talk-percent')
    const listenPct = document.getElementById('revpilot-listen-percent')

    if (talkRatio) talkRatio.style.width = `${talkPercent}%`
    if (listenRatio) listenRatio.style.width = `${listenPercent}%`
    if (talkPct) talkPct.textContent = `${talkPercent}%`
    if (listenPct) listenPct.textContent = `${listenPercent}%`
  }

  // Show banner when live transcription is active
  function showLiveTranscriptionBanner() {
    const container = document.getElementById('revpilot-suggestions')
    if (!container) return

    const banner = document.createElement('div')
    banner.className = 'revpilot-mode-banner revpilot-live-banner'
    banner.innerHTML = `
      <span class="revpilot-banner-icon">🎙️</span>
      <span>Live transcription active - AI coaching based on your conversation</span>
    `
    container.insertBefore(banner, container.firstChild)
  }

  // Show banner when in demo mode
  function showDemoModeBanner(botError) {
    const container = document.getElementById('revpilot-suggestions')
    if (!container) return

    const empty = container.querySelector('.revpilot-empty')
    if (empty) empty.remove()

    const banner = document.createElement('div')
    banner.className = 'revpilot-mode-banner revpilot-demo-banner'
    banner.innerHTML = `
      <span class="revpilot-banner-icon">📋</span>
      <span>Demo Mode - showing sample coaching tips</span>
      ${botError ? `<div class="revpilot-banner-detail">Bot connection failed. Configure Recall.ai API key and region in Netlify environment variables.</div>` : ''}
    `
    container.insertBefore(banner, container.firstChild)
  }

  // Demo mode - shows sample suggestions when Recall.ai bot is not available
  let demoInterval = null
  let demoTimeout = null

  function startDemoMode(botError) {
    console.log('[RevPilot] Starting demo mode - will show sample suggestions')
    showDemoModeBanner(botError)

    const demoSuggestions = [
      { type: 'tip', content: 'Start with a warm greeting and build rapport before diving into business.' },
      { type: 'question', content: 'Ask: "What prompted you to take this call today?"' },
      { type: 'tip', content: 'Listen actively - dig deeper into pain points they mention.' },
      { type: 'question', content: 'Try: "Can you tell me more about how that affects your team?"' },
      { type: 'positive', content: 'Great job asking open-ended questions!' },
      { type: 'objection', content: 'They seem hesitant. Address their concerns directly.' },
      { type: 'tip', content: 'Now is a good time to present your solution.' },
      { type: 'question', content: 'Ask: "What would success look like for you?"' },
      { type: 'alert', content: 'Watch your talk ratio - let the prospect speak more.' },
      { type: 'positive', content: 'Nice discovery question! Keep exploring their needs.' },
    ]

    let index = 0
    let talkRatio = 50

    // Helper to add a demo suggestion
    function addDemoSuggestion() {
      if (!session) {
        console.log('[RevPilot Demo] No session, stopping')
        return false
      }

      try {
        const suggestion = demoSuggestions[index % demoSuggestions.length]
        console.log('[RevPilot Demo] Adding suggestion:', suggestion.type)

        addSuggestion({
          id: 'demo-' + Date.now(),
          type: suggestion.type,
          content: suggestion.content,
          created_at: new Date().toISOString()
        })

        index++

        // Update talk ratio
        talkRatio = Math.max(25, Math.min(75, talkRatio + (Math.random() - 0.5) * 15))
        updateStats({ talk_ratio: Math.round(talkRatio) })

        return true
      } catch (err) {
        console.error('[RevPilot Demo] Error adding suggestion:', err)
        return false
      }
    }

    // Show FIRST suggestion immediately (after a tiny delay for UI to render)
    demoTimeout = setTimeout(() => {
      console.log('[RevPilot Demo] Showing first suggestion')
      addDemoSuggestion()

      // Then show suggestions every 10 seconds
      demoInterval = setInterval(() => {
        if (!addDemoSuggestion()) {
          stopDemoMode()
        }
      }, 10000)
    }, 500)
  }

  function stopDemoMode() {
    console.log('[RevPilot] Stopping demo mode')
    if (demoTimeout) {
      clearTimeout(demoTimeout)
      demoTimeout = null
    }
    if (demoInterval) {
      clearInterval(demoInterval)
      demoInterval = null
    }
  }

  function getSuggestionIcon(type) {
    const icons = {
      'question': '🎯',
      'objection': '⚠️',
      'tip': '💡',
      'alert': '🚨',
      'positive': '✅'
    }
    return icons[type] || '💬'
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message) => {
    console.log('[RevPilot] Received message:', message.type)

    if (message.type === 'SESSION_STARTED') {
      session = message.session
      showCoachingUI()
      subscribeToSuggestions()
    }

    if (message.type === 'SESSION_STOPPED') {
      cleanupSession()
    }
  })

  // Expose debug function to window for troubleshooting
  window.revpilotDebug = async function() {
    const stored = await chrome.storage.local.get(['coachingSession', 'authToken', 'userId'])
    console.log('=== RevPilot Debug Info ===')
    console.log('Session in memory:', session)
    console.log('Session in storage:', stored.coachingSession)
    console.log('Auth token exists:', !!stored.authToken)
    console.log('User ID:', stored.userId)
    console.log('Polling active:', !!pollInterval)
    console.log('Suggestions count:', suggestions.length)
    console.log('===========================')
    return {
      session,
      storedSession: stored.coachingSession,
      hasAuthToken: !!stored.authToken,
      userId: stored.userId,
      pollingActive: !!pollInterval,
      suggestionsCount: suggestions.length
    }
  }

  // Also expose a function to manually trigger polling
  window.revpilotPoll = async function() {
    if (!session) {
      console.log('[RevPilot] No session - cannot poll')
      return
    }

    const stored = await chrome.storage.local.get(['authToken'])
    const authToken = stored.authToken || SUPABASE_ANON_KEY

    console.log('[RevPilot] Manual poll for session:', session.id)

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/coaching_suggestions?session_id=eq.${session.id}&type=neq.stats&order=created_at.desc&limit=10`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${authToken}`
        }
      }
    )

    const data = await response.json()
    console.log('[RevPilot] Manual poll result:', response.status, data)
    return data
  }
})()
