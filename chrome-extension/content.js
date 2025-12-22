// RevPilot Sales Coach - Content Script (Injected into Zoom pages)

;(function() {
  'use strict'

  const SUPABASE_URL = 'https://eetumeyptiosseazudwk.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVldHVtZXlwdGlvc3NlYXp1ZHdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxODA2MDAsImV4cCI6MjA2MDc1NjYwMH0.HVvHeDdBjJY_qcnkJcKMR1V3i7A9CK7aHHbTlxNO-9o'

  let overlay = null
  let session = null
  let realtimeChannel = null
  let suggestions = []

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

  function init() {
    // Check if we're in a Zoom meeting
    if (!isZoomMeeting()) {
      console.log('[RevPilot] Not in a Zoom meeting, waiting...')
      // Watch for navigation to meeting
      observeForMeeting()
      return
    }

    console.log('[RevPilot] Zoom meeting detected, initializing...')
    createOverlay()
    loadStoredSession()
  }

  function isZoomMeeting() {
    // Check for Zoom meeting indicators
    return window.location.href.includes('/wc/') ||
           window.location.href.includes('/j/') ||
           document.querySelector('[class*="meeting"]') !== null
  }

  function observeForMeeting() {
    const observer = new MutationObserver(() => {
      if (isZoomMeeting() && !overlay) {
        console.log('[RevPilot] Meeting started, initializing overlay...')
        createOverlay()
        loadStoredSession()
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })
  }

  function createOverlay() {
    if (overlay) return

    overlay = document.createElement('div')
    overlay.id = 'revpilot-overlay'
    overlay.innerHTML = `
      <div class="revpilot-container">
        <div class="revpilot-header">
          <div class="revpilot-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#00ffc1" stroke-width="2"/>
              <path d="M8 12l3 3 5-6" stroke="#00ffc1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>RevPilot Coach</span>
          </div>
          <div class="revpilot-controls">
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

    // Event listeners
    document.getElementById('revpilot-start').addEventListener('click', startCoaching)
    document.getElementById('revpilot-stop').addEventListener('click', stopCoaching)
    document.getElementById('revpilot-minimize').addEventListener('click', minimize)
    document.getElementById('revpilot-expand').addEventListener('click', expand)
    document.getElementById('revpilot-close').addEventListener('click', closeOverlay)
  }

  function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0

    const header = element.querySelector('.revpilot-header')
    if (header) {
      header.style.cursor = 'move'
      header.onmousedown = dragMouseDown
    }

    function dragMouseDown(e) {
      if (e.target.closest('button')) return
      e.preventDefault()
      pos3 = e.clientX
      pos4 = e.clientY
      document.onmouseup = closeDragElement
      document.onmousemove = elementDrag
    }

    function elementDrag(e) {
      e.preventDefault()
      pos1 = pos3 - e.clientX
      pos2 = pos4 - e.clientY
      pos3 = e.clientX
      pos4 = e.clientY
      element.style.top = (element.offsetTop - pos2) + "px"
      element.style.right = "auto"
      element.style.left = (element.offsetLeft - pos1) + "px"
    }

    function closeDragElement() {
      document.onmouseup = null
      document.onmousemove = null
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
    chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (storedSession) => {
      if (storedSession) {
        session = storedSession
        showCoachingUI()
        subscribeToSuggestions()
      }
    })
  }

  async function startCoaching() {
    const startBtn = document.getElementById('revpilot-start')
    startBtn.disabled = true
    startBtn.textContent = 'Connecting...'

    try {
      // Get stored auth
      const { authToken, userId } = await chrome.storage.local.get(['authToken', 'userId'])

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
        if (response.error) {
          alert('Failed to start: ' + response.error)
          startBtn.disabled = false
          startBtn.textContent = 'Start Coaching'
          return
        }

        session = response
        showCoachingUI()
        subscribeToSuggestions()
      })
    } catch (error) {
      console.error('[RevPilot] Start error:', error)
      alert('Failed to start coaching: ' + error.message)
      startBtn.disabled = false
      startBtn.textContent = 'Start Coaching'
    }
  }

  async function stopCoaching() {
    if (!session) return

    const stopBtn = document.getElementById('revpilot-stop')
    stopBtn.disabled = true
    stopBtn.textContent = 'Ending...'

    try {
      const { authToken } = await chrome.storage.local.get(['authToken'])

      chrome.runtime.sendMessage({
        type: 'STOP_COACHING',
        sessionId: session.id,
        authToken
      }, () => {
        if (realtimeChannel) {
          realtimeChannel.unsubscribe()
          realtimeChannel = null
        }
        session = null
        suggestions = []
        showStatusUI()
      })
    } catch (error) {
      console.error('[RevPilot] Stop error:', error)
      stopBtn.disabled = false
      stopBtn.textContent = 'End Coaching'
    }
  }

  function showCoachingUI() {
    document.getElementById('revpilot-status').classList.add('hidden')
    document.getElementById('revpilot-coaching').classList.remove('hidden')
  }

  function showStatusUI() {
    document.getElementById('revpilot-coaching').classList.add('hidden')
    document.getElementById('revpilot-status').classList.remove('hidden')
    const startBtn = document.getElementById('revpilot-start')
    startBtn.disabled = false
    startBtn.textContent = 'Start Coaching'
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
    const pollInterval = setInterval(async () => {
      if (!session) {
        clearInterval(pollInterval)
        return
      }

      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/coaching_suggestions?session_id=eq.${session.id}&order=created_at.desc&limit=10`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
          }
        )

        if (response.ok) {
          const newSuggestions = await response.json()
          newSuggestions.reverse().forEach(s => {
            if (!suggestions.find(existing => existing.id === s.id)) {
              addSuggestion(s)
            }
          })
        }
      } catch (error) {
        console.error('[RevPilot] Poll error:', error)
      }
    }, 2000)
  }

  function addSuggestion(suggestion) {
    suggestions.push(suggestion)

    const container = document.getElementById('revpilot-suggestions')
    const empty = container.querySelector('.revpilot-empty')
    if (empty) empty.remove()

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
    if (overlay.querySelector('.revpilot-minimized:not(.hidden)')) {
      document.getElementById('revpilot-notification').classList.remove('hidden')
    }

    // Highlight animation
    el.classList.add('revpilot-suggestion-new')
    setTimeout(() => el.classList.remove('revpilot-suggestion-new'), 2000)
  }

  function updateStats(stats) {
    const talkPercent = stats.talk_ratio || 50
    const listenPercent = 100 - talkPercent

    document.getElementById('revpilot-talk-ratio').style.width = `${talkPercent}%`
    document.getElementById('revpilot-listen-ratio').style.width = `${listenPercent}%`
    document.getElementById('revpilot-talk-percent').textContent = `${talkPercent}%`
    document.getElementById('revpilot-listen-percent').textContent = `${listenPercent}%`
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
    if (message.type === 'SESSION_STARTED') {
      session = message.session
      showCoachingUI()
      subscribeToSuggestions()
    }

    if (message.type === 'SESSION_STOPPED') {
      if (realtimeChannel) {
        realtimeChannel.unsubscribe()
        realtimeChannel = null
      }
      session = null
      suggestions = []
      showStatusUI()
    }
  })
})()
