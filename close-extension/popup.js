// RevPilot Close CRM Co-Pilot - Popup Script

const API_BASE = 'https://revpilot-copilot.netlify.app'

document.addEventListener('DOMContentLoaded', init)

async function init() {
  // Check if already logged in
  const { authToken, userId, userEmail } = await chrome.storage.local.get([
    'authToken',
    'userId',
    'userEmail'
  ])

  if (authToken && userId) {
    showLoggedIn(userEmail)
    loadStats()
  } else {
    showLoginForm()
  }

  // Event listeners
  document.getElementById('loginBtn').addEventListener('click', handleLogin)
  document.getElementById('logoutBtn').addEventListener('click', handleLogout)
  document.getElementById('toggleOverlay').addEventListener('click', handleToggleOverlay)
  document.getElementById('manageKeywords').addEventListener('click', () => {
    chrome.runtime.openOptionsPage()
  })
  document.getElementById('openDashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: `${API_BASE}/settings` })
  })

  // Enter key to submit
  document.getElementById('password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin()
  })

  // Load overlay state
  loadOverlayState()
}

function showLoginForm() {
  document.getElementById('loginForm').classList.remove('hidden')
  document.getElementById('loggedIn').classList.remove('show')
}

function showLoggedIn(email) {
  document.getElementById('loginForm').classList.add('hidden')
  document.getElementById('loggedIn').classList.add('show')
  document.getElementById('userEmail').textContent = email || 'Connected'
}

function showError(message) {
  const errorEl = document.getElementById('errorMessage')
  errorEl.textContent = message
  errorEl.classList.add('show')
}

function hideError() {
  document.getElementById('errorMessage').classList.remove('show')
}

// Login with email/password
async function handleLogin() {
  const email = document.getElementById('email').value.trim()
  const password = document.getElementById('password').value

  if (!email || !password) {
    showError('Please enter email and password')
    return
  }

  hideError()

  const loginBtn = document.getElementById('loginBtn')
  loginBtn.disabled = true
  loginBtn.textContent = 'Signing in...'

  try {
    const response = await fetch(`${API_BASE}/api/auth/extension`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Invalid credentials')
    }

    // Store auth info
    await chrome.storage.local.set({
      authToken: data.access_token,
      userId: data.user.id,
      userEmail: data.user.email
    })

    showLoggedIn(data.user.email)
    loadStats()

    // Sync keywords to content script
    syncKeywords(data.access_token)
  } catch (error) {
    console.error('Login error:', error)
    showError(error.message || 'Failed to sign in')
  } finally {
    loginBtn.disabled = false
    loginBtn.textContent = 'Sign In'
  }
}

async function handleLogout() {
  await chrome.storage.local.remove(['authToken', 'userId', 'userEmail', 'keywords'])
  showLoginForm()
}

async function handleToggleOverlay() {
  const { overlayActive } = await chrome.storage.local.get(['overlayActive'])
  const newState = !overlayActive

  await chrome.storage.local.set({ overlayActive: newState })
  updateOverlayButton(newState)

  // Send message to content script
  chrome.runtime.sendMessage({
    action: 'toggleOverlay',
    state: newState
  })
}

async function loadOverlayState() {
  const { overlayActive } = await chrome.storage.local.get(['overlayActive'])
  updateOverlayButton(overlayActive || false)
}

function updateOverlayButton(isActive) {
  const btn = document.getElementById('toggleOverlay')
  if (isActive) {
    btn.classList.add('active')
  } else {
    btn.classList.remove('active')
  }
}

async function loadStats() {
  try {
    const { authToken, keywords } = await chrome.storage.local.get(['authToken', 'keywords'])

    // Show keyword count
    const keywordList = keywords || []
    document.getElementById('keywordCount').textContent = keywordList.length

    // Fetch fresh keywords from API
    if (authToken) {
      chrome.runtime.sendMessage(
        { action: 'fetchKeywords', authToken },
        (response) => {
          if (response?.keywords) {
            chrome.storage.local.set({ keywords: response.keywords })
            document.getElementById('keywordCount').textContent = response.keywords.length
          }
        }
      )
    }

    // Chat count would come from analytics - for now show 0
    document.getElementById('chatCount').textContent = '0'
  } catch (error) {
    console.error('Error loading stats:', error)
  }
}

async function syncKeywords(authToken) {
  try {
    const response = await fetch(`${API_BASE}/api/close/keywords`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      const keywords = data.keywords || []

      // Store locally
      await chrome.storage.local.set({ keywords })

      // Update UI
      document.getElementById('keywordCount').textContent = keywords.length

      // Send to content script
      chrome.runtime.sendMessage({
        action: 'syncKeywords',
        keywords
      })
    }
  } catch (error) {
    console.error('Error syncing keywords:', error)
  }
}
