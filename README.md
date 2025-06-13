# 💼 Tone Professional - Chrome Extension

A Chrome extension prototype that analyzes tone and professionalism in your writing, similar to Grammarly but focused on communication style.

## Features

- **Real-time Tone Analysis**: Automatically analyzes your writing as you type
- **Professional Suggestions**: Provides alternative phrasing for aggressive or unprofessional language
- **Universal Support**: Works on any website with text input (Gmail, Slack, LinkedIn, etc.)
- **AI-Powered**: Uses OpenAI or DeepSeek APIs for intelligent analysis
- **Development Mode**: Includes mock responses for testing without API calls

## Installation

1. **Download/Clone** this repository to your local machine
2. **Open Chrome** and go to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top-right corner)
4. **Click "Load unpacked"** and select the extension folder
5. **Pin the extension** by clicking the puzzle icon and pinning "Tone Professional"

## Usage

### Basic Usage

1. Navigate to any website with text input (Gmail, Slack, etc.)
2. Start typing in any text field
3. If tone issues are detected, a suggestion popup will appear
4. Click "Accept Suggestion" to replace your text, or "Dismiss" to ignore

### Keyboard Shortcuts

- **Ctrl/Cmd + Shift + T**: Manual tone check on current text field

### Settings

Click the extension icon to access settings:

- **Auto-check while typing**: Enable/disable automatic analysis
- **Minimum word count**: Set threshold for analysis
- **API Configuration**: Choose between OpenAI and DeepSeek
- **Development Mode**: Use mock responses for testing

## API Setup

### OpenAI Setup

1. Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Open extension settings
3. Uncheck "Use mock API"
4. Select "OpenAI" as provider
5. Enter your API key

### DeepSeek Setup

1. Get an API key from [DeepSeek Platform](https://platform.deepseek.com/api_keys)
2. Open extension settings
3. Uncheck "Use mock API"
4. Select "DeepSeek" as provider
5. Enter your API key

## File Structure

```
├── manifest.json       # Extension manifest (V3)
├── background.js       # Service worker for API calls
├── content.js         # Content script for text detection
├── styles.css         # UI styling
├── popup.html         # Settings popup HTML
├── popup.js          # Settings popup JavaScript
└── README.md         # This file
```

## Development

The extension starts in **development mode** with mock API responses. This allows you to test the UI and functionality without API costs.

### Mock Responses

The extension includes pre-configured responses for:

- "I need this done immediately!" → Professional alternative
- "You're wrong about this." → Collaborative alternative
- Generic text → "Already professional" response

### Testing

1. Open any website with text input
2. Type one of the test phrases above
3. Observe the suggestion popup
4. Test the "Accept" and "Dismiss" buttons

## Browser Compatibility

- **Chrome**: Fully supported (Manifest V3)
- **Edge**: Compatible (Chromium-based)
- **Firefox**: Not supported (uses different extension API)

## Privacy & Security

- **No Data Storage**: Text is only sent to chosen AI provider
- **Local Processing**: All UI logic runs locally
- **Secure API Calls**: API keys stored locally in Chrome storage
- **No Tracking**: Extension doesn't collect usage data

## Troubleshooting

### Extension Not Working

1. Check if developer mode is enabled
2. Reload the extension in `chrome://extensions/`
3. Check browser console for errors

### API Errors

1. Verify your API key is correct
2. Check your API provider account has credits
3. Test API connection using the "Test API" button

### Suggestions Not Appearing

1. Ensure auto-check is enabled in settings
2. Check minimum word count setting
3. Try manual check with Ctrl/Cmd+Shift+T

## Known Limitations

- Some websites with complex text editors may not be fully supported
- API rate limits apply based on your provider plan
- Extension requires internet connection for real API calls

## Contributing

This is a prototype. To enhance:

1. Add support for more text editor types
2. Improve tone analysis prompts
3. Add more sophisticated UI animations
4. Implement offline mode with local models

## License

MIT License - Feel free to modify and use for your projects.
