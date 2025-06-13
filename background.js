// Background service worker for Tone Professional extension
// Handles API calls to OpenAI/DeepSeek for tone analysis

// System prompt for tone analysis
const SYSTEM_PROMPT = `You are a professional communication assistant. Analyze the given text for tone and professionalism. 

Your task:
1. Identify any coercive, aggressive, passive-aggressive, or unprofessional phrasing
2. Suggest a more professional, polite, and constructive alternative
3. Maintain the original intent and key information

Respond with a JSON object containing:
{
  "hasIssues": boolean,
  "issues": ["list of specific tone issues found"],
  "suggestion": "professional alternative text",
  "explanation": "brief explanation of improvements made"
}

If the text is already professional, set hasIssues to false and return the original text as suggestion.`;

// Mock API response for development/testing
function getMockResponse(text) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockResponses = {
        "I need this done immediately!": {
          hasIssues: true,
          issues: ["Demanding tone", "Lacks politeness"],
          suggestion:
            "I would appreciate if this could be completed at your earliest convenience.",
          explanation: "Replaced demanding language with polite request",
        },
        "You're wrong about this.": {
          hasIssues: true,
          issues: ["Direct contradiction", "Dismissive tone"],
          suggestion:
            "I have a different perspective on this matter. Could we discuss the details?",
          explanation:
            "Transformed direct contradiction into collaborative discussion",
        },
        default: {
          hasIssues: false,
          issues: [],
          suggestion: text,
          explanation: "Text appears professional",
        },
      };

      resolve(mockResponses[text] || mockResponses.default);
    }, 500);
  });
}

// Real API call to OpenAI
async function callOpenAI(text, apiKey) {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error("OpenAI API call failed:", error);
    throw error;
  }
}

// Real API call to DeepSeek
async function callDeepSeek(text, apiKey) {
  try {
    const response = await fetch(
      "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: text },
          ],
          max_tokens: 200,
          temperature: 0.3,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error("DeepSeek API call failed:", error);
    throw error;
  }
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "analyzeTone") {
    handleToneAnalysis(request.text)
      .then((response) => sendResponse({ success: true, data: response }))
      .catch((error) => sendResponse({ success: false, error: error.message }));

    return true; // Will respond asynchronously
  }
});

// Main tone analysis handler
async function handleToneAnalysis(text) {
  // Get stored settings
  const settings = await chrome.storage.sync.get([
    "apiProvider",
    "openaiKey",
    "deepseekKey",
    "useMockApi",
  ]);

  // For development/testing, use mock API by default
  if (settings.useMockApi !== false) {
    console.log("Using mock API for development");
    return await getMockResponse(text);
  }

  // Use real API based on settings
  const provider = settings.apiProvider || "openai";

  try {
    if (provider === "openai" && settings.openaiKey) {
      return await callOpenAI(text, settings.openaiKey);
    } else if (provider === "deepseek" && settings.deepseekKey) {
      return await callDeepSeek(text, settings.deepseekKey);
    } else {
      // Fallback to mock if no API key configured
      console.warn("No API key configured, using mock response");
      return await getMockResponse(text);
    }
  } catch (error) {
    console.error("API call failed, using mock response:", error);
    return await getMockResponse(text);
  }
}

// Extension installation handler
chrome.runtime.onInstalled.addListener(() => {
  console.log("Tone Professional extension installed");

  // Set default settings
  chrome.storage.sync.set({
    useMockApi: true, // Start with mock API for development
    apiProvider: "openai",
    autoCheck: true,
    minWordCount: 5,
  });
});
