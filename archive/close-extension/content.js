// RevPilot Close CRM Co-Pilot - Content Script

const API_BASE = 'https://revpilot-copilot.netlify.app'

// State
let overlay = null
let tooltip = null
let keywords = []
let isMinimized = false
let isDragging = false
let dragOffset = { x: 0, y: 0 }
let authToken = null
let activeTab = 'chat'

// Initialize
async function init() {
  // Load auth and settings
  const storage = await chrome.storage.local.get(['authToken', 'keywords', 'overlayActive', 'overlayMinimized'])
  authToken = storage.authToken
  keywords = storage.keywords || []
  isMinimized = storage.overlayMinimized || false

  // Create overlay if active
  if (storage.overlayActive) {
    createOverlay()
  }

  // Highlight keywords on page
  if (keywords.length > 0) {
    highlightKeywords()
  }

  // Listen for messages
  chrome.runtime.onMessage.addListener(handleMessage)

  // Watch for DOM changes to re-highlight keywords
  observeDOM()
}

// Handle messages from popup/background
function handleMessage(request, sender, sendResponse) {
  switch (request.action) {
    case 'toggleOverlay':
      toggleOverlay(request.state)
      sendResponse({ success: true })
      break
    case 'syncKeywords':
      keywords = request.keywords || []
      highlightKeywords()
      sendResponse({ success: true })
      break
    case 'updateAuth':
      authToken = request.authToken
      sendResponse({ success: true })
      break
  }
  return true
}

// Create the floating overlay
function createOverlay() {
  if (overlay) {
    overlay.remove()
  }

  overlay = document.createElement('div')
  overlay.className = 'revpilot-overlay' + (isMinimized ? ' minimized' : '')

  // Minimized button
  const minimizedBtn = document.createElement('button')
  minimizedBtn.className = 'revpilot-minimized-btn'
  minimizedBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  `
  minimizedBtn.onclick = () => setMinimized(false)
  overlay.appendChild(minimizedBtn)

  // Header
  const header = document.createElement('div')
  header.className = 'revpilot-header'
  header.innerHTML = `
    <div class="revpilot-header-left">
      <div class="revpilot-logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      </div>
      <div>
        <h3 class="revpilot-title">Close CRM Co-Pilot</h3>
        <p class="revpilot-subtitle">AI-powered assistant</p>
      </div>
    </div>
    <div class="revpilot-header-actions">
      <button class="revpilot-header-btn" id="revpilot-minimize" title="Minimize">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12h14"/>
        </svg>
      </button>
      <button class="revpilot-header-btn" id="revpilot-close" title="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `

  // Make header draggable
  header.addEventListener('mousedown', startDrag)
  overlay.appendChild(header)

  // Content
  const content = document.createElement('div')
  content.className = 'revpilot-content'

  // Tabs
  const tabs = document.createElement('div')
  tabs.className = 'revpilot-tabs'
  tabs.innerHTML = `
    <button class="revpilot-tab active" data-tab="chat">Chat</button>
    <button class="revpilot-tab" data-tab="videos">Training Videos</button>
  `
  content.appendChild(tabs)

  // Chat Panel
  const chatPanel = document.createElement('div')
  chatPanel.className = 'revpilot-panel active'
  chatPanel.id = 'revpilot-chat-panel'
  chatPanel.innerHTML = `
    <div class="revpilot-chat-messages" id="revpilot-messages">
      <div class="revpilot-message bot">
        Hello! I'm your Close CRM Co-Pilot. I can help you with questions about Close.com, sales strategies, and best practices. How can I assist you today?
      </div>
    </div>
    <div class="revpilot-chat-input-container">
      <textarea
        class="revpilot-chat-input"
        id="revpilot-input"
        placeholder="Ask me anything about Close CRM..."
        rows="1"
      ></textarea>
      <button class="revpilot-chat-send" id="revpilot-send">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
        </svg>
      </button>
    </div>
  `
  content.appendChild(chatPanel)

  // Videos Panel
  const videosPanel = document.createElement('div')
  videosPanel.className = 'revpilot-panel'
  videosPanel.id = 'revpilot-videos-panel'
  videosPanel.innerHTML = `
    <div class="revpilot-videos-list" id="revpilot-videos">
      ${renderVideosList()}
    </div>
  `
  content.appendChild(videosPanel)

  overlay.appendChild(content)

  // Status bar
  const status = document.createElement('div')
  status.className = 'revpilot-status ' + (authToken ? 'connected' : 'disconnected')
  status.innerHTML = `
    <span class="revpilot-status-dot"></span>
    <span>${authToken ? 'Connected to RevPilot' : 'Not signed in'}</span>
  `
  overlay.appendChild(status)

  document.body.appendChild(overlay)

  // Event listeners
  setupEventListeners()
}

