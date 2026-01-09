# AEP Custom Scripts (TypeScript)

TypeScript-based data fetchers for Adobe Experience Platform (AEP) Data Collection. These scripts are designed to be embedded as custom code in AEP Data Elements and can also be tested standalone in browser consoles.

> **⚡ Recent Updates (Dec 2025)**:
>
> - **Direct Promise Returns**: Removed IIFE wrapper for proper AEP Launch Promise support
> - **Clean Formatting**: Output code now starts at column 0 with no extra indentation
> - See [AEP_PROMISE_FIX.md](AEP_PROMISE_FIX.md) for technical details

## Features

- ✅ **TypeScript-first**: Full type safety and modern JavaScript features
- 🔧 **DRY Architecture**: Shared utilities eliminate code duplication
- ⚡ **esbuild-Powered**: Lightning-fast builds with optimal bundle sizes
- 🎯 **ES2017 Output**: Promise `.then()` chains (no `async/await`) for maximum AEP compatibility
- 🔓 **Direct Promise Returns**: No IIFE wrapper - AEP Launch natively supports ES6+ Promises
- 📖 **Readable Output**: No minification, clean indentation - AEP handles minification automatically
- 🧪 **Dual-mode**: Easy browser console testing with TEST_MODE flag
- 📝 **Well-documented**: Comprehensive TypeScript types and JSDoc comments
- 🚀 **Zero Configuration**: Direct script-to-bundle workflow

## Quick Start

### Installation

```bash
npm install
```

### Environment Variables

This project uses environment variables to control build behavior. Create a `.env` file in the project root (you can copy `.env.example` as a template):

```bash
cp .env.example .env
```

**Available Variables**:

- **`TEST_MODE`** (optional): Controls whether builds include test mode features
  - Set to `'true'` or `'1'` to enable test mode (adds console output and test wrappers)
  - Set to `'false'` or leave unset for production builds
  - Default: `false` (production mode)
  - Example: `TEST_MODE=true npm run build`

**Note**: The `.env` file is gitignored and will not be committed. Use `.env.example` as a template for your local configuration.

### Creating a New Script (Streamlined!)

```bash
# 1. Copy the template
cp src/scripts/helloWorld.ts src/scripts/myScript.ts

# 2. Edit your script (add your logic)

# 3. Build
TEST_MODE=false npm run build

# 4. Deploy build/myScript.js to AEP
```

**That's it!** esbuild handles everything automatically!

### Building Existing Scripts

```bash
npm run build
```

This automatically (**using esbuild**):

1. Auto-discovers all scripts in `src/scripts/`
2. Bundles each script with all utilities inlined
3. Transpiles to ES2017 JavaScript (Promises, no `async/await`)
4. Adds direct return pattern (no IIFE wrapper):
   - Pattern: `const TEST_MODE = false; ... return scriptName(TEST_MODE);`
   - Scripts with async operations return Promises via `.then()` chains
   - AEP Launch natively awaits returned Promises (ES6+ support)
   - Clean indentation - code starts at column 0
5. Outputs readable, production-ready files to `build/` (~4-5KB each)

**Note**: No minification applied, clean formatting - AEP handles minification automatically!

### Available Scripts

After building, you'll find these bundled scripts in `build/`:

- **`fetchEventData.js`** - Adobe Events event data fetcher (API call)
- **`getEventData.js`** - Adobe Events event data getter (from window object)
- **`extractAttendeeData.js`** - Adobe Events attendee data extractor
- **`extractPartnerData.js`** - Partner cookie data extractor
- **`extractPublisherId.js`** - Publisher/Owner ID extractor
- **`customOnPageLoad.js`** - Custom on page load placeholder script
- **`customDataCollectionOnBeforeEventSend.js`** - Before event send callback
- **`customDataCollectionOnFilterClickCallback.js`** - Filter click callback with card tracking
- **`helloWorld.js`** - Template example (for reference)

## 📥 Download Latest Scripts

### Quick Access for Teammates

Ready-to-deploy bundled scripts (committed to repository):

