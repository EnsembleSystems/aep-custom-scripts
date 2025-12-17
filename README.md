# AEP Custom Scripts (TypeScript)

TypeScript-based data fetchers for Adobe Experience Platform (AEP) Data Collection. These scripts are designed to be embedded as custom code in AEP Data Elements and can also be tested standalone in browser consoles.

## Features

- ✅ **TypeScript-first**: Full type safety and modern JavaScript features
- 🔧 **DRY Architecture**: Shared utilities eliminate code duplication
- ⚡ **esbuild-Powered**: Lightning-fast builds with optimal bundle sizes
- 🎯 **ES2015+ Output**: Promise `.then()` chains (no `async/await`) for maximum AEP compatibility
- 📖 **Readable Output**: No minification - AEP handles that automatically
- 🧪 **Dual-mode**: Easy browser console testing with TEST_MODE flag
- 📝 **Well-documented**: Comprehensive TypeScript types and JSDoc comments
- 🚀 **Zero Configuration**: Direct script-to-bundle workflow

## Quick Start

### Installation

```bash
npm install
```

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
3. Transpiles to ES2015+ JavaScript (Promises, no `async/await`)
4. Wraps all scripts with consistent synchronous IIFE: `return (() => { ... })()`
   - Scripts with async operations return Promises via `.then()` chains
   - All scripts use same wrapper pattern for AEP compatibility
5. Outputs readable, production-ready files to `build/` (~4-5KB each)

**Note**: No minification applied - AEP handles that automatically!

### Available Scripts

After building, you'll find these bundled scripts in `build/`:

- **`fetchEventData.js`** - Adobe Events event data fetcher
- **`extractAttendeeData.js`** - Adobe Events attendee data extractor
- **`extractPartnerData.js`** - Partner cookie data extractor
- **`extractPublisherId.js`** - Publisher/Owner ID extractor
- **`helloWorld.js`** - Template example (for reference)

## 📥 Download Latest Scripts

### Quick Access for Teammates

Ready-to-deploy bundled scripts (committed to repository):

- **[fetchEventData.js](build/fetchEventData.js)** - Adobe Events event data fetcher
- **[extractAttendeeData.js](build/extractAttendeeData.js)** - Adobe Events attendee data extractor
- **[extractPartnerData.js](build/extractPartnerData.js)** - Partner cookie extractor
- **[extractPublisherId.js](build/extractPublisherId.js)** - Publisher ID extractor

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
│   │   ├── fetchEventData.ts
│   │   ├── extractAttendeeData.ts
│   │   ├── extractPartnerData.ts
│   │   ├── extractPublisherId.ts
│   │   └── helloWorld.ts  # Template for new scripts
│   ├── utils/             # Shared utilities (DRY)
│   │   ├── logger.ts      # Consistent logging
│   │   ├── fetch.ts       # Fetch with timeout
│   │   ├── cookie.ts      # Cookie parsing
│   │   ├── storage.ts     # LocalStorage helpers
│   │   └── validation.ts  # Input validation
│   ├── types/             # TypeScript type definitions
│   └── index.ts           # Main exports
├── scripts/
│   └── buildWithEsbuild.js  # esbuild-based build script
├── build/                 # Bundled scripts (ready for AEP)
│   ├── fetchEventData.js
│   ├── extractAttendeeData.js
│   ├── extractPartnerData.js
│   └── extractPublisherId.js
├── tsconfig.json          # TypeScript configuration
└── package.json           # Project metadata
```

## Script Descriptions

### 1. Event Data Fetcher (`fetchEventData`)

Fetches event data from Adobe Events pages via API.

**Use on**: `*.adobeevents.com` pages

**Returns**: Event data object (from `/api/event.json?meta=true`) or `null` on error

**Configuration** (default in source):

```typescript
const config = {
  timeout: 10000, // Request timeout in ms
  debug: false, // Enable debug logging
};
```

### 2. Attendee Data Extractor (`extractAttendeeData`)

Extracts attendee data from localStorage on Adobe Events pages.

**Use on**: `*.adobeevents.com` pages

**Returns**: Attendee data object (from localStorage key `attendeaseMember`) or `null` if not found

**Configuration** (default in source):

```typescript
const config = {
  debug: false, // Enable debug logging
};
```

### 3. Partner Data Extractor (`extractPartnerData`)

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

### 4. Publisher ID Extractor (`extractPublisherId`)

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
