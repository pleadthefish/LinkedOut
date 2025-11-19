console.log('Popup loaded');

// DOM elements
const form = document.getElementById('profileForm');
const nameInput = document.getElementById('name');
const roleInput = document.getElementById('role');
const companyInput = document.getElementById('company');
const notesInput = document.getElementById('notes');
const urlDisplay = document.getElementById('url');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const statusMessage = document.getElementById('statusMessage');

// Show status message
function showStatus(message, type = 'loading') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.style.display = 'block';

  if (type === 'loading') {
    statusMessage.innerHTML = `<span class="loading-spinner"></span>${message}`;
  }

  if (type === 'success') {
    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 3000);
  }
}

// Hide status message
function hideStatus() {
  statusMessage.style.display = 'none';
}

// Load profile data when popup opens
async function loadProfileData() {
  try {
    showStatus('Loading profile data...', 'loading');

    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Check if we're on a LinkedIn profile page
    if (!tab.url || !tab.url.includes('linkedin.com/in/')) {
      showStatus('Please navigate to a LinkedIn profile page', 'error');
      saveBtn.disabled = true;
      return;
    }

    // Request profile data from background script
    const response = await chrome.runtime.sendMessage({
      action: 'scrapeProfile',
      tabId: tab.id
    });

    if (response.success) {
      const data = response.data;

      // Populate form fields
      nameInput.value = data.name || '';
      roleInput.value = data.title || '';
      companyInput.value = data.company || '';
      notesInput.value = ''; // Always start with empty notes
      urlDisplay.textContent = data.url || tab.url;

      hideStatus();

      // Focus on the first field that needs attention
      if (!data.name) {
        nameInput.focus();
      } else if (!data.company && data.company !== 'Not specified') {
        companyInput.focus();
      } else {
        roleInput.focus();
      }
    } else {
      showStatus(response.error || 'Failed to load profile data', 'error');
    }
  } catch (error) {
    console.error('Error loading profile data:', error);
    showStatus('Error: ' + error.message, 'error');
  }
}

// Save profile to Notion
async function saveProfile(e) {
  e.preventDefault();

  const profileData = {
    name: nameInput.value.trim(),
    title: roleInput.value.trim() || 'Not specified',
    company: companyInput.value.trim() || 'Not specified',
    notes: notesInput.value.trim() || '',
    url: urlDisplay.textContent
  };

  // Validate required fields
  if (!profileData.name) {
    showStatus('Name is required', 'error');
    nameInput.focus();
    return;
  }

  try {
    showStatus('Saving to Notion...', 'loading');
    saveBtn.disabled = true;

    // Send save request to background script
    const response = await chrome.runtime.sendMessage({
      action: 'saveToNotion',
      data: profileData
    });

    if (response.success) {
      showStatus(`Successfully saved "${profileData.name}" to Notion!`, 'success');

      // Close popup after 1.5 seconds
      setTimeout(() => {
        window.close();
      }, 1500);
    } else {
      showStatus(response.error || 'Failed to save to Notion', 'error');
      saveBtn.disabled = false;
    }
  } catch (error) {
    console.error('Error saving profile:', error);
    showStatus('Error: ' + error.message, 'error');
    saveBtn.disabled = false;
  }
}

// Cancel and close popup
function closePopup() {
  window.close();
}

// Event listeners
form.addEventListener('submit', saveProfile);
cancelBtn.addEventListener('click', closePopup);

// Allow Enter key in single-line inputs to submit form
nameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    form.dispatchEvent(new Event('submit'));
  }
});

companyInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    form.dispatchEvent(new Event('submit'));
  }
});

// Load data when popup opens
loadProfileData();