- **[fetchEventData.js](build/fetchEventData.js)** - Adobe Events event data fetcher (API call)
- **[getEventData.js](build/getEventData.js)** - Adobe Events event data getter (from window)
- **[extractAttendeeData.js](build/extractAttendeeData.js)** - Adobe Events attendee data extractor
- **[extractPartnerData.js](build/extractPartnerData.js)** - Partner cookie extractor
- **[extractPublisherId.js](build/extractPublisherId.js)** - Publisher ID extractor
- **[customOnPageLoad.js](build/customOnPageLoad.js)** - Custom on page load placeholder
- **[customDataCollectionOnBeforeEventSend.js](build/customDataCollectionOnBeforeEventSend.js)** - Before event send callback
- **[customDataCollectionOnFilterClickCallback.js](build/customDataCollectionOnFilterClickCallback.js)** - Filter click callback with card tracking

**To use**: Click the link → Click "Raw" → Copy all → Paste into AEP Data Element

### Production Releases

For stable, versioned deployments see [Releases](../../releases) page.

## Deploying to AEP

1. Download the script you need from links above (or run `npm run build` locally)
2. Copy the **entire** bundled code
3. Paste into AEP Data Element as custom code
4. Save and test!

**Note**: The code you paste will be readable (not minified). AEP automatically minifies custom code blocks when you save them.

## Project Structure

```
aep-custom-scripts/
├── src/
│   ├── scripts/           # Main script implementations
│   │   ├── fetchEventData.ts                           # Fetches event data via API
│   │   ├── getEventData.ts                             # Gets event data from window
│   │   ├── extractAttendeeData.ts                      # Extracts attendee data
│   │   ├── extractPartnerData.ts                       # Extracts partner cookie data
│   │   ├── extractPublisherId.ts                       # Extracts publisher ID
│   │   ├── customOnPageLoad.ts                         # Custom on page load placeholder
│   │   ├── customDataCollectionOnBeforeEventSend.ts    # Before event send callback
│   │   ├── customDataCollectionOnFilterClickCallback.ts # Filter click with card tracking
│   │   └── helloWorld.ts                               # Template for new scripts
│   ├── utils/             # Shared utilities (DRY)
│   │   ├── logger.ts      # Consistent logging
│   │   ├── fetch.ts       # Fetch with timeout
│   │   ├── cookie.ts      # Cookie parsing
│   │   ├── storage.ts     # LocalStorage helpers
│   │   ├── validation.ts  # Input validation
│   │   ├── dom.ts         # DOM manipulation & shadow DOM helpers
│   │   ├── object.ts      # Object utilities
│   │   ├── constants.ts   # Shared constants
│   │   └── dates.ts       # Date utilities
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts       # Common types (PartnerCardCtx, etc.)
│   └── index.ts           # Main exports
├── scripts/
│   └── buildWithEsbuild.js  # esbuild-based build script
├── build/                 # Bundled scripts (ready for AEP)
│   ├── fetchEventData.js
│   ├── getEventData.js
│   ├── extractAttendeeData.js
│   ├── extractPartnerData.js
│   ├── extractPublisherId.js
│   ├── customOnPageLoad.js
│   ├── customDataCollectionOnBeforeEventSend.js
│   └── customDataCollectionOnFilterClickCallback.js
├── tsconfig.json          # TypeScript configuration
└── package.json           # Project metadata
```

## Script Descriptions

### 1. Event Data Fetcher (`fetchEventData`)

Fetches event data from Adobe Events pages via API.

**Use on**: `*.adobeevents.com` pages

**Returns**: Promise that resolves to event data object (from `/api/event.json?meta=true`) or `null` on error

**Note**: This script makes an API call and stores the result on `window._adobePartners.eventData.apiResponse`. The data is also returned directly as a Promise.

**Configuration** (default in source):

```typescript
const config = {
  timeout: 10000, // Request timeout in ms
  debug: false, // Enable debug logging
};
```

### 2. Event Data Getter (`getEventData`)

Gets event data from `window._adobePartners.eventData.apiResponse` on Adobe Events pages.

**Use on**: `*.adobeevents.com` pages

**Returns**: Event data object (from `window._adobePartners.eventData.apiResponse`) or `null` if not found

**Note**: This script retrieves data previously stored by `fetchEventData`. Use this in data elements that need the event data after it's been fetched.

**Configuration** (default in source):

