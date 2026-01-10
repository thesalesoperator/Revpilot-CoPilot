// RevPilot Sales Coach - Popup Script

const API_BASE = 'https://revpilot-copilot.netlify.app'

document.addEventListener('DOMContentLoaded', init)

async function init() {
  // Check if already logged in
  const { authToken, userId, userEmail } = await chrome.storage.local.get(['authToken', 'userId', 'userEmail'])

  if (authToken && userId) {
    showLoggedIn(userEmail)
  } else {
    showLoginForm()
  }

  // Event listeners
  document.getElementById('loginBtn').addEventListener('click', handleLogin)
  document.getElementById('logoutBtn').addEventListener('click', handleLogout)

  // Enter key to submit
  document.getElementById('password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin()
  })
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
      userEmail: data.user.email
    })

    showLoggedIn(data.user.email)

  } catch (error) {
    console.error('Login error:', error)
    showError(error.message || 'Failed to sign in')
  } finally {
    loginBtn.disabled = false
    loginBtn.textContent = 'Sign In'
  }
}

async function handleLogout() {
  await chrome.storage.local.remove(['authToken', 'userId', 'userEmail'])
  showLoginForm()
}