// Setup event listeners
function setupEventListeners() {
  // Tab switching
  overlay.querySelectorAll('.revpilot-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab))
  })

  // Minimize button
  overlay.querySelector('#revpilot-minimize').addEventListener('click', () => setMinimized(true))

  // Close button
  overlay.querySelector('#revpilot-close').addEventListener('click', () => toggleOverlay(false))

  // Chat input
  const input = overlay.querySelector('#revpilot-input')
  input.addEventListener('input', autoResizeInput)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  })

  // Send button
  overlay.querySelector('#revpilot-send').addEventListener('click', sendMessage)

  // Video items
  overlay.querySelectorAll('.revpilot-video-item').forEach(item => {
    item.addEventListener('click', () => {
      const url = item.dataset.url
      if (url) window.open(url, '_blank')
    })
  })
}

// Switch tabs
function switchTab(tab) {
  activeTab = tab

  overlay.querySelectorAll('.revpilot-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab)
  })

  overlay.querySelector('#revpilot-chat-panel').classList.toggle('active', tab === 'chat')
  overlay.querySelector('#revpilot-videos-panel').classList.toggle('active', tab === 'videos')
}

// Render videos list
function renderVideosList() {
  if (keywords.length === 0) {
    return `
      <div class="revpilot-empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
        </svg>
        <p>No training videos configured yet.<br>Add keywords in the extension options.</p>
      </div>
    `
  }

  return keywords.map(kw => `
    <div class="revpilot-video-item" data-url="${escapeHtml(kw.video_url)}">
      <div class="revpilot-video-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      </div>
      <div class="revpilot-video-info">
        <h4 class="revpilot-video-title">${escapeHtml(kw.video_title)}</h4>
        <span class="revpilot-video-keyword">${escapeHtml(kw.keyword)}</span>
        ${kw.description ? `<p class="revpilot-video-description">${escapeHtml(kw.description)}</p>` : ''}
      </div>
    </div>
  `).join('')
}

// Auto resize chat input
function autoResizeInput(e) {
  const input = e.target
  input.style.height = 'auto'
  input.style.height = Math.min(input.scrollHeight, 100) + 'px'
}

// Send chat message
async function sendMessage() {
  const input = overlay.querySelector('#revpilot-input')
  const messagesContainer = overlay.querySelector('#revpilot-messages')
  const message = input.value.trim()

  if (!message) return

  // Check auth
  if (!authToken) {
    addMessage('Please sign in through the extension popup to use the chat feature.', 'error')
    return
  }

  // Clear input
  input.value = ''
  input.style.height = 'auto'

  // Add user message
  addMessage(message, 'user')

  // Show typing indicator
  const typingEl = document.createElement('div')
  typingEl.className = 'revpilot-message bot typing'
  typingEl.innerHTML = `
    <span class="revpilot-typing-dot"></span>
    <span class="revpilot-typing-dot"></span>
    <span class="revpilot-typing-dot"></span>
  `
  messagesContainer.appendChild(typingEl)
  messagesContainer.scrollTop = messagesContainer.scrollHeight

  try {
    // Send to API via background script
    const response = await chrome.runtime.sendMessage({
      action: 'sendChat',
      message,
      authToken
    })

    // Remove typing indicator
    typingEl.remove()

    if (response.error) {
      addMessage(response.error, 'error')
    } else {
      addMessage(response.response, 'bot')
    }
  } catch (error) {
    typingEl.remove()
    addMessage('Failed to send message. Please try again.', 'error')
  }
}

