// Popup script for Tone Professional extension settings

document.addEventListener("DOMContentLoaded", async () => {
  // Load and display current settings
  await loadSettings();

  // Set up event listeners
  setupEventListeners();
});

async function loadSettings() {
  try {
    const settings = await chrome.storage.sync.get([
      "autoCheck",
      "minWordCount",
      "useMockApi",
      "apiProvider",
      "openaiKey",
      "deepseekKey",
    ]);

    // Set form values
    document.getElementById("autoCheck").checked = settings.autoCheck !== false;
    document.getElementById("minWordCount").value = settings.minWordCount || 5;
    document.getElementById("useMockApi").checked =
      settings.useMockApi === true;

    // Update UI based on settings
    updateStatusIndicator();
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
}

function setupEventListeners() {
  // Mock API toggle
  document
    .getElementById("useMockApi")
    .addEventListener("change", updateStatusIndicator);

  // Save settings button
  document
    .getElementById("saveSettings")
    .addEventListener("click", saveSettings);

  // Test API button
  document
    .getElementById("testApi")
    .addEventListener("click", testApiConnection);

  // Auto-save on input changes
  const inputs = ["autoCheck", "minWordCount", "useMockApi"];
  inputs.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener("change", debounce(saveSettings, 1000));
    }
  });
}

function updateStatusIndicator() {
  const statusElement = document.getElementById("status-indicator");
  const useMockApi = document.getElementById("useMockApi").checked;

  if (useMockApi) {
    statusElement.className = "status development";
    statusElement.innerHTML =
      "<strong>Development Mode:</strong> Using mock API responses for testing";
  } else {
    statusElement.className = "status production";
    statusElement.innerHTML =
      "<strong>Production Mode:</strong> Using real DeepSeek API";
  }
}

async function saveSettings() {
  try {
    const settings = {
      autoCheck: document.getElementById("autoCheck").checked,
      minWordCount:
        parseInt(document.getElementById("minWordCount").value) || 5,
      useMockApi: document.getElementById("useMockApi").checked,
    };

    await chrome.storage.sync.set(settings);

    // Show success feedback
    showTemporaryMessage("Settings saved successfully!", "success");

    console.log("Settings saved:", settings);
  } catch (error) {
    console.error("Failed to save settings:", error);
    showTemporaryMessage("Failed to save settings", "error");
  }
}

async function testApiConnection() {
  const button = document.getElementById("testApi");
  const originalText = button.textContent;

  button.textContent = "Testing...";
  button.disabled = true;

  try {
    // Send a test message to background script
    const response = await chrome.runtime.sendMessage({
      action: "analyzeTone",
      text: "This is a test message to check API connectivity.",
    });

    if (response.success) {
      showTemporaryMessage("API connection successful!", "success");
    } else {
      showTemporaryMessage(`API test failed: ${response.error}`, "error");
    }
  } catch (error) {
    console.error("API test failed:", error);
    showTemporaryMessage("API test failed: Could not connect", "error");
  } finally {
    button.textContent = originalText;
    button.disabled = false;
  }
}

function showTemporaryMessage(message, type = "info") {
  // Remove existing message
  const existing = document.querySelector(".temp-message");
  if (existing) {
    existing.remove();
  }

  // Create new message
  const messageElement = document.createElement("div");
  messageElement.className = `temp-message ${type}`;
  messageElement.style.cssText = `
    padding: 12px;
    margin: 12px 0;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    ${
      type === "success"
        ? "background: #d4edda; color: #155724; border: 1px solid #c3e6cb;"
        : ""
    }
    ${
      type === "error"
        ? "background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;"
        : ""
    }
    ${
      type === "info"
        ? "background: #cce7ff; color: #004085; border: 1px solid #b3d7ff;"
        : ""
    }
  `;
  messageElement.textContent = message;

  // Insert after save button
  const saveButton = document.getElementById("saveSettings");
  saveButton.parentNode.insertBefore(messageElement, saveButton.nextSibling);

  // Remove after 3 seconds
  setTimeout(() => {
    if (messageElement.parentNode) {
      messageElement.remove();
    }
  }, 3000);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Handle keyboard shortcuts in popup
document.addEventListener("keydown", (e) => {
  // Escape to close popup
  if (e.key === "Escape") {
    window.close();
  }

  // Ctrl/Cmd + S to save
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    saveSettings();
  }
});
