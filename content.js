// Tone Professional - Content Script
// This script detects typing in text fields and provides tone analysis

console.log("Tone Professional: Content script loaded");

// Configuration
const CONFIG = {
  debounceMs: 1000,
  wordThreshold: 5,
  extensionName: "tone-professional",
};

// Global state
let debounceTimer = null;
let currentSuggestionPopup = null;
let currentTextElement = null;
let isProcessing = false;

// Track processed elements to avoid duplicate listeners
const processedElements = new WeakSet();

// Initialize the content script
function init() {
  console.log("Tone Professional: Initializing content script");

  // Start observing for text fields
  observeTextFields();

  // Also process existing text fields
  processExistingTextFields();

  // Handle clicks to dismiss popups
  document.addEventListener("click", handleDocumentClick, true);

  // Add styles
  addStyles();
}

// Create a mutation observer to watch for new text fields
function observeTextFields() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            processTextFieldsInElement(node);
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Process existing text fields on page load
function processExistingTextFields() {
  processTextFieldsInElement(document.body);
}

// Find and process text fields in a given element
function processTextFieldsInElement(element) {
  // Find text areas and input fields
  const textFields = element.querySelectorAll(
    'textarea, input[type="text"], input[type="email"], [contenteditable="true"]'
  );

  textFields.forEach((field) => {
    if (!processedElements.has(field)) {
      attachToTextField(field);
      processedElements.add(field);
    }
  });

  // Also check if the element itself is a text field
  if (isTextField(element) && !processedElements.has(element)) {
    attachToTextField(element);
    processedElements.add(element);
  }
}

// Check if an element is a text field
function isTextField(element) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

  const tagName = element.tagName.toLowerCase();
  const type = element.type ? element.type.toLowerCase() : "";
  const contentEditable = element.contentEditable;

  return (
    tagName === "textarea" ||
    (tagName === "input" && ["text", "email", "search"].includes(type)) ||
    contentEditable === "true" ||
    contentEditable === ""
  );
}

// Attach event listeners to a text field
function attachToTextField(element) {
  console.log(
    "Tone Professional: Attaching to text field",
    element.tagName,
    element.type
  );

  // Handle input events
  element.addEventListener("input", (e) => handleTextInput(e, element));
  element.addEventListener("focus", (e) => handleTextFocus(e, element));
  element.addEventListener("blur", (e) => handleTextBlur(e, element));

  // Add visual indicator
  try {
    addVisualIndicator(element);
  } catch (error) {
    console.log("Could not add visual indicator:", error);
  }
}

