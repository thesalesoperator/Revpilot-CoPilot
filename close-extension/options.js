// RevPilot Close CRM Co-Pilot - Options Page Script

const API_BASE = 'https://revpilot-copilot.netlify.app'

let authToken = null
let userEmail = null
let keywords = []
let organizations = []
let selectedOrganizationId = null
let canManageOrgKeywords = false

// Initialize
document.addEventListener('DOMContentLoaded', init)

async function init() {
  // Load auth state
  const storage = await chrome.storage.local.get([
    'authToken',
    'userEmail',
    'keywords',
    'organizations',
    'selectedOrganizationId'
  ])
  authToken = storage.authToken
  userEmail = storage.userEmail
  keywords = storage.keywords || []
  organizations = storage.organizations || []
  selectedOrganizationId = storage.selectedOrganizationId || null

  updateAuthUI()

  if (authToken) {
    await loadOrganizations()
    updateOrgUI()
    fetchKeywords()
  } else {
    renderKeywords()
  }

  // Event listeners
  setupEventListeners()
}

function setupEventListeners() {
  // Add keyword form
  document.getElementById('keywordForm').addEventListener('submit', handleAddKeyword)
  document.getElementById('clearBtn').addEventListener('click', clearForm)

  // Search
  document.getElementById('searchInput').addEventListener('input', handleSearch)

  // Import/Export
  document.getElementById('exportBtn').addEventListener('click', handleExport)
  document.getElementById('importBtn').addEventListener('click', () => showModal('importModal'))

  // Auth button
  document.getElementById('authBtn').addEventListener('click', handleAuthClick)

  // Organization selector
  document.getElementById('orgSelect').addEventListener('change', handleOrgChange)

  // Edit modal
  document.getElementById('closeModal').addEventListener('click', () => hideModal('editModal'))
  document.getElementById('cancelEdit').addEventListener('click', () => hideModal('editModal'))
  document.getElementById('saveEdit').addEventListener('click', handleSaveEdit)

  // Import modal
  document.getElementById('closeImportModal').addEventListener('click', () => hideModal('importModal'))
  document.getElementById('cancelImport').addEventListener('click', () => hideModal('importModal'))
  document.getElementById('confirmImport').addEventListener('click', handleImport)

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('show')
      }
    })
  })
}

// Update auth UI
function updateAuthUI() {
  const authDot = document.getElementById('authDot')
  const authText = document.getElementById('authText')
  const authBtn = document.getElementById('authBtn')
  const orgSection = document.getElementById('orgSelectorSection')

  if (authToken && userEmail) {
    authDot.classList.remove('disconnected')
    authDot.classList.add('connected')
    authText.innerHTML = `Signed in as <strong>${escapeHtml(userEmail)}</strong>`
    authBtn.textContent = 'Sign Out'
    orgSection.style.display = 'block'
  } else {
    authDot.classList.remove('connected')
    authDot.classList.add('disconnected')
    authText.textContent = 'Not signed in'
    authBtn.textContent = 'Sign In'
    orgSection.style.display = 'none'
  }
}

// Handle auth button click
function handleAuthClick() {
  if (authToken) {
    // Sign out
    chrome.storage.local.remove([
      'authToken',
      'userId',
      'userEmail',
      'keywords',
      'organizations',
      'selectedOrganizationId'
    ])
    authToken = null
    userEmail = null
    keywords = []
    organizations = []
    selectedOrganizationId = null
    updateAuthUI()
    renderKeywords()
    showMessage('Signed out successfully', 'success')
  } else {
    // Open popup for sign in
    chrome.action.openPopup()
  }
}

// Load organizations
async function loadOrganizations() {
  if (!authToken) return

  try {
    const response = await fetch(`${API_BASE}/api/close/organizations`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      organizations = data.organizations || []
      await chrome.storage.local.set({ organizations })
    }
  } catch (error) {
    console.error('Error loading organizations:', error)
  }
}

// Update organization UI
function updateOrgUI() {
  const select = document.getElementById('orgSelect')
  const orgInfo = document.getElementById('orgInfo')

  // Clear existing options except the first one
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
  if (selectedOrganizationId) {
    select.value = selectedOrganizationId
  }

  // Update info text and permissions
  updateOrgInfoText()
}

function updateOrgInfoText() {
  const orgInfo = document.getElementById('orgInfo')

  if (selectedOrganizationId) {
    const org = organizations.find(o => o.id === selectedOrganizationId)
    if (org) {
      canManageOrgKeywords = org.can_manage_keywords
      if (canManageOrgKeywords) {
        orgInfo.textContent = `You can add keywords for "${org.name}" (shared with all members).`
        orgInfo.classList.add('admin')
      } else {
        orgInfo.textContent = `Viewing keywords for "${org.name}". Only admins can add org keywords.`
        orgInfo.classList.remove('admin')
      }
    }
  } else {
    canManageOrgKeywords = false
    orgInfo.textContent = 'Keywords will be saved to your personal account.'
    orgInfo.classList.remove('admin')
  }
}

