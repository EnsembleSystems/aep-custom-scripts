# AEP Custom Scripts (TypeScript)

TypeScript-based data fetchers for Adobe Experience Platform (AEP) Data Collection. These scripts are designed to be embedded as custom code in AEP Data Elements and can also be tested standalone in browser consoles.

## Features

- ✅ **TypeScript-first**: Full type safety and modern JavaScript features
- 🔧 **DRY Architecture**: Shared utilities eliminate code duplication
- 📦 **Automated Build**: One-command build process for all scripts
- 🗜️ **Optimized Minification**: Production-ready minified outputs
- 🧪 **Dual-mode**: Easy browser console testing with TEST_MODE flag
- 📝 **Well-documented**: Comprehensive TypeScript types and JSDoc comments

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

# 3. Build (wrappers auto-generated!)
npm run build

# 4. Deploy build/myScript.min.js to AEP
```

**That's it!** No manual wrapper creation needed!

### Building Existing Scripts

```bash
npm run build
```

This automatically:
1. Generates wrappers for new scripts
2. Compiles TypeScript to JavaScript
3. Inlines utilities into wrappers
4. Extracts and minifies AEP-ready scripts
5. Outputs minified files to `build/`

### Available Scripts

After building, you'll find these minified scripts in `build/`:

- **`fetchEventData.min.js`** - Adobe Events data fetcher
- **`fetchPartnerData.min.js`** - Partner cookie data extractor
- **`fetchPublisherId.min.js`** - Publisher/Owner ID fetcher
- **`helloWorld.min.js`** - Template example (for reference)

## 📥 Download Latest Scripts

### Quick Access for Teammates

Ready-to-deploy minified scripts (committed to repository):

- **[fetchEventData.min.js](build/fetchEventData.min.js)** - Adobe Events data fetcher
- **[fetchPartnerData.min.js](build/fetchPartnerData.min.js)** - Partner cookie extractor
- **[fetchPublisherId.min.js](build/fetchPublisherId.min.js)** - Publisher ID fetcher

**To use**: Click the link → Click "Raw" → Copy all → Paste into AEP Data Element

### Production Releases

For stable, versioned deployments see [Releases](../../releases) page.

## Deploying to AEP

1. Download the script you need from links above (or run `npm run build` locally)
2. Copy the **entire** minified code
3. Paste into AEP Data Element as custom code
4. Save and test!

## Project Structure

```
aep-custom-scripts/
├── src/
│   ├── scripts/           # Main script implementations
│   │   ├── fetchEventData.ts
│   │   ├── fetchPartnerData.ts
│   │   └── fetchPublisherId.ts
│   ├── wrappers/          # AEP deployment wrappers
│   │   ├── fetchEventData.wrapper.ts
│   │   ├── fetchPartnerData.wrapper.ts
│   │   └── fetchPublisherId.wrapper.ts
│   ├── utils/             # Shared utilities (DRY)
│   │   ├── logger.ts      # Consistent logging
│   │   ├── fetch.ts       # Fetch with timeout
│   │   ├── cookie.ts      # Cookie parsing
│   │   ├── storage.ts     # LocalStorage helpers
│   │   └── validation.ts  # Input validation
│   ├── types/             # TypeScript type definitions
│   └── index.ts           # Main exports
├── scripts/
│   └── minify.js          # Build script (committed)
├── build/                 # Minified scripts (gitignored)
│   ├── fetchEventData.min.js
│   ├── fetchPartnerData.min.js
│   └── fetchPublisherId.min.js
├── dist/                  # Compiled JS (gitignored)
├── tsconfig.json          # TypeScript configuration
└── package.json           # Project metadata
```

## Script Descriptions

### 1. Event Data Fetcher (`fetchEventData`)

Fetches event and attendee data from Adobe Events pages.

**Use on**: `*.adobeevents.com` pages

**Returns**:
```typescript
{
  eventData: unknown,      // From /api/event.json?meta=true
  attendeeData: unknown    // From localStorage key 'attendeaseMember'
}
```

**Configuration** (in wrapper file):
```typescript
const config = {
  timeout: 10000,  // Request timeout in ms
  debug: false,    // Enable debug logging
};
```

### 2. Partner Data Fetcher (`fetchPartnerData`)

Extracts partner data from browser cookies.

**Returns**:
```typescript
{
  partnerData: unknown  // Parsed from cookie (URL-decoded JSON)
}
```

**Configuration** (in wrapper file):
```typescript
const config = {
  debug: false,
  cookieKey: 'partner_data',  // Customize cookie name
};
```

### 3. Publisher ID Fetcher (`fetchPublisherId`)

Fetches publisher or owner IDs for Adobe Exchange apps by parsing DOM links.

**Use on**: Adobe Exchange pages with publisher links

**How it works**:
- Searches for `<a>` tags with `href` starting with `/publisher/`
- Extracts and validates the publisher ID from the URL path
- Supports UUID and Salesforce ID formats

**Returns**: `string` (publisher/owner ID) or `null`

**Configuration** (in wrapper file):
```typescript
const config = {
  debug: false,  // Enable debug logging
};
```

**No API keys required** - this script uses DOM parsing only.

## Browser Console Testing

For testing scripts in the browser console before deploying to AEP:

### Method 1: Using Compiled TypeScript

1. Build the project: `npm run build`
2. Open the compiled file from `dist/wrappers/`
3. Set `TEST_MODE = true` in the file
4. Copy the entire file contents
5. In browser console, change `return (async () => {` to `await (async () => {`
6. Press Enter

### Method 2: Using Source TypeScript (Recommended for Development)

Use the modular scripts in `src/scripts/` which export testable functions:

```typescript
// In browser console (after importing somehow, or in a test environment)
import { fetchEventDataScript } from './dist/scripts/fetchEventData.js';

// Test mode = true
const result = await fetchEventDataScript(true);
console.log(result);
```

### Example Console Output (Test Mode)

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

## Development

### For Developers: Update Workflow

When you make changes to the TypeScript source:

```bash
# 1. Make your changes in src/
# 2. Build the minified scripts
npm run build

# 3. Commit both source and built files
git add src/ build/*.min.js
git commit -m "Update feature XYZ"
git push
```

**Important**: Built files (`build/*.min.js`) are committed to the repository so teammates always have access to the latest scripts.

### For Teammates: Getting Latest Scripts

**Option A - Via GitHub** (No build required):
1. Browse to [build/](build/) folder in GitHub
2. Click on the `.min.js` file you need
3. Click "Raw" button
4. Copy all and paste into AEP

**Option B - Via Git Clone** (No build required):
```bash
git pull
# Files are in build/*.min.js
```

**Option C - Build Yourself**:
```bash
npm install
npm run build
# Files generated in build/*.min.js
```

### Available NPM Scripts

```bash
npm run build              # Full build: clean + generate wrappers + compile + minify
npm run build:ts           # Compile TypeScript only
npm run build:scripts      # Minify scripts only (requires compiled TS)
npm run generate:wrappers  # Generate wrappers for new scripts
npm run clean              # Remove dist/ and build/
npm run dev                # TypeScript watch mode
npm run type-check         # Type-check without emitting files
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
# - Upload the 3 files from build/*.min.js
# - Add release notes describing changes
```

Teammates can then download from the [Releases](../../releases) page for stable, production-ready versions.

### Adding a New Script (Automated!)

1. **Copy the template**:
   ```bash
   cp src/scripts/helloWorld.ts src/scripts/yourScript.ts
   ```

2. **Edit your script**:
   - Update types, config, and logic
   - Import utilities you need from `src/utils/`
   - Follow existing patterns for error handling

3. **Build** (wrapper auto-generated!):
   ```bash
   npm run build
   ```

That's it! The build system:
- ✅ Auto-generates the wrapper
- ✅ Auto-inlines your imported utilities
- ✅ Auto-discovers and minifies the script

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
function log(message, data) { /* ... */ }
function fetchWithTimeout(url, options, timeoutMs) { /* ... */ }
function getCookie(name) { /* ... */ }
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

The build process produces highly optimized code:

```
📦 Processing: fetchEventData
✅ fetchEventData:
   Original:  3,456 bytes
   Minified:  1,234 bytes
   Savings:   64.3%
```

Minification includes:
- Variable name mangling
- Dead code elimination
- Expression optimization
- Whitespace removal
- Comment stripping (except important ones)

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

Target: ES2020+ (modern browsers)

Supported environments:
- Chrome/Edge 80+
- Firefox 75+
- Safari 13.1+

## License

ISC

## Support

For issues or questions:
1. Check existing documentation in this README
2. Review TypeScript types and JSDoc comments in source files
3. Examine the original JavaScript files for behavior reference
