# AEP Custom Scripts (TypeScript)

TypeScript-based data fetchers for Adobe Experience Platform (AEP) Data Collection. Scripts are embedded as custom code in AEP Data Elements and Rules.

> **⚡ Recent Updates (February 2026)**:
>
> - **SPA Page View Tracking** - `spaPageViewTitleMonitor` + `spaPageViewTracker` for React SPA navigation
> - **Utility Refactors** - New `satellite.ts`, `searchTracker.ts`, `searchConfig.ts`, `searchUrlParser.ts`, `customEvent.ts`; enhanced `globalState.ts` with deduplication
> - **Search Tracking** - Five scripts for entry (page load) and dynamic (URL change) search tracking
> - **SnapLogic Support** - ES5-compatible Chimera card transforms for Nashorn/JDK 7-8

## Quick Start

```bash
npm install
npm run build          # Build AEP scripts → build/
npm run build:snaplogic # Build SnapLogic scripts → build-snaplogic/
npm run build:all      # Build both
```

### Creating a New Script

```bash
# Copy the appropriate template
cp src/scripts/templateAsync.ts src/scripts/myScript.ts  # async (API calls, fetch)
cp src/scripts/templateSync.ts src/scripts/myScript.ts   # sync (cookies, DOM)

# Edit, then build
npm run build
# Output: build/myScript.js — ready for AEP
```

esbuild auto-discovers scripts, bundles utilities inline, transpiles to ES2017, and outputs readable code (AEP handles minification).

### Debug Mode

Toggle at **runtime** via localStorage — no rebuild needed:

```javascript
localStorage.setItem('__aep_scripts_debug', 'true'); // Enable
localStorage.removeItem('__aep_scripts_debug'); // Disable
```

## Available Scripts

Built scripts in [`build/`](build/) are committed to the repo. To deploy: click link → "Raw" → copy → paste into AEP.

### Adobe Events

| Script                                                 | Description                                              |
| ------------------------------------------------------ | -------------------------------------------------------- |
| [fetchEventData.js](build/fetchEventData.js)           | Fetches event data via API (`/api/event.json?meta=true`) |
| [getEventData.js](build/getEventData.js)               | Gets event data from `window._adobePartners.eventData`   |
| [extractAttendeeData.js](build/extractAttendeeData.js) | Extracts attendee data from localStorage                 |

### Partner & Analytics

| Script                                                                                             | Description                                                                             |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [extractPartnerData.js](build/extractPartnerData.js)                                               | Extracts DXP value from `partner_data` cookie                                           |
| [extractPublisherData.js](build/extractPublisherData.js)                                           | Extracts publisher ID and name from DOM links                                           |
| [customOnPageLoad.js](build/customOnPageLoad.js)                                                   | Custom page load placeholder                                                            |
| [customDataCollectionOnBeforeEventSend.js](build/customDataCollectionOnBeforeEventSend.js)         | Before event send callback — extracts partner data + card metadata via `composedPath()` |
| [customDataCollectionOnFilterClickCallback.js](build/customDataCollectionOnFilterClickCallback.js) | Click filter — validates `event.isTrusted` only (~3KB)                                  |

### Search Tracking

| Script                                                   | Description                                                                   |
| -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [searchConditionEntry.js](build/searchConditionEntry.js) | Condition: checks for valid search term in URL on page load                   |
| [searchTrackerEntry.js](build/searchTrackerEntry.js)     | Action: extracts search params on page load, fires `searchCommit`             |
| [searchTrackerDynamic.js](build/searchTrackerDynamic.js) | Extracts search params on URL change, debounced (300ms), fires `searchCommit` |
| [searchUrlMonitor.js](build/searchUrlMonitor.js)         | Hooks History API, dispatches `partnersSearchUrlChanged` event                |
| [searchVariableSetter.js](build/searchVariableSetter.js) | Reads search payload, sets Launch variables via `_satellite.setVar()`         |

### SPA Page View Tracking

| Script                                                         | Description                                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [spaPageViewTitleMonitor.js](build/spaPageViewTitleMonitor.js) | MutationObserver on `<title>` — dispatches `spaPageTitleChanged` on valid title |
| [spaPageViewTracker.js](build/spaPageViewTracker.js)           | Debounced page view tracker — sets XDM variables, fires `spaPageViewCommit`     |

### SnapLogic

Built scripts in [`build-snaplogic/`](build-snaplogic/) (ES5 for Nashorn/JDK 7-8):

| Script                                                                         | Description                         |
| ------------------------------------------------------------------------------ | ----------------------------------- |
| [transformChimeraCardsById.js](build-snaplogic/transformChimeraCardsById.js)   | XDM records keyed by hashed card ID |
| [transformChimeraCardsByUrl.js](build-snaplogic/transformChimeraCardsByUrl.js) | XDM records keyed by URL (deduped)  |

## Script Details

### Before Event Send Callback

Paste into Launch Extension → Data Collection → "Edit on before event send callback".

- Skips page view events
- Extracts partner data from `partner_data` cookie
- Extracts card metadata from `event.composedPath()` (shadow DOM support)
- Sets data in `content.xdm._adobepartners`

Card context fields: `cardTitle`, `contentID`, `contentType`, `ctaText`, `filterContext`, `name`, `position`, `sectionID`

