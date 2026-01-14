// RevPilot Sales Coach - Popup Script

const API_BASE = 'https://revpilot-copilot.netlify.app'

document.addEventListener('DOMContentLoaded', init)

async function init() {
  // Check if already logged in
  const { authToken, userId, userEmail, sessionType } = await chrome.storage.local.get(['authToken', 'userId', 'userEmail', 'sessionType'])

  if (authToken && userId) {
    showLoggedIn(userEmail)
    // Load saved session type preference
    loadSessionType(sessionType || 'live_coaching')
  } else {
    showLoginForm()
  }

  // Event listeners
  document.getElementById('loginBtn').addEventListener('click', handleEmailLogin)
  document.getElementById('googleLoginBtn').addEventListener('click', handleGoogleLogin)
  document.getElementById('logoutBtn').addEventListener('click', handleLogout)

  // Session type selector event listeners
  setupSessionTypeSelector()

  // Enter key to submit
  document.getElementById('password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleEmailLogin()
  })
}

// ============================================================
// SESSION TYPE SELECTOR
// ============================================================

/**
 * Set up event listeners for session type buttons
 */
function setupSessionTypeSelector() {
  const typeButtons = document.querySelectorAll('.type-btn')

  typeButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const sessionType = btn.getAttribute('data-type')
      await selectSessionType(sessionType)
    })
  })
}

/**
 * Load and display the saved session type
 */
function loadSessionType(sessionType) {
  const typeButtons = document.querySelectorAll('.type-btn')

  typeButtons.forEach(btn => {
    if (btn.getAttribute('data-type') === sessionType) {
      btn.classList.add('active')
    } else {
      btn.classList.remove('active')
    }
  })

  console.log('[RevPilot] Session type loaded:', sessionType)
}

/**
 * Select a session type and save to storage
 */
async function selectSessionType(sessionType) {
  // Update UI
  const typeButtons = document.querySelectorAll('.type-btn')
  typeButtons.forEach(btn => {
    if (btn.getAttribute('data-type') === sessionType) {
      btn.classList.add('active')
    } else {
      btn.classList.remove('active')
    }
  })

  // Save to storage
  await chrome.storage.local.set({ sessionType })
  console.log('[RevPilot] Session type saved:', sessionType)

  // Update instructions based on session type
  updateInstructions(sessionType)
}

/**
 * Update instructions based on selected session type
 */
function updateInstructions(sessionType) {
  const instructionsEl = document.querySelector('.instructions ol')
  if (!instructionsEl) return

  const instructions = {
    'live_coaching': [
      'Select your session mode above',
      'Join a video call (Zoom, Meet, or Teams)',
      'Click "Start Coaching" in the overlay',
      'Get real-time AI suggestions during your call'
    ],
    'practice': [
      'Select Practice mode above',
      'Go to RevPilot Dashboard for AI roleplay',
      'Practice sales scenarios with AI personas',
      'Get coaching tips and feedback'
    ],
    'real_call_analysis': [
      'Select Analyze mode above',
      'Upload a recorded call or join a live call',
      'Get detailed analysis and insights',
      'Review key moments and improvement areas'
    ]
  }

  const items = instructions[sessionType] || instructions['live_coaching']
  instructionsEl.innerHTML = items.map(item => `<li>${item}</li>`).join('')
}

function showLoginForm() {
  document.getElementById('loginForm').classList.remove('hide')
  document.getElementById('loggedIn').classList.remove('show')
}

function showLoggedIn(email) {
  document.getElementById('loginForm').classList.add('hide')
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

// Google OAuth Login
async function handleGoogleLogin() {
  const googleBtn = document.getElementById('googleLoginBtn')
  googleBtn.disabled = true
  googleBtn.innerHTML = `
    <svg class="spinner" viewBox="0 0 24 24" style="animation: spin 1s linear infinite;">
      <circle cx="12" cy="12" r="10" stroke="#ccc" stroke-width="2" fill="none" stroke-dasharray="31.4 31.4" stroke-linecap="round"/>
    </svg>
    Signing in...
  `
  hideError()

  try {
    // Use chrome.identity to get Google OAuth token
    // This opens a popup for Google sign-in
    const token = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else if (!token) {
          reject(new Error('No token received'))
        } else {
          resolve(token)
        }
      })
    })

    console.log('[RevPilot] Got Google token, exchanging for RevPilot session...')

    // Exchange Google token for RevPilot session
    const response = await fetch(`${API_BASE}/api/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ google_token: token })
    })

    const data = await response.json()

    if (!response.ok) {
      // If Google token is invalid, clear it so user can try again
      if (response.status === 401) {
        chrome.identity.removeCachedAuthToken({ token }, () => {})
      }
      throw new Error(data.error || 'Google sign-in failed')
    }

    // Store auth info
    await chrome.storage.local.set({
      authToken: data.access_token,
      userId: data.user.id,
      userEmail: data.user.email,
      authProvider: 'google'
    })

    showLoggedIn(data.user.email)

  } catch (error) {
    console.error('[RevPilot] Google login error:', error)

    // Provide user-friendly error messages
    let errorMessage = error.message
    if (error.message.includes('canceled') || error.message.includes('cancelled')) {
      errorMessage = 'Sign-in was cancelled'
    } else if (error.message.includes('OAuth2 not granted')) {
      errorMessage = 'Please allow access to continue with Google'
    } else if (error.message.includes('network')) {
      errorMessage = 'Network error. Please check your connection.'
    }

    showError(errorMessage)
  } finally {
    googleBtn.disabled = false
    googleBtn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Continue with Google
    `
  }
}

// Email/Password Login
async function handleEmailLogin() {
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
    // Authenticate via our API (avoids CORS issues)
    const response = await fetch(`${API_BASE}/api/auth/extension`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
      userEmail: data.user.email,
      authProvider: 'email'
    })

    showLoggedIn(data.user.email)

  } catch (error) {
    console.error('Login error:', error)
    showError(error.message || 'Failed to sign in')
  } finally {
    loginBtn.disabled = false
    loginBtn.textContent = 'Sign In with Email'
  }
}

async function handleLogout() {
  // Get current auth info to check if Google logout needed
  const { authProvider } = await chrome.storage.local.get(['authProvider'])

  // If logged in with Google, revoke the cached token
  if (authProvider === 'google') {
    try {
      const token = await new Promise((resolve) => {
        chrome.identity.getAuthToken({ interactive: false }, resolve)
      })

      if (token) {
        // Revoke the token
        await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`)
        // Remove from Chrome's cache
        chrome.identity.removeCachedAuthToken({ token }, () => {})
      }
    } catch (e) {
      console.log('[RevPilot] Error revoking Google token:', e)
    }
  }

  // Clear local storage
  await chrome.storage.local.remove(['authToken', 'userId', 'userEmail', 'authProvider'])
  showLoginForm()
}