// Handle organization change
async function handleOrgChange(e) {
  selectedOrganizationId = e.target.value || null

  // Store selection
  await chrome.storage.local.set({ selectedOrganizationId })

  // Update info text
  updateOrgInfoText()

  // Fetch keywords for new org
  await fetchKeywords()
}

// Fetch keywords from API
async function fetchKeywords() {
  if (!authToken) return

  try {
    let url = `${API_BASE}/api/close/keywords`
    if (selectedOrganizationId) {
      url += `?organization_id=${selectedOrganizationId}`
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      keywords = data.keywords || []
      await chrome.storage.local.set({ keywords })
      renderKeywords()
      syncToContentScript()
    } else if (response.status === 401) {
      // Token expired
      handleAuthClick()
    }
  } catch (error) {
    console.error('Error fetching keywords:', error)
  }
}

// Add keyword
async function handleAddKeyword(e) {
  e.preventDefault()

  if (!authToken) {
    showMessage('Please sign in to add keywords', 'error')
    return
  }

  const keyword = document.getElementById('keyword').value.trim()
  const videoTitle = document.getElementById('videoTitle').value.trim()
  const videoUrl = document.getElementById('videoUrl').value.trim()
  const description = document.getElementById('description').value.trim()

  if (!keyword || !videoTitle || !videoUrl) {
    showMessage('Please fill in all required fields', 'error')
    return
  }

  // Check if adding org keyword without permission
  if (selectedOrganizationId && !canManageOrgKeywords) {
    showMessage('Only organization admins can add keywords for the organization', 'error')
    return
  }

  const addBtn = document.getElementById('addBtn')
  addBtn.disabled = true
  addBtn.textContent = 'Adding...'

  try {
    const payload = {
      keyword,
      video_title: videoTitle,
      video_url: videoUrl,
      description
    }

    // Add organization_id if selected and user has permission
    if (selectedOrganizationId && canManageOrgKeywords) {
      payload.organization_id = selectedOrganizationId
    }

    const response = await fetch(`${API_BASE}/api/close/keywords`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (response.ok) {
      const data = await response.json()
      keywords.push(data.keyword)
      await chrome.storage.local.set({ keywords })
      renderKeywords()
      syncToContentScript()
      clearForm()
      showMessage('Keyword added successfully', 'success')
    } else {
      const error = await response.json()
      showMessage(error.error || 'Failed to add keyword', 'error')
    }
  } catch (error) {
    console.error('Error adding keyword:', error)
    showMessage('Failed to add keyword', 'error')
  } finally {
    addBtn.disabled = false
    addBtn.textContent = 'Add Keyword'
  }
}

// Clear form
function clearForm() {
  document.getElementById('keywordForm').reset()
}

// Search keywords
function handleSearch(e) {
  const query = e.target.value.toLowerCase()
  renderKeywords(query)
}

// Render keywords list
function renderKeywords(searchQuery = '') {
  const container = document.getElementById('keywordsList')

  const filteredKeywords = searchQuery
    ? keywords.filter(kw =>
        kw.keyword.toLowerCase().includes(searchQuery) ||
        kw.video_title.toLowerCase().includes(searchQuery)
      )
    : keywords

  if (filteredKeywords.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/>
        </svg>
        <h3>${searchQuery ? 'No matches found' : 'No keywords yet'}</h3>
        <p>${searchQuery ? 'Try a different search term.' : 'Add your first keyword above to start highlighting training videos in Close CRM.'}</p>
      </div>
    `
    return
  }

  container.innerHTML = filteredKeywords.map(kw => {
    const isOrgKeyword = !!kw.organization_id
    const orgBadge = isOrgKeyword ? '<span class="keyword-org-badge">Org</span>' : ''

    return `
      <div class="keyword-item" data-id="${kw.id}">
        <div class="keyword-color" style="background: ${kw.highlight_color || '#5eead4'}"></div>
        <div class="keyword-info">
          <div class="keyword-text">${escapeHtml(kw.keyword)}${orgBadge}</div>
          <div class="keyword-meta">
            <a href="${escapeHtml(kw.video_url)}" target="_blank">${escapeHtml(kw.video_title)}</a>
          </div>
        </div>
        <div class="keyword-actions">
          <button class="keyword-btn edit" title="Edit" onclick="editKeyword('${kw.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="keyword-btn delete" title="Delete" onclick="deleteKeyword('${kw.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    `
  }).join('')
}

// Edit keyword
window.editKeyword = function(id) {
  const kw = keywords.find(k => k.id === id)
  if (!kw) return

  // Check if user can edit org keywords
  if (kw.organization_id && !canManageOrgKeywords) {
    showMessage('Only organization admins can edit organization keywords', 'error')
    return
  }

  document.getElementById('editId').value = kw.id
  document.getElementById('editKeyword').value = kw.keyword
  document.getElementById('editVideoTitle').value = kw.video_title
  document.getElementById('editVideoUrl').value = kw.video_url
  document.getElementById('editDescription').value = kw.description || ''

  showModal('editModal')
}

// Save edit
async function handleSaveEdit() {
  if (!authToken) return

  const id = document.getElementById('editId').value
  const keyword = document.getElementById('editKeyword').value.trim()
  const videoTitle = document.getElementById('editVideoTitle').value.trim()
  const videoUrl = document.getElementById('editVideoUrl').value.trim()
  const description = document.getElementById('editDescription').value.trim()

  if (!keyword || !videoTitle || !videoUrl) {
    showMessage('Please fill in all required fields', 'error')
    return
  }

  const saveBtn = document.getElementById('saveEdit')
  saveBtn.disabled = true
  saveBtn.textContent = 'Saving...'

  try {
    const response = await fetch(`${API_BASE}/api/close/keywords/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ keyword, video_title: videoTitle, video_url: videoUrl, description })
    })

    if (response.ok) {
      const data = await response.json()
      const index = keywords.findIndex(k => k.id === id)
      if (index !== -1) {
        keywords[index] = data.keyword
      }
      await chrome.storage.local.set({ keywords })
      renderKeywords()
      syncToContentScript()
      hideModal('editModal')
      showMessage('Keyword updated successfully', 'success')
    } else {
      const error = await response.json()
      showMessage(error.error || 'Failed to update keyword', 'error')
    }
  } catch (error) {
    console.error('Error updating keyword:', error)
    showMessage('Failed to update keyword', 'error')
  } finally {
    saveBtn.disabled = false
    saveBtn.textContent = 'Save Changes'
  }
}

// Delete keyword
window.deleteKeyword = async function(id) {
  if (!authToken) return

  const kw = keywords.find(k => k.id === id)

  // Check if user can delete org keywords
  if (kw && kw.organization_id && !canManageOrgKeywords) {
    showMessage('Only organization admins can delete organization keywords', 'error')
    return
  }

  if (!confirm('Are you sure you want to delete this keyword?')) return

  try {
    const response = await fetch(`${API_BASE}/api/close/keywords/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    if (response.ok) {
      keywords = keywords.filter(k => k.id !== id)
      await chrome.storage.local.set({ keywords })
      renderKeywords()
      syncToContentScript()
      showMessage('Keyword deleted successfully', 'success')
    } else {
      showMessage('Failed to delete keyword', 'error')
    }
  } catch (error) {
    console.error('Error deleting keyword:', error)
    showMessage('Failed to delete keyword', 'error')
  }
}

// Export keywords
function handleExport() {
  if (keywords.length === 0) {
    showMessage('No keywords to export', 'error')
    return
  }

  const exportData = keywords.map(kw => ({
    keyword: kw.keyword,
    video_title: kw.video_title,
    video_url: kw.video_url,
    description: kw.description
  }))

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'revpilot-keywords.json'
  a.click()
  URL.revokeObjectURL(url)

  showMessage('Keywords exported successfully', 'success')
}

// Import keywords
async function handleImport() {
  if (!authToken) {
    showMessage('Please sign in to import keywords', 'error')
    return
  }

  const importData = document.getElementById('importData').value.trim()
  if (!importData) {
    showMessage('Please paste JSON data to import', 'error')
    return
  }

  let data
  try {
    data = JSON.parse(importData)
    if (!Array.isArray(data)) {
      throw new Error('Invalid format')
    }
  } catch (error) {
    showMessage('Invalid JSON format', 'error')
    return
  }

  const confirmBtn = document.getElementById('confirmImport')
  confirmBtn.disabled = true
  confirmBtn.textContent = 'Importing...'

  let imported = 0
  let failed = 0

  for (const item of data) {
    if (!item.keyword || !item.video_title || !item.video_url) {
      failed++
      continue
    }

    try {
      const payload = {
        keyword: item.keyword,
        video_title: item.video_title,
        video_url: item.video_url,
        description: item.description || ''
      }

      // Add org if selected and user has permission
      if (selectedOrganizationId && canManageOrgKeywords) {
        payload.organization_id = selectedOrganizationId
      }

      const response = await fetch(`${API_BASE}/api/close/keywords`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const result = await response.json()
        keywords.push(result.keyword)
        imported++
      } else {
        failed++
      }
    } catch (error) {
      failed++
    }
  }

  await chrome.storage.local.set({ keywords })
  renderKeywords()
  syncToContentScript()
  hideModal('importModal')
  document.getElementById('importData').value = ''

  if (failed > 0) {
    showMessage(`Imported ${imported} keywords, ${failed} failed`, 'success')
  } else {
    showMessage(`Imported ${imported} keywords successfully`, 'success')
  }

  confirmBtn.disabled = false
  confirmBtn.textContent = 'Import'
}

// Sync keywords to content script
function syncToContentScript() {
  chrome.runtime.sendMessage({
    action: 'syncKeywords',
    keywords
  })
}

// Show modal
function showModal(id) {
  document.getElementById(id).classList.add('show')
}

// Hide modal
function hideModal(id) {
  document.getElementById(id).classList.remove('show')
}

// Show message
function showMessage(text, type) {
  const messageEl = document.getElementById('message')
  messageEl.textContent = text
  messageEl.className = `message show ${type}`

  setTimeout(() => {
    messageEl.classList.remove('show')
  }, 4000)
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text || ''
  return div.innerHTML
}
