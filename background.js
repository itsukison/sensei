// Background service worker for Tone Professional extension
// Handles API calls to DeepSeek for tone analysis

// Hardcoded DeepSeek API key for immediate functionality
const DEEPSEEK_API_KEY = "sk-74913ab4d40646309858d09c753ec4be"; // Replace with your actual DeepSeek API key

// System prompt for tone analysis
const SYSTEM_PROMPT = `You are a professional communication assistant. Analyze the given text for tone and professionalism. 

Your task:
1. Identify any coercive, aggressive, passive-aggressive, or unprofessional phrasing
2. Suggest a more professional, polite, and constructive alternative
3. Maintain the original intent and key information

Respond with ONLY a valid JSON object (no markdown, no code blocks, no extra text) containing:
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
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return parseAIResponse(data.choices[0].message.content);
  } catch (error) {
    console.error("OpenAI API call failed:", error);
    throw error;
  }
}

// Helper function to clean and parse AI response
function parseAIResponse(content) {
  // Remove markdown code blocks if present
  let cleanContent = content.replace(/```json\s*/g, "").replace(/```\s*/g, "");

  // Remove any leading/trailing whitespace
  cleanContent = cleanContent.trim();

  // Find the JSON object (look for first { and last })
  const firstBrace = cleanContent.indexOf("{");
  const lastBrace = cleanContent.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleanContent = cleanContent.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleanContent);
  } catch (error) {
    console.error("Failed to parse AI response:", cleanContent);
    throw new Error("Invalid JSON response from AI");
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
          max_tokens: 300,
          temperature: 0.3,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    return parseAIResponse(data.choices[0].message.content);
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
  // Get stored settings for user preferences
  const settings = await chrome.storage.sync.get(["useMockApi"]);

  // Use real DeepSeek API by default, unless user explicitly wants mock
  if (settings.useMockApi === true) {
    console.log("Using mock API (user preference)");
    return await getMockResponse(text);
  }

  // Use real DeepSeek API with hardcoded key
  try {
    console.log("Analyzing tone with DeepSeek API...");
    return await callDeepSeek(text, DEEPSEEK_API_KEY);
  } catch (error) {
    console.error("DeepSeek API call failed, using mock response:", error);
    // Fallback to mock if API fails
    return await getMockResponse(text);
  }
}

// Extension installation handler
chrome.runtime.onInstalled.addListener(() => {
  console.log("Tone Professional extension installed");

  // Set default settings
  chrome.storage.sync.set({
    useMockApi: false, // Use real DeepSeek API by default
    autoCheck: true,
    minWordCount: 5,
  });
});
