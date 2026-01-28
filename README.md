# AEP Custom Scripts (TypeScript)

TypeScript-based data fetchers for Adobe Experience Platform (AEP) Data Collection. These scripts are designed to be embedded as custom code in AEP Data Elements and can also be tested standalone in browser consoles.

> **⚡ Recent Updates**:
>
> **January 2026 - v2.0 Architecture Refactor**:
>
> - **Separated filtering from data extraction**: Filter callback now only checks `event.isTrusted` (3KB, 71% smaller)
> - **All data extraction in before-send**: Uses `event.composedPath()` to extract partner data and card metadata
> - **Removed window.\_adobePartners**: No shared state between callbacks - cleaner architecture
> - **Better performance**: Lightweight filter callback, focused responsibilities
>
> **December 2025**:
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
- 🧪 **Runtime Debug Mode**: Toggle debug output via localStorage - no rebuild needed
- 📝 **Well-documented**: Comprehensive TypeScript types and JSDoc comments
- 🚀 **Zero Configuration**: Direct script-to-bundle workflow

## Quick Start

### Installation

```bash
npm install
```

### Debug Mode

Debug mode is controlled at **runtime** via localStorage - no rebuild or environment variables needed:

```javascript
// Enable debug mode in browser DevTools console:
localStorage.setItem('__aep_scripts_debug', 'true');

// Disable debug mode:
localStorage.removeItem('__aep_scripts_debug');
```

**Benefits**:

- Test production-deployed code directly
- No rebuild or redeployment needed
- Toggle debug output on any environment
- Only developers who know the key can enable it

### Creating a New Script (Streamlined!)

Choose the appropriate template based on your needs:

**For async operations** (API calls, fetch, promises):

```bash
# 1. Copy the async template
cp src/scripts/templateAsync.ts src/scripts/myScript.ts

# 2. Edit your script (add your logic)

# 3. Build
npm run build

# 4. Deploy build/myScript.js to AEP
```

**For sync operations** (cookies, localStorage, DOM):

