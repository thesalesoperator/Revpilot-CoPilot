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
    await loadOrganizations()
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
  document.getElementById('orgSelect').addEventListener('change', handleOrgChange)

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
    await loadOrganizations()
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
  await chrome.storage.local.remove([
    'authToken',
    'userId',
    'userEmail',
    'keywords',
    'organizations',
    'selectedOrganizationId'
  ])
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

// Load and populate organizations dropdown
async function loadOrganizations() {
  const { authToken, selectedOrganizationId } = await chrome.storage.local.get([
    'authToken',
    'selectedOrganizationId'
  ])

  if (!authToken) return

  try {
    const response = await fetch(`${API_BASE}/api/close/organizations`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      const organizations = data.organizations || []

      // Store orgs locally
      await chrome.storage.local.set({ organizations })

      // Populate dropdown
      populateOrgDropdown(organizations, selectedOrganizationId)
    }
  } catch (error) {
    console.error('Error loading organizations:', error)
  }
}

function populateOrgDropdown(organizations, selectedId) {
  const select = document.getElementById('orgSelect')

  // Clear existing options except the first one (Personal)
  while (select.options.length > 1) {
    select.remove(1)
  }

  // Add organization options
  organizations.forEach(org => {
    const option = document.createElement('option')
    option.value = org.id
    option.textContent = org.name
    if (org.role === 'owner') {
      option.textContent += ' (Owner)'
    } else if (org.role === 'admin') {
      option.textContent += ' (Admin)'
    }
    select.appendChild(option)
  })

  // Set selected value
  if (selectedId) {
    select.value = selectedId
  }
}

// Handle organization change
async function handleOrgChange(e) {
  const selectedOrgId = e.target.value || null

  // Store selection
  await chrome.storage.local.set({
    selectedOrganizationId: selectedOrgId
  })

  // Refresh keywords for new org
  const { authToken } = await chrome.storage.local.get(['authToken'])
  if (authToken) {
    syncKeywords(authToken, selectedOrgId)
  }
}

async function loadStats() {
  try {
    const { authToken, keywords, selectedOrganizationId } = await chrome.storage.local.get([
      'authToken',
      'keywords',
      'selectedOrganizationId'
    ])

    // Show keyword count
    const keywordList = keywords || []
    document.getElementById('keywordCount').textContent = keywordList.length

    // Fetch fresh keywords from API
    if (authToken) {
      syncKeywords(authToken, selectedOrganizationId)
    }

    // Chat count would come from analytics - for now show 0
    document.getElementById('chatCount').textContent = '0'
  } catch (error) {
    console.error('Error loading stats:', error)
  }
}

async function syncKeywords(authToken, organizationId = null) {
  try {
    let url = `${API_BASE}/api/close/keywords`
    if (organizationId) {
      url += `?organization_id=${organizationId}`
    }

    const response = await fetch(url, {
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