```typescript
const config = {
  debug: false, // Enable debug logging
};
```

### 3. Attendee Data Extractor (`extractAttendeeData`)

Extracts attendee data from localStorage on Adobe Events pages.

**Use on**: `*.adobeevents.com` pages

**Returns**: Attendee data object (from localStorage key `attendeaseMember`) or `null` if not found

**Configuration** (default in source):

```typescript
const config = {
  debug: false, // Enable debug logging
};
```

### 4. Partner Data Extractor (`extractPartnerData`)

Extracts partner data from browser cookies and returns the DXP value.

**How it works**:

- Reads the `partner_data` cookie (customizable)
- Parses the cookie value as URL-decoded JSON
- Extracts and returns the value from the `DXP` key
- Falls back to returning the entire object if no `DXP` key exists

**Returns**: DXP value object (e.g., `{"status": "NOT_PARTNER"}`) or `null` if not found

**Example**: Cookie `{"DXP": {"status": "NOT_PARTNER"}}` → Returns `{"status": "NOT_PARTNER"}`

**Configuration** (default in source):

```typescript
const config = {
  debug: false,
  cookieKey: 'partner_data', // Customize cookie name
};
```

### 5. Publisher ID Extractor (`extractPublisherId`)

Extracts publisher or owner IDs for Adobe Exchange apps by parsing DOM links.

**Use on**: Adobe Exchange pages with publisher links

**How it works**:

- Searches for `<a>` tags with `href` starting with `/publisher/`
- Extracts and validates the publisher ID from the URL path
- Supports UUID and Salesforce ID formats

**Returns**: `string` (publisher/owner ID) or `null`

**Configuration** (default in source):

```typescript
const config = {
  debug: false, // Enable debug logging
};
```

**No API keys required** - this script uses DOM parsing only.

### 6. Custom On Page Load (`customOnPageLoad`)

A placeholder script for custom on-page load functionality.

**Use on**: Any page where you need custom page load logic

**Usage in AEP Launch**:

- Use as a **Rule Action** on page load (Page Bottom or DOM Ready event)
- Customize the script logic as needed for your use case

**Returns**: `null` (placeholder implementation)

**Configuration** (default in source):

```typescript
const config = {
  debug: false, // Enable debug logging
};
```

### 7. Custom Data Collection - Before Event Send (`customDataCollectionOnBeforeEventSend`)

Callback script for Launch Extension's "before event send" hook.

**Use on**: Adobe Partner pages (in Launch Extension configuration)

**Usage in AEP Launch**:

- Paste into Launch Extension → Data Collection → "Edit on before event send callback"
- Automatically extracts partner data from cookies
- Retrieves partner card context from `window._adobePartners.partnerCard.context`
- Sets data in `content.xdm._adobepartners`

**How it works**:

- Skips page view events
- Extracts partner data using `extractPartnerDataScript`
- Retrieves card context from window (pre-populated by filter click callback)
- Sets both in XDM structure

**Returns**: Modified `content` object with partner data and card collection

**Configuration** (default in source):

```typescript
const DEFAULT_COOKIE_KEY = 'partner_data';
```

### 8. Custom Data Collection - Filter Click Callback (`customDataCollectionOnFilterClickCallback`)

Callback script that extracts partner card metadata from clicked elements.

**Use on**: Adobe Partner pages with partner card collections

**Usage in AEP Launch**:

- Use with Launch's before event send callback where `content.clickedElement` is available
- Automatically extracts card metadata by traversing up from clicked element
- Stores data in `window._adobePartners.partnerCard.context`

**How it works**:

- Extracts partner data from cookies using `extractPartnerDataScript`
- Finds partner card element by traversing up from `content.clickedElement`
- Extracts card metadata from shadow DOM (card title, CTA text, position, etc.)
- Stores both partner data and card context in `window._adobePartners`

**Returns**: `void` (stores data in window object)

**Example card context**:

```typescript
{
  cardTitle: "Example Card",
  contentID: "12345",
  contentType: "partner_card",
  ctaText: "Learn More",
  filterContext: "partner-solutions",
  name: "Example Card",
  position: "1",
  sectionID: "partner-cards-section"
}
```

**Configuration** (default in source):

```typescript
const DEFAULT_COOKIE_KEY = 'partner_data';
```

