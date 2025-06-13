# 🚀 Quick Setup Guide

## Add Your DeepSeek API Key

To enable real-time tone analysis, you need to add your DeepSeek API key:

### Step 1: Get DeepSeek API Key

1. Go to [DeepSeek Platform](https://platform.deepseek.com/api_keys)
2. Sign up or log in
3. Create a new API key
4. Copy the key (starts with `sk-`)

### Step 2: Add Key to Extension

1. Open `background.js` in your code editor
2. Find this line (around line 5):
   ```javascript
   const DEEPSEEK_API_KEY = "sk-your-deepseek-api-key-here";
   ```
3. Replace `"sk-your-deepseek-api-key-here"` with your actual API key
4. Save the file

### Step 3: Reload Extension

1. Go to `chrome://extensions/`
2. Find "Tone Professional" extension
3. Click the refresh icon to reload it

## That's it! 🎉

The extension will now use real DeepSeek API for tone analysis. You can:

- Test it on any website with text input
- Toggle between real API and mock responses in extension settings
- Type phrases like "I need this done immediately!" to see suggestions

## Example API Key Format

```javascript
const DEEPSEEK_API_KEY = "sk-1234567890abcdef1234567890abcdef";
```

**Security Note:** This method embeds the API key in the extension code. For production use, consider using a backend server to handle API calls securely.