### Search Tracking Flow

**Entry search** (page load with search params):

1. `searchConditionEntry` checks URL for valid term → returns `true`/`false`
2. `searchTrackerEntry` extracts params, stores payload, fires `searchCommit`
3. `searchVariableSetter` reads payload, sets `searchTerm`/`searchFilters`/`searchSource`

**Dynamic search** (URL changes after page load):

1. `searchUrlMonitor` hooks History API, dispatches `partnersSearchUrlChanged`
2. `searchTrackerDynamic` extracts params (300ms debounce), stores payload, fires `searchCommit`
3. `searchVariableSetter` reads payload, sets Launch variables

**Shared behavior**:

- Term extracted from `term`, `q`, or `keyword` params (in order)
- Comma-delimited values split: `?key=val1,val2` → `["val1", "val2"]`
- UTM params and `filters` param ignored
- Deduplication prevents double-firing
- Min term length: 2 chars
- Payload stored in `window._adobePartners.searchPayload`

**Example**: `/search?term=photoshop&category=tutorials` →

```javascript
{ term: "photoshop", filters: { category: ["tutorials"] }, source: "url" }
```

### SPA Page View Tracking Flow

1. `spaPageViewTitleMonitor` installs MutationObserver on `<title>`
2. Filters out placeholder titles ("React Include", "React App", "Loading...", empty)
3. On valid title, dispatches `spaPageTitleChanged` with title/URL/referrer
4. `spaPageViewTracker` receives event, debounces (300ms), deduplicates by `url|title`
5. Sets XDM fields on `XDMVariable`: `web.webPageDetails` + `web.webReferrer`
6. Fires `spaPageViewCommit` direct call event

## Project Structure

```
src/
├── scripts/              # AEP script entry points
├── utils/                # Shared utilities
│   ├── script.ts         # executeScript / executeAsyncScript wrappers
│   ├── logger.ts         # Consistent logging
│   ├── satellite.ts      # Safe _satellite interaction
│   ├── globalState.ts    # Window state management & deduplication
│   ├── searchConfig.ts   # Search tracking constants & XDM mapping
│   ├── searchUrlParser.ts # Secure URL parser (XSS protection)
│   ├── searchTracker.ts  # Shared search tracking flow
│   ├── spaPageViewConfig.ts # SPA page view constants
│   ├── customEvent.ts    # Safe CustomEvent dispatching
│   ├── fetch.ts, cookie.ts, storage.ts, dom.ts, validation.ts
│   ├── extraction.ts, object.ts, events.ts, transform.ts, url.ts
│   ├── hash.ts, constants.ts, dates.ts
│   └── index.ts
├── types/index.ts        # PartnerCardCtx, CartItem, CheckoutData, Window augmentation
└── snaplogic/            # SnapLogic scripts & ES5-compatible utils
build/                    # Bundled AEP scripts (committed)
build-snaplogic/          # Bundled SnapLogic scripts (committed)
scripts/                  # Build tooling (esbuild, Babel, deploy)
```

## NPM Scripts

```bash
# Build
npm run build              # AEP scripts
npm run build:snaplogic    # SnapLogic scripts
npm run build:all          # Both
npm run clean              # Remove build artifacts

# Development
npm run dev                # TypeScript watch mode
npm run type-check         # Type-check AEP
npm run type-check:snaplogic # Type-check SnapLogic
npm run lint:fix           # Lint and fix
npm run format             # Format with Prettier

# Deploy to AEP Launch
npm run deploy -- --env=dev
npm run deploy -- --env=stage
npm run deploy -- --env=prod
npm run deploy -- --dry-run --env=prod
npm run deploy -- --env=dev --script=searchUrlMonitor  # Single script
npm run deploy:dev         # Shortcut
npm run deploy:dry-run     # Shortcut
```

## Development Workflow

```bash
# 1. Edit source in src/
# 2. Build
npm run build

# 3. Commit source + built files
git add src/ build/*.js
git commit -m "Your message"
```

Pre-commit hooks (Husky + lint-staged) auto-run ESLint and Prettier.

## GitHub Workflows

### Chimera Collection to SFTP

![](./images/UPP-AEP%20-%20Frame%201.jpg)

[.github/workflows/fetch-chimera-sftp.yml](.github/workflows/fetch-chimera-sftp.yml) — Fetches Chimera API card data and uploads NDJSON to SFTP every 15 minutes.

**Process**: Fetch cards → `rollingHash()` IDs → extract tags/CTAs → generate `by-id` and `by-url` NDJSON files → upload to SFTP

**Required config**: `CHIMERA_URL_{DEV,STAGE,PROD}`, `ORIGIN_SELECTION`, `SFTP_HOST`, `SFTP_PORT`, `SFTP_USER`, `SFTP_PATH`, `SFTP_PRIVATE_KEY` (secret)

## Build Details

- **esbuild** bundles each script with utilities inlined
- **ES2017 output** — Promises with `.then()` chains, no `async/await`
- **Readable output** — no minification (AEP handles it)
- **Direct return pattern** — no IIFE wrapper
- **Runtime debug mode** — localStorage toggle, no rebuild needed
- **SnapLogic** — esbuild + Babel → ES5 for Nashorn

## License

ISC