// Add a subtle visual indicator to monitored fields
function addVisualIndicator(element) {
  // Skip if element already has indicator
  if (element.dataset.tonePro) return;
  element.dataset.tonePro = "active";

  // Create indicator
  const indicator = document.createElement("div");
  indicator.className = "tone-pro-indicator";
  indicator.innerHTML = "💼";
  indicator.style.cssText = `
    position: absolute;
    top: 5px;
    right: 5px;
    width: 20px;
    height: 20px;
    font-size: 12px;
    opacity: 0.3;
    pointer-events: none;
    z-index: 1000;
    transition: opacity 0.3s ease;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  // Position relative to element
  const rect = element.getBoundingClientRect();
  indicator.style.position = "fixed";
  indicator.style.top = rect.top + 5 + "px";
  indicator.style.right = window.innerWidth - rect.right + 5 + "px";

  document.body.appendChild(indicator);

  // Update position on scroll/resize
  const updatePosition = () => {
    const newRect = element.getBoundingClientRect();
    indicator.style.top = newRect.top + 5 + "px";
    indicator.style.right = window.innerWidth - newRect.right + 5 + "px";
  };

  window.addEventListener("scroll", updatePosition);
  window.addEventListener("resize", updatePosition);

  // Show/hide on focus/blur
  element.addEventListener("focus", () => {
    indicator.style.opacity = "0.6";
  });

  element.addEventListener("blur", () => {
    indicator.style.opacity = "0.3";
  });

  // Store reference for cleanup
  element._toneProIndicator = indicator;
}

// Handle text input events
function handleTextInput(event, element) {
  currentTextElement = element;

  // Clear existing timer
  clearTimeout(debounceTimer);

  // Set new timer for debounced analysis
  debounceTimer = setTimeout(() => {
    analyzeText(element);
  }, CONFIG.debounceMs);
}

// Handle focus events
function handleTextFocus(event, element) {
  currentTextElement = element;
}

// Handle blur events
function handleTextBlur(event, element) {
  // Hide suggestion after a short delay
  setTimeout(() => {
    if (currentTextElement === element) {
      hideSuggestionPopup();
    }
  }, 200);
}

// Get text content from element
function getTextFromElement(element) {
  if (
    element.tagName.toLowerCase() === "textarea" ||
    element.tagName.toLowerCase() === "input"
  ) {
    return element.value;
  } else if (element.contentEditable === "true") {
    return element.innerText || element.textContent;
  }
  return "";
}

// Set text content to element
function setTextToElement(element, text) {
  if (
    element.tagName.toLowerCase() === "textarea" ||
    element.tagName.toLowerCase() === "input"
  ) {
    element.value = text;
  } else if (element.contentEditable === "true") {
    element.innerText = text;
  }

  // Trigger input event
  const event = new Event("input", { bubbles: true });
  element.dispatchEvent(event);
}

// Analyze text content
async function analyzeText(element) {
  const text = getTextFromElement(element).trim();

  // Check minimum word count
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  if (words.length < CONFIG.wordThreshold) {
    hideSuggestionPopup();
    return;
  }

  // Avoid duplicate processing
  if (isProcessing) {
    return;
  }

  isProcessing = true;

  try {
    console.log(
      "Tone Professional: Analyzing text:",
      text.substring(0, 100) + "..."
    );

    // Send message to background script
    const response = await chrome.runtime.sendMessage({
      action: "analyzeTone",
      text: text,
    });

    if (response.error) {
      console.error("Analysis error:", response.error);
      showErrorMessage(response.error);
    } else if (response.hasIssues) {
      showSuggestionPopup(element, response);
    } else {
      hideSuggestionPopup();
      console.log("Tone Professional: Text appears professional");
    }
  } catch (error) {
    console.error("Tone Professional: Analysis failed:", error);
    showErrorMessage("Analysis failed. Please try again.");
  } finally {
    isProcessing = false;
  }
}

// Show suggestion popup
function showSuggestionPopup(element, analysis) {
  // Remove existing popup
  hideSuggestionPopup();

  // Create popup element
  const popup = document.createElement("div");
  popup.className = "tone-pro-suggestion-popup";
  popup.innerHTML = createPopupHTML(analysis);

  // Apply styles
  popup.style.cssText = `
    position: fixed;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    width: 400px;
    max-width: calc(100vw - 40px);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    animation: tone-pro-slideIn 0.3s ease-out;
  `;

  // Add to document
  document.body.appendChild(popup);
  currentSuggestionPopup = popup;

  // Position popup
  positionPopup(popup, element);

  // Add event listeners
  addPopupEventListeners(popup, element, analysis);

  console.log("Tone Professional: Showing suggestion popup");
}

// Create popup HTML content
function createPopupHTML(analysis) {
  const issuesHTML = analysis.issues
    .map((issue) => `<li>${escapeHtml(issue)}</li>`)
    .join("");

  return `
    <div style="display: flex; align-items: center; padding: 16px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; border-radius: 12px 12px 0 0;">
      <span style="font-size: 20px; margin-right: 10px;">💡</span>
      <span style="font-weight: 600; color: #2d3748; flex: 1;">Tone Suggestion</span>
      <button class="tone-pro-close" style="background: none; border: none; font-size: 20px; color: #a0aec0; cursor: pointer; padding: 0; width: 24px; height: 24px; border-radius: 4px;">×</button>
    </div>
    <div style="padding: 20px;">
      <div style="margin-bottom: 20px;">
        <div style="color: #e53e3e; font-size: 14px; font-weight: 600; margin-bottom: 8px;">Issues found:</div>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${issuesHTML}
        </ul>
      </div>
      <div style="margin-bottom: 16px;">
        <div style="color: #2d3748; font-size: 14px; font-weight: 600; margin-bottom: 8px;">Suggested revision:</div>
        <div style="background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; color: #2d3748; line-height: 1.5;">
          ${escapeHtml(analysis.suggestion)}
        </div>
      </div>
      <div style="color: #718096; font-style: italic; font-size: 13px; margin-bottom: 20px;">
        ${escapeHtml(analysis.explanation)}
      </div>
      <div style="display: flex; gap: 12px;">
        <button class="tone-pro-accept" style="padding: 12px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; background: #3182ce; color: white; flex: 1; transition: all 0.2s ease;">
          Accept Suggestion
        </button>
        <button class="tone-pro-dismiss" style="padding: 12px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; background: #edf2f7; color: #4a5568; flex: 1; transition: all 0.2s ease;">
          Dismiss
        </button>
      </div>
    </div>
  `;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Position popup relative to text element
function positionPopup(popup, element) {
  const rect = element.getBoundingClientRect();

  // Position below the element
  popup.style.top = rect.bottom + 10 + "px";
  popup.style.left = rect.left + "px";

  // Adjust if popup goes off screen
  setTimeout(() => {
    const popupRect = popup.getBoundingClientRect();

    // Adjust horizontal position
    if (popupRect.right > window.innerWidth) {
      popup.style.left = window.innerWidth - popupRect.width - 20 + "px";
    }
    if (popupRect.left < 0) {
      popup.style.left = "20px";
    }

    // Adjust vertical position
    if (popupRect.bottom > window.innerHeight) {
      popup.style.top = rect.top - popupRect.height - 10 + "px";
    }
    if (popup.getBoundingClientRect().top < 0) {
      popup.style.top = "20px";
    }
  }, 10);
}

// Add event listeners to popup buttons
function addPopupEventListeners(popup, element, analysis) {
  // Close button
  const closeBtn = popup.querySelector(".tone-pro-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      hideSuggestionPopup();
    });

    closeBtn.addEventListener("mouseenter", () => {
      closeBtn.style.background = "#edf2f7";
      closeBtn.style.color = "#4a5568";
    });

    closeBtn.addEventListener("mouseleave", () => {
      closeBtn.style.background = "none";
      closeBtn.style.color = "#a0aec0";
    });
  }

  // Accept button
  const acceptBtn = popup.querySelector(".tone-pro-accept");
  if (acceptBtn) {
    acceptBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      setTextToElement(element, analysis.suggestion);
      hideSuggestionPopup();
      console.log("Tone Professional: Suggestion accepted");
    });

    acceptBtn.addEventListener("mouseenter", () => {
      acceptBtn.style.background = "#2c5aa0";
      acceptBtn.style.transform = "translateY(-1px)";
    });

    acceptBtn.addEventListener("mouseleave", () => {
      acceptBtn.style.background = "#3182ce";
      acceptBtn.style.transform = "translateY(0)";
    });
  }

  // Dismiss button
  const dismissBtn = popup.querySelector(".tone-pro-dismiss");
  if (dismissBtn) {
    dismissBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      hideSuggestionPopup();
    });

    dismissBtn.addEventListener("mouseenter", () => {
      dismissBtn.style.background = "#e2e8f0";
    });

    dismissBtn.addEventListener("mouseleave", () => {
      dismissBtn.style.background = "#edf2f7";
    });
  }
}

// Hide suggestion popup
function hideSuggestionPopup() {
  if (currentSuggestionPopup) {
    currentSuggestionPopup.remove();
    currentSuggestionPopup = null;
  }
}

// Show error message
function showErrorMessage(message) {
  console.error("Tone Professional:", message);

  // Create simple error notification
  const errorDiv = document.createElement("div");
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #fed7d7;
    color: #9b2c2c;
    padding: 12px 16px;
    border-radius: 8px;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    max-width: 300px;
    animation: tone-pro-slideIn 0.3s ease-out;
  `;
  errorDiv.textContent = `Tone Professional: ${message}`;

  document.body.appendChild(errorDiv);

  // Remove after 5 seconds
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
  }, 5000);
}

// Handle document clicks to dismiss popups
function handleDocumentClick(event) {
  if (
    currentSuggestionPopup &&
    !currentSuggestionPopup.contains(event.target)
  ) {
    // Don't hide if clicking on the current text element
    if (currentTextElement && currentTextElement.contains(event.target)) {
      return;
    }
    hideSuggestionPopup();
  }
}

// Add CSS styles
function addStyles() {
  if (document.getElementById("tone-pro-styles")) return;

  const style = document.createElement("style");
  style.id = "tone-pro-styles";
  style.textContent = `
    @keyframes tone-pro-slideIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .tone-pro-suggestion-popup ul li {
      color: #718096 !important;
      font-size: 14px !important;
      margin-bottom: 4px !important;
      padding-left: 16px !important;
      position: relative !important;
    }
    
    .tone-pro-suggestion-popup ul li::before {
      content: "•" !important;
      color: #e53e3e !important;
      position: absolute !important;
      left: 0 !important;
    }
  `;
  document.head.appendChild(style);
}

// Start the content script
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