// Add message to chat
function addMessage(text, type) {
  const messagesContainer = overlay.querySelector('#revpilot-messages')
  const messageEl = document.createElement('div')
  messageEl.className = `revpilot-message ${type}`
  messageEl.textContent = text
  messagesContainer.appendChild(messageEl)
  messagesContainer.scrollTop = messagesContainer.scrollHeight
}

// Toggle overlay visibility
function toggleOverlay(state) {
  const shouldShow = typeof state === 'boolean' ? state : !overlay

  if (shouldShow) {
    if (!overlay) {
      createOverlay()
    } else {
      overlay.style.display = 'flex'
    }
  } else if (overlay) {
    overlay.remove()
    overlay = null
  }

  chrome.storage.local.set({ overlayActive: shouldShow })
}

// Set minimized state
function setMinimized(minimized) {
  isMinimized = minimized
  if (overlay) {
    overlay.classList.toggle('minimized', minimized)
  }
  chrome.storage.local.set({ overlayMinimized: minimized })
}

// Dragging functionality
function startDrag(e) {
  if (e.target.closest('button')) return

  isDragging = true
  const rect = overlay.getBoundingClientRect()
  dragOffset.x = e.clientX - rect.left
  dragOffset.y = e.clientY - rect.top

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  e.preventDefault()
}

function onDrag(e) {
  if (!isDragging || !overlay) return

  const x = e.clientX - dragOffset.x
  const y = e.clientY - dragOffset.y

  // Keep within viewport
  const maxX = window.innerWidth - overlay.offsetWidth
  const maxY = window.innerHeight - overlay.offsetHeight

  overlay.style.left = Math.max(0, Math.min(x, maxX)) + 'px'
  overlay.style.top = Math.max(0, Math.min(y, maxY)) + 'px'
  overlay.style.right = 'auto'
  overlay.style.bottom = 'auto'
}

function stopDrag() {
  isDragging = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// Highlight keywords on page
function highlightKeywords() {
  // Remove existing highlights
  document.querySelectorAll('.revpilot-keyword-highlight').forEach(el => {
    const parent = el.parentNode
    parent.replaceChild(document.createTextNode(el.textContent), el)
    parent.normalize()
  })

  if (keywords.length === 0) return

  // Build regex pattern
  const patterns = keywords.map(kw => escapeRegex(kw.keyword)).join('|')
  const regex = new RegExp(`\\b(${patterns})\\b`, 'gi')

  // Walk text nodes and highlight
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Skip script, style, and our overlay
        const parent = node.parentElement
        if (!parent) return NodeFilter.FILTER_REJECT

        const tagName = parent.tagName.toLowerCase()
        if (['script', 'style', 'noscript', 'textarea', 'input'].includes(tagName)) {
          return NodeFilter.FILTER_REJECT
        }

        if (parent.closest('.revpilot-overlay, .revpilot-tooltip')) {
          return NodeFilter.FILTER_REJECT
        }

        return regex.test(node.textContent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
      }
    }
  )

  const nodesToProcess = []
  while (walker.nextNode()) {
    nodesToProcess.push(walker.currentNode)
  }

  nodesToProcess.forEach(textNode => {
    const fragment = document.createDocumentFragment()
    let lastIndex = 0
    let match

    regex.lastIndex = 0
    while ((match = regex.exec(textNode.textContent)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(textNode.textContent.slice(lastIndex, match.index)))
      }

      // Find matching keyword data
      const matchedKeyword = keywords.find(kw =>
        kw.keyword.toLowerCase() === match[0].toLowerCase()
      )

      // Create highlight span
      const span = document.createElement('span')
      span.className = 'revpilot-keyword-highlight'
      span.textContent = match[0]
      span.dataset.keyword = matchedKeyword?.keyword || match[0]
      span.dataset.videoUrl = matchedKeyword?.video_url || ''
      span.dataset.videoTitle = matchedKeyword?.video_title || ''
      span.dataset.description = matchedKeyword?.description || ''

      span.addEventListener('click', showTooltip)
      span.addEventListener('mouseenter', showTooltip)

      fragment.appendChild(span)
      lastIndex = regex.lastIndex
    }

    // Add remaining text
    if (lastIndex < textNode.textContent.length) {
      fragment.appendChild(document.createTextNode(textNode.textContent.slice(lastIndex)))
    }

    textNode.parentNode.replaceChild(fragment, textNode)
  })
}