**Shadow DOM Support**: Handles shadow DOM properly by traversing up through shadow roots.

## Browser Console Testing

For testing scripts in the browser console before deploying to AEP:

### Quick Test Mode

1. Build with test mode enabled:

   ```bash
   TEST_MODE=true npm run build
   ```

2. Open the bundled file from `build/<script>.js`

3. Copy entire file contents

4. Paste into browser console and press Enter (the IIFE executes automatically)

5. Check console for `[Script Name Test]` output with formatted results

**Example Output**:

```
================================================================================
EVENT DATA EXTRACTOR - TEST MODE
================================================================================
[Event Data Test] Fetching event data from https://...
[Event Data Test] Event data received {...}
================================================================================
RESULT:
================================================================================
{
  "eventId": "...",
  "eventName": "..."
}
================================================================================
```

## Development

### For Developers: Update Workflow

When you make changes to the TypeScript source:

```bash
# 1. Make your changes in src/
# 2. Build the bundled scripts (IMPORTANT: Set TEST_MODE=false for production!)
TEST_MODE=false npm run build

# 3. Commit both source and built files
git add src/ build/*.js
git commit -m "Update feature XYZ"
git push
```

**Important**:

- Built files (`build/*.js`) are committed to the repository so teammates always have access to the latest scripts
- Always use `TEST_MODE=false` for production builds to ensure debug mode is disabled
- Output files are readable (not minified) - AEP applies minification when you save them

### For Teammates: Getting Latest Scripts

**Option A - Via GitHub** (No build required):

1. Browse to [build/](build/) folder in GitHub
2. Click on the `.js` file you need
3. Click "Raw" button
4. Copy all and paste into AEP

**Option B - Via Git Clone** (No build required):

```bash
git pull
# Files are in build/*.js
```

**Option C - Build Yourself**:

```bash
npm install
TEST_MODE=false npm run build
# Files generated in build/*.js
```

### Available NPM Scripts

```bash
npm run build              # Full build: clean + bundle with esbuild
npm run clean              # Remove dist/ and build/
npm run dev                # TypeScript watch mode
npm run type-check         # Type-check without emitting files
```

### Creating Production Releases

For major versions or production deployments:

```bash
# 1. Build and test
TEST_MODE=false npm run build

# 2. Commit changes
git add .
git commit -m "Release v2.1.0: [describe changes]"

# 3. Create a tag
git tag -a v2.1.0 -m "Release v2.1.0"
git push origin v2.1.0

# 4. Create GitHub Release
# - Go to GitHub → Releases → "Create new release"
# - Choose tag v2.1.0
# - Upload the files from build/*.js (bundled, readable code)
# - Add release notes describing changes
```

Teammates can then download from the [Releases](../../releases) page for stable, production-ready versions.

**Note**: The bundled files are readable JavaScript - AEP will minify them automatically when saved.

### Adding a New Script

1. **Copy the template**:

   ```bash
   cp src/scripts/helloWorld.ts src/scripts/yourScript.ts
   ```

2. **Edit your script**:
   - Update types, config, and logic
   - Import utilities you need from `src/utils/`
   - Follow existing patterns for error handling

3. **Build**:
   ```bash
   TEST_MODE=false npm run build
   ```

That's it! The esbuild system:

- ✅ Auto-discovers your new script
- ✅ Auto-bundles your imported utilities
- ✅ Transpiles to ES2017 automatically
- ✅ Outputs readable code (AEP handles minification)

**See [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) for detailed examples and patterns.**

## Shared Utilities

All scripts use these common utilities (eliminating duplication):

### Logger (`src/utils/logger.ts`)

```typescript
const logger = createLogger(debug, 'Script Name', isTestMode);
logger.log('message', data);
logger.error('error message');
logger.warn('warning message');
```

### Fetch with Timeout (`src/utils/fetch.ts`)

```typescript
const response = await fetchWithTimeout(url, options, timeoutMs);
```

### Cookie Utils (`src/utils/cookie.ts`)

```typescript
const cookie = getCookie('cookie_name');
const parsed = parseJsonCookie(cookie);
```

### LocalStorage Utils (`src/utils/storage.ts`)

