// Content script for Tone Professional extension
// Detects user input and provides tone suggestions

class ToneProfessional {
  constructor() {
    this.currentElement = null;
    this.suggestionBox = null;
    this.isAnalyzing = false;
    this.debounceTimer = null;
    this.settings = {
      autoCheck: true,
      minWordCount: 5,
    };

    this.init();
  }

  async init() {
    // Load settings
    await this.loadSettings();

    // Initialize the suggestion UI
    this.createSuggestionBox();

    // Start monitoring for text input
    this.startMonitoring();

    console.log("Tone Professional: Content script initialized");
  }

  async loadSettings() {
    try {
      const stored = await chrome.storage.sync.get([
        "autoCheck",
        "minWordCount",
      ]);
      this.settings = { ...this.settings, ...stored };
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  }

  startMonitoring() {
    // Monitor for focus on text input elements
    document.addEventListener("focusin", (e) => {
      if (this.isTextInputElement(e.target)) {
        this.currentElement = e.target;
        this.attachInputListener(e.target);
      }
    });

    // Monitor for focus out to hide suggestions
    document.addEventListener("focusout", (e) => {
      // Delay hiding to allow clicking on suggestion box
      setTimeout(() => {
        if (!this.suggestionBox?.matches(":hover")) {
          this.hideSuggestionBox();
        }
      }, 100);
    });

    // Handle keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      // Ctrl/Cmd + Shift + T to trigger manual check
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "T") {
        e.preventDefault();
        this.manualCheck();
      }
    });
  }

  isTextInputElement(element) {
    // Check for textarea elements
    if (element.tagName === "TEXTAREA") {
      return true;
    }

    // Check for input elements with text types
    if (element.tagName === "INPUT") {
      const textTypes = ["text", "email", "search", "url"];
      return textTypes.includes(element.type);
    }

    // Check for contenteditable elements
    if (element.contentEditable === "true" || element.isContentEditable) {
      return true;
    }

    // Check for common text input classes/attributes (e.g., Slack, Discord)
    const textInputSelectors = [
      '[role="textbox"]',
      '[contenteditable="true"]',
      ".ql-editor", // Quill editor
      ".public-DraftEditor-content", // Draft.js
      ".notranslate", // Google Docs
    ];

    return textInputSelectors.some((selector) => element.matches(selector));
  }

  attachInputListener(element) {
    // Remove existing listener
    element.removeEventListener("input", this.handleInput);

    // Add new listener
    this.handleInput = this.debounce((e) => {
      if (this.settings.autoCheck) {
        this.checkTone(element);
      }
    }, 1000);

    element.addEventListener("input", this.handleInput);
  }

  debounce(func, wait) {
    return (...args) => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => func.apply(this, args), wait);
    };
  }

  async manualCheck() {
    if (this.currentElement && this.isTextInputElement(this.currentElement)) {
      await this.checkTone(this.currentElement);
    }
  }

  async checkTone(element) {
    const text = this.getElementText(element);

    // Check minimum word count
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount < this.settings.minWordCount) {
      this.hideSuggestionBox();
      return;
    }

    // Avoid checking the same text repeatedly
    if (text === this.lastCheckedText) {
      return;
    }
    this.lastCheckedText = text;

    // Show loading state
    this.showLoadingState(element);

    try {
      // Send text to background script for analysis
      const response = await chrome.runtime.sendMessage({
        action: "analyzeTone",
        text: text,
      });

      if (response.success && response.data.hasIssues) {
        this.showSuggestion(element, response.data);
      } else {
        this.hideSuggestionBox();
      }
    } catch (error) {
      console.error("Tone analysis failed:", error);
      this.hideSuggestionBox();
    }
  }

  getElementText(element) {
    if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
      return element.value;
    } else {
      return element.textContent || element.innerText || "";
    }
  }

  setElementText(element, text) {
    if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
      element.value = text;
    } else {
      element.textContent = text;
    }

    // Trigger input event to notify other scripts
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }

  createSuggestionBox() {
    this.suggestionBox = document.createElement("div");
    this.suggestionBox.id = "tone-professional-suggestion";
    this.suggestionBox.className = "tone-suggestion-box";
    this.suggestionBox.style.display = "none";

    document.body.appendChild(this.suggestionBox);
  }

  showLoadingState(element) {
    this.suggestionBox.innerHTML = `
      <div class="tone-suggestion-loading">
        <div class="loading-spinner"></div>
        <span>Analyzing tone...</span>
      </div>
    `;
    this.positionSuggestionBox(element);
    this.suggestionBox.style.display = "block";
  }

  showSuggestion(element, analysis) {
    const { issues, suggestion, explanation } = analysis;

    this.suggestionBox.innerHTML = `
      <div class="tone-suggestion-header">
        <span class="tone-icon">💼</span>
        <span class="tone-title">Tone Suggestion</span>
        <button class="tone-close" onclick="this.closest('.tone-suggestion-box').style.display='none'">×</button>
      </div>
      
      <div class="tone-suggestion-content">
        <div class="tone-issues">
          <strong>Issues found:</strong>
          <ul>
            ${issues.map((issue) => `<li>${issue}</li>`).join("")}
          </ul>
        </div>
        
        <div class="tone-suggestion-text">
          <strong>Suggested revision:</strong>
          <p class="suggestion-text">${suggestion}</p>
        </div>
        
        <div class="tone-explanation">
          <small>${explanation}</small>
        </div>
        
        <div class="tone-actions">
          <button class="tone-accept-btn" onclick="window.toneProfessional.acceptSuggestion('${encodeURIComponent(
            suggestion
          )}')">
            Accept Suggestion
          </button>
          <button class="tone-dismiss-btn" onclick="window.toneProfessional.hideSuggestionBox()">
            Dismiss
          </button>
        </div>
      </div>
    `;

    this.positionSuggestionBox(element);
    this.suggestionBox.style.display = "block";
  }

  positionSuggestionBox(element) {
    const rect = element.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    // Position below the element
    let top = rect.bottom + scrollY + 5;
    let left = rect.left + scrollX;

    // Adjust if suggestion box would go off-screen
    const boxWidth = 350;
    const boxHeight = 200;

    if (left + boxWidth > window.innerWidth) {
      left = window.innerWidth - boxWidth - 10;
    }

    if (top + boxHeight > window.innerHeight + scrollY) {
      top = rect.top + scrollY - boxHeight - 5;
    }

    this.suggestionBox.style.left = `${Math.max(10, left)}px`;
    this.suggestionBox.style.top = `${Math.max(10, top)}px`;
  }

  acceptSuggestion(encodedSuggestion) {
    const suggestion = decodeURIComponent(encodedSuggestion);

    if (this.currentElement) {
      this.setElementText(this.currentElement, suggestion);
      this.hideSuggestionBox();

      // Focus back on the element
      this.currentElement.focus();
    }
  }

  hideSuggestionBox() {
    if (this.suggestionBox) {
      this.suggestionBox.style.display = "none";
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.toneProfessional = new ToneProfessional();
  });
} else {
  window.toneProfessional = new ToneProfessional();
}