// Show tooltip for highlighted keyword
function showTooltip(e) {
  const target = e.currentTarget

  // Remove existing tooltip
  if (tooltip) {
    tooltip.remove()
    tooltip = null
  }

  tooltip = document.createElement('div')
  tooltip.className = 'revpilot-tooltip'

  const videoUrl = target.dataset.videoUrl
  const videoTitle = target.dataset.videoTitle
  const description = target.dataset.description

  tooltip.innerHTML = `
    <h4 class="revpilot-tooltip-title">${escapeHtml(videoTitle || 'Training Video')}</h4>
    ${description ? `<p class="revpilot-tooltip-description">${escapeHtml(description)}</p>` : ''}
    <button class="revpilot-tooltip-btn" ${videoUrl ? '' : 'disabled'}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
      Watch Video
    </button>
  `

  // Add click handler safely (avoids XSS from inline onclick)
  if (videoUrl) {
    const btn = tooltip.querySelector('.revpilot-tooltip-btn')
    btn.addEventListener('click', () => {
      window.open(videoUrl, '_blank', 'noopener,noreferrer')
    })
  }

  document.body.appendChild(tooltip)

  // Position tooltip
  const rect = target.getBoundingClientRect()
  const tooltipRect = tooltip.getBoundingClientRect()

  let top = rect.bottom + 8
  let left = rect.left

  // Keep within viewport
  if (top + tooltipRect.height > window.innerHeight) {
    top = rect.top - tooltipRect.height - 8
  }
  if (left + tooltipRect.width > window.innerWidth) {
    left = window.innerWidth - tooltipRect.width - 8
  }

  tooltip.style.top = top + 'px'
  tooltip.style.left = left + 'px'

  // Hide on mouse leave
  const hideTooltip = () => {
    if (tooltip) {
      tooltip.remove()
      tooltip = null
    }
  }

  target.addEventListener('mouseleave', hideTooltip, { once: true })

  // Hide on click outside
  setTimeout(() => {
    document.addEventListener('click', (e) => {
      if (tooltip && !tooltip.contains(e.target) && e.target !== target) {
        hideTooltip()
      }
    }, { once: true })
  }, 100)
}

// Observe DOM for changes
function observeDOM() {
  const observer = new MutationObserver((mutations) => {
    let shouldHighlight = false

    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if added nodes contain text
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE &&
              !node.classList?.contains('revpilot-keyword-highlight') &&
              !node.closest?.('.revpilot-overlay, .revpilot-tooltip')) {
            shouldHighlight = true
            break
          }
        }
      }
      if (shouldHighlight) break
    }

    if (shouldHighlight && keywords.length > 0) {
      // Debounce highlighting
      clearTimeout(observeDOM.timeout)
      observeDOM.timeout = setTimeout(highlightKeywords, 300)
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Initialize when ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
