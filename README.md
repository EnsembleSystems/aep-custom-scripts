# AEP Custom Scripts

JavaScript data fetchers for Adobe Experience Platform (AEP) Data Collection. These scripts are designed to be embedded as custom code in AEP Data Elements and can also be tested standalone in browser consoles.

## Quick Start

### For AEP Deployment

1. Open the script file you need (e.g., `fetchEventData.js`)
2. Set `TEST_MODE = false` (around line 16)
3. Copy the code starting from the `return` statement (line 14-15)
4. Paste into AEP Data Element as custom code

### For Browser Console Testing

1. Open the script file you need
2. Set `TEST_MODE = true` (around line 16)
3. Copy the **entire** script
4. Paste into your browser's developer console
5. **Replace** `return` with `await` at the start of the async IIFE
6. Press Enter to execute

**Example:**
```javascript
// Original (for AEP)
return (async () => {
  // ... script code
})();

// Modified (for console testing)
await (async () => {
  // ... script code
})();
```

## Available Scripts

### Publisher/Owner ID Fetcher

Fetches publisher or owner IDs for Adobe Exchange apps.

**`fetchPublisherId.js`** - API-based fetcher for AEP
- Supports Experience Cloud (ec), Document Cloud (dc), and Creative Cloud (cc) apps
- Extracts app type and ID from URL pattern: `/apps/{type}/{id}/`
- Requires API key configuration
- CC apps require additional auth token
- Comprehensive input validation and error handling

### Data Extractors

**`fetchEventData.js`** - Adobe Events data fetcher
- Fetches event data from `/api/event.json?meta=true`
- Retrieves attendee data from localStorage (`attendeaseMember` key)
- Returns combined: `{ eventData, attendeeData }`
- Use on Adobe Events pages (e.g., `*.adobeevents.com`)

**`fetchPartnerData.js`** - Partner cookie data extractor
- Extracts partner data from cookies
- Default cookie key: `partner_data`
- Returns: `{ partnerData }`
- Handles URL-encoded JSON

## Browser Console Testing Guide

### Step-by-Step Instructions

1. **Open Developer Tools**
   - Chrome/Edge: Press `F12` or `Ctrl+Shift+J` (Windows) / `Cmd+Option+J` (Mac)
   - Firefox: Press `F12` or `Ctrl+Shift+K` (Windows) / `Cmd+Option+K` (Mac)
   - Safari: Enable Developer menu in Preferences, then press `Cmd+Option+C`

2. **Navigate to the Console tab**

3. **Prepare the Script**
   - Open the script file in a text editor
   - Set `TEST_MODE = true`
   - Copy the entire script content

4. **Modify for Console**
   - Paste the script into the console
   - **Important**: Change `return (async () => {` to `await (async () => {`
   - This is typically on line 15

5. **Execute**
   - Press `Enter` to run
   - View the formatted output with debug logs

### Example: Testing fetchEventData.js

```javascript
// Navigate to an Adobe Events page first
// Example: https://pelabs-10feb2025.solutionpartners.adobeevents.com/

// Then paste this in console (with TEST_MODE = true):
await (async () => {
  const TEST_MODE = true; // Must be true for console testing

  const CONFIG = {
    timeout: 10000,
    debug: TEST_MODE,
  };

  // ... rest of the script code ...

})();
```

**Expected Output:**
```
================================================================================
EVENT DATA EXTRACTOR - TEST MODE
================================================================================
[Event Data Test] Fetching event data from https://...
[Event Data Test] Event data received {...}
[Event Data Test] Found attendee data {...}
================================================================================
RESULT:
================================================================================
{
  "eventData": { ... },
  "attendeeData": { ... }
}
================================================================================
```

### Example: Testing fetchPublisherId.js

```javascript
// Navigate to an Adobe Exchange app page first
// Example: https://exchange.adobe.com/apps/ec/108203/vibes-sms

// Configure your credentials in CONFIG section
// Then paste in console:
await (async () => {
  const CONFIG = {
    apiKey: "your-api-key-here",
    authToken: "your-auth-token-for-cc-apps",
    timeout: 10000,
    debug: true,
  };

  // ... rest of the script code ...

})();
```

### Troubleshooting Console Testing

**"Unexpected token 'return'"**
- You forgot to change `return` to `await`

**"Uncaught SyntaxError: await is only valid in async functions"**
- Make sure the entire IIFE pattern is correct: `await (async () => { ... })()`

**No output or null result**
- Check if you're on the correct page (e.g., Adobe Events page for fetchEventData)
- Enable debug mode by setting `debug: true` in CONFIG
- Check browser console for error messages

**CORS errors**
- Some APIs may block cross-origin requests
- You may need to be on the correct domain or authenticated

## Configuration

### Publisher ID Fetchers

Update the `CONFIG` object in the script:

```javascript
const CONFIG = {
  apiKey: "your-api-key",           // Required: Your X-Api-Key
  authToken: "your-auth-token",      // Required for CC apps only
  timeout: 10000,                    // Request timeout (ms)
  debug: false,                      // Enable debug logging
};
```

### Event Data Fetcher

```javascript
const CONFIG = {
  timeout: 10000,    // Request timeout (ms)
  debug: TEST_MODE,  // Auto-enabled in test mode
};
```

### Partner Data Fetcher

```javascript
const CONFIG = {
  debug: TEST_MODE,  // Auto-enabled in test mode
};

const COOKIE_KEYS = {
  PARTNER: "partner_data",  // Change if your cookie uses a different key
};
```

## Build & Minify

To minify scripts for production:

```bash
./uglify.sh
```

**Note**: Currently configured to minify `fetchPartnerData.js`. Edit the script to minify other files.

The minification uses uglify-js with these flags:
- `--compress`: Compress the code
- `--mangle`: Mangle variable names
- `--parse bare_returns`: Allow return statements at top level (for AEP)

## API Reference

### Adobe APIs Used

**Creative Cloud Extensions API**
- Endpoint: `https://ccext-public.adobe.io/v3/extensions`
- Method: POST
- Headers: `Authorization`, `X-Api-Key`, `Accept`, `Content-Type`

**App Registry API**
- Endpoint: `https://appregistry.adobe.io/myxchng/v2/apps/{appId}`
- Method: GET
- Headers: `X-Api-Key`

**Adobe Events API**
- Endpoint: `/api/event.json?meta=true` (relative to event domain)
- Method: GET
- Headers: `Accept: application/json`

## Security Notes

⚠️ **Important**: The example scripts contain placeholder API keys and auth tokens.

Before deployment:
1. Replace all API keys with your own credentials
2. Never commit real credentials to version control
3. Use environment-specific configuration for production
4. Rotate auth tokens regularly (they expire)

## File Structure

```
.
├── fetchEventData.js     # Event & attendee data fetcher
├── fetchPartnerData.js   # Partner cookie data extractor
├── fetchPublisherId.js   # Publisher ID fetcher (API-based, for AEP)
├── uglify.sh             # Minification script
├── package.json          # Project metadata
├── .gitignore            # Git ignore rules
├── CLAUDE.md             # Claude Code guidance
└── README.md             # This file
```

## License

ISC