```bash
# 1. Copy the sync template
cp src/scripts/templateSync.ts src/scripts/myScript.ts

# 2. Edit your script (add your logic)

# 3. Build
npm run build

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
   - Pattern: `const TEST_MODE = localStorage.getItem('__aep_scripts_debug') === 'true'; ... return scriptName(TEST_MODE);`
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
- **`templateAsync.js`** - Template for async scripts (for reference)
- **`templateSync.js`** - Template for sync scripts (for reference)

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
│   │   ├── templateAsync.ts                            # Template for async scripts
│   │   └── templateSync.ts                             # Template for sync scripts
│   ├── utils/             # Shared utilities (DRY)
│   │   ├── script.ts      # Script execution wrappers
│   │   ├── logger.ts      # Consistent logging
│   │   ├── fetch.ts       # Fetch with timeout
│   │   ├── cookie.ts      # Cookie parsing
│   │   ├── storage.ts     # LocalStorage helpers
│   │   ├── validation.ts  # Input validation
│   │   ├── dom.ts         # DOM manipulation & shadow DOM helpers
│   │   ├── extraction.ts  # Data extraction pipeline
│   │   ├── object.ts      # Object utilities
│   │   ├── events.ts      # Event handling utilities
│   │   ├── transform.ts   # Data transformation
│   │   ├── url.ts         # URL utilities
│   │   ├── globalState.ts # Window state management
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

## GitHub Workflows

### Chimera Collection to SFTP

**Workflow:** [.github/workflows/fetch-chimera-sftp.yml](.github/workflows/fetch-chimera-sftp.yml)

Automated workflow that fetches card data from the Chimera API and uploads to SFTP for AEP ingestion.

**Schedule:** Runs every 15 minutes via cron, or manually via workflow_dispatch.

**Environments:** Runs in parallel for dev, stage, and prod (configurable via manual trigger).

**Process:**

1. Fetches card collection from Chimera API endpoint
2. Transforms cards using `rollingHash()` for shortened IDs
3. Extracts tag IDs and CTA hrefs (from ctaLink, overlayLink, and footer sections)
4. Generates two NDJSON output files per environment:
   - `chimera-collection-xdm-by-id-{env}.ndjson` - One record per card (keyed by hashed card ID)
   - `chimera-collection-xdm-by-url-{env}.ndjson` - One record per unique URL (keyed by URL)
5. Uploads both files to SFTP server
6. Reports duplicate URLs in workflow summary (URLs appearing in multiple cards)

**XDM Record Format:**

```json
{
  "_id": "hashedId or url",
  "_adobepartners": {
    "caasCard": {
      "id": "hashedId",
      "ctahrefs": ["url1", "url2"],
      "tags": ["tag1", "tag2"],
      "snapshot_ts": "2026-01-23T12:00:00.000Z"
    }
  }
}
```

**Required Repository Configuration:**

| Type     | Name                | Description                                                                                              |
| -------- | ------------------- | -------------------------------------------------------------------------------------------------------- |
| Variable | `CHIMERA_URL_DEV`   | Chimera API URL for dev environment                                                                      |
| Variable | `CHIMERA_URL_STAGE` | Chimera API URL for stage environment                                                                    |
| Variable | `CHIMERA_URL_PROD`  | Chimera API URL for prod environment                                                                     |
| Variable | `ORIGIN_SELECTION`  | Comma-delimited origin filter (e.g., `bacom,experienceleague,news,da-dx-partners`). Leave empty to omit. |
| Variable | `SFTP_HOST`         | SFTP server hostname                                                                                     |
| Variable | `SFTP_PORT`         | SFTP server port (default: 22)                                                                           |
| Variable | `SFTP_USER`         | SFTP username                                                                                            |
| Variable | `SFTP_PATH`         | Remote directory path (default: .)                                                                       |
| Secret   | `SFTP_PRIVATE_KEY`  | SSH private key for SFTP authentication                                                                  |

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

Callback script for Launch Extension's "before event send" hook. **Handles ALL data extraction**.

**Use on**: Adobe Partner pages (in Launch Extension configuration)

**Usage in AEP Launch**:

- Paste into Launch Extension → Data Collection → "Edit on before event send callback"
- Automatically extracts partner data from cookies
- Extracts partner card metadata from `event.composedPath()`
- Sets both in `content.xdm._adobepartners`

**How it works** (v2.0 - Refactored Architecture):

- Skips page view events
- Extracts partner data from cookie using `extractPartnerDataScript`
- Extracts card metadata from event's composed path (uses `event.composedPath()`)
- Finds partner card and wrapper elements in the event path
- Extracts card metadata from shadow DOM (card title, CTA text, position, etc.)
- Sets both partner data and card collection in XDM structure
- **No window.\_adobePartners storage needed** - direct extraction

**Returns**: Modified `content` object with partner data and card collection

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

**Shadow DOM Support**: Uses `event.composedPath()` to traverse through shadow DOM boundaries.

### 8. Custom Data Collection - Filter Click Callback (`customDataCollectionOnFilterClickCallback`)

Click filter callback that validates user-initiated clicks. **Handles ONLY filtering logic**.

**Use on**: Adobe Partner pages with partner card collections

**Usage in AEP Launch**:

- Use with Launch's before event send callback
- Filters out programmatic (non-trusted) click events
- Returns `true` for genuine user clicks, `false` for programmatic clicks

**How it works** (v2.0 - Refactored Architecture):

- Checks if event object is provided
- Validates `event.isTrusted` property
- Returns `false` to suppress programmatic clicks
- Returns `true` to allow genuine user clicks
- **No data extraction** - that happens in before event send callback
- **No window.\_adobePartners storage** - clean separation of concerns

**Returns**: `boolean` - `true` if click should be processed, `false` if suppressed

**Example usage**:

```javascript
// In Launch Extension before event send callback:
const shouldProcess = customDataCollectionOnFilterClickCallback(content, event);
if (!shouldProcess) {
  return; // Suppress programmatic click
}
```

**Architecture Benefits**:

- **Lightweight**: Only ~3KB (was 11KB before refactor)
- **Single responsibility**: Filtering only, no data extraction
- **No side effects**: No window object manipulation
- **Easy to test**: Simple boolean return value

## Browser Console Testing

Debug mode is controlled at runtime via localStorage - no rebuild needed:

### Enable Debug Mode

1. **Enable debug mode** in browser DevTools console:

   ```javascript
   localStorage.setItem('__aep_scripts_debug', 'true');
   ```

2. Reload the page or trigger the script

3. Check console for `[Script Name Test]` output with formatted results

4. **Disable debug mode** when done:

   ```javascript
   localStorage.removeItem('__aep_scripts_debug');
   ```

**Benefits**:

- Test production-deployed code directly
- No rebuild or redeployment needed
- Toggle debug output on any environment
- Only developers who know the key can enable it

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
# 2. Build the bundled scripts
npm run build

# 3. Commit both source and built files
git add src/ build/*.js
git commit -m "Update feature XYZ"
git push
```