```typescript
const data = getStorageItem<MyType>('storage_key');
setStorageItem('key', data);
```

### Validation Utils (`src/utils/validation.ts`)

```typescript
const isValid = isValidPublisherId(publisherId); // Validates UUID or Salesforce ID formats
```

### DOM Utils (`src/utils/dom.ts`)

```typescript
const element = queryShadow(shadowHost, '.selector'); // Query inside shadow DOM
const text = getTextContent(element);
const attr = getAttribute(element, 'attribute-name');
const value = splitAndGet(string, '|', index);
const found = findInComposedPath(event, predicate); // Find element in composed path
const matches = matchesElement(element, tagName, className);
dispatchCustomEvent('eventName', data); // Dispatch custom event
```

### Object Utils (`src/utils/object.ts`)

Object manipulation utilities for data transformation.

### Date Utils (`src/utils/dates.ts`)

Date manipulation and formatting utilities for timestamp handling.

## APIs Used

### Adobe Events API

- **Endpoint**: `/api/event.json?meta=true` (relative to event domain)
- **Method**: GET
- **Auth**: None required (same-origin request)

## Migration from JavaScript

The original JavaScript files (`fetchEventData.js`, etc.) have been refactored into TypeScript with these improvements:

### Before (JavaScript - Duplicated Code)

```javascript
// Each file had its own copy of:
function log(message, data) {
  /* ... */
}
function fetchWithTimeout(url, options, timeoutMs) {
  /* ... */
}
function getCookie(name) {
  /* ... */
}
// ... etc
```

### After (TypeScript - DRY)

```typescript
// Shared utilities imported from common modules:
import { createLogger } from '../utils/logger.js';
import { fetchWithTimeout } from '../utils/fetch.js';
import { getCookie } from '../utils/cookie.js';
```

**Benefits**:

- 🎯 Single source of truth for common functionality
- 🐛 Easier bug fixes (fix once, affects all scripts)
- 📏 Smaller codebase overall
- 🔒 Type safety catches errors at compile time
- 🧪 More testable and maintainable

## Security Features

✅ **Built-in protections**:

1. **Response size validation**: 5MB limit prevents memory exhaustion attacks
2. **Request timeouts**: 10-second default prevents hanging requests
3. **Input validation**: Publisher IDs validated against UUID and Salesforce ID formats
4. **Safe JSON parsing**: All parsing wrapped in try-catch blocks
5. **No credentials required**: Scripts use DOM parsing and same-origin API calls

## Build Output Details

The build process with **esbuild** produces AEP-compatible code:

```
📦 Building: fetchEventData
   Bundling with esbuild...
✅ fetchEventData:
   Original:  2,453 bytes (TypeScript source)
   Bundled:   5,148 bytes
   Wrapped:   5,253 bytes
   Output:    /path/to/build/fetchEventData.js
```

**Key Features**:

- ✅ **ES2015+ output**: Promises with `.then()` chains (no `async/await` keywords)
- ✅ **Readable code**: Full variable names and formatting for easier debugging
- ✅ **Consistent wrapping**: All scripts use synchronous IIFE wrapper
  - `return (() => { ... })()` for all scripts
  - Scripts with async operations return Promises via `.then()` chains
  - Maximum AEP compatibility
- ✅ **Fast builds**: 10-100x faster than webpack-based bundlers
- ✅ **Tree-shaking**: Dead code elimination

**Output Strategy**:

- ✅ No minification (AEP handles this automatically)
- ✅ Readable variable names for easier debugging
- ✅ Clean formatting preserved
- ✅ No `async/await` keywords (uses Promise `.then()` chains instead)

## TypeScript Configuration

The project uses strict TypeScript settings for maximum type safety:

```json
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true
}
```

## Browser Compatibility

**Output Target**: ES2017

**Supported Environments**:

- Chrome/Edge 58+ (2017+)
- Firefox 52+ (2017+)
- Safari 10.1+ (2017+)

**Key ES2017 Features Used**:

- Native async/await
- Object spread operator (transpiled)
- Template literals
- Arrow functions
- Classes

## License

ISC

## Support

For issues or questions:

1. Check existing documentation in this README
2. Review TypeScript types and JSDoc comments in source files
3. Examine the original JavaScript files for behavior reference