**Important**:

- Built files (`build/*.js`) are committed to the repository so teammates always have access to the latest scripts
- Debug mode is controlled at runtime via localStorage (`__aep_scripts_debug`) - no build flags needed
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
npm run build
# Files generated in build/*.js
```

### Available NPM Scripts

```bash
npm run build              # Full build: clean + bundle with esbuild
npm run clean              # Remove dist/ and build/
npm run dev                # TypeScript watch mode
npm run type-check         # Type-check without emitting files
npm run lint               # Lint code
npm run lint:fix           # Lint and fix code
npm run format             # Format code with Prettier
npm run format:check       # Check code formatting
```

### Creating Production Releases

For major versions or production deployments:

```bash
# 1. Build and test
npm run build

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

1. **Copy the appropriate template**:

   For async operations (API calls, fetch):

   ```bash
   cp src/scripts/templateAsync.ts src/scripts/yourScript.ts
   ```

   For sync operations (cookies, localStorage, DOM):

   ```bash
   cp src/scripts/templateSync.ts src/scripts/yourScript.ts
   ```

2. **Edit your script**:
   - Replace "Template" with your script name in types and functions
   - Update config and logic
   - Import utilities you need from `src/utils/`
   - Follow existing patterns for error handling

3. **Build**:
   ```bash
   npm run build
   ```

That's it! The esbuild system:

- ✅ Auto-discovers your new script
- ✅ Auto-bundles your imported utilities
- ✅ Transpiles to ES2017 automatically
- ✅ Outputs readable code (AEP handles minification)

## Shared Utilities

All scripts use common utilities from `src/utils/` (eliminating duplication):

- **`script.ts`** - Script execution wrappers (`executeScript`, `executeAsyncScript`)
- **`logger.ts`** - Consistent logging (`createLogger`)
- **`fetch.ts`** - Fetch with timeout and error helpers
- **`cookie.ts`** - Cookie parsing (`getCookie`, `parseJsonCookie`)
- **`storage.ts`** - LocalStorage helpers (`getStorageItem`, `setStorageItem`)
- **`validation.ts`** - Input validation (UUID, Salesforce ID formats)
- **`dom.ts`** - DOM manipulation with shadow DOM support (`queryShadow`, `findInComposedPath`)
- **`extraction.ts`** - Data extraction pipeline pattern
- **`object.ts`** - Object manipulation utilities
- **`events.ts`** - Event handling utilities
- **`transform.ts`** - Data transformation helpers
- **`url.ts`** - URL utilities
- **`globalState.ts`** - Window state management
- **`constants.ts`** - Shared constants
- **`dates.ts`** - Date utilities

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

- ✅ **ES2017 output**: Promises with `.then()` chains (no `async/await` keywords)
- ✅ **Readable code**: Full variable names and formatting for easier debugging
- ✅ **Direct Promise returns**: No IIFE wrapper needed
  - Pattern: `const TEST_MODE = localStorage.getItem('__aep_scripts_debug') === 'true'; ... return scriptName(TEST_MODE);`
  - Scripts with async operations return Promises via `.then()` chains
  - AEP Launch natively awaits returned Promises
- ✅ **Runtime debug mode**: Toggle via localStorage - no rebuild needed
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

- Promises (`.then()` chains, no `async/await` keywords in output)
- Object spread operator
- Template literals
- Arrow functions
- Classes

## License

ISC

## Support

For issues or questions:

1. Check this README for quick start and script descriptions
2. Review TypeScript types and JSDoc comments in source files
3. Examine the source code for implementation details
