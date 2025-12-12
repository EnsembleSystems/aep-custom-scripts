/**
 * Automatic Wrapper Generator for AEP Scripts
 *
 * This script automatically generates AEP-compatible wrapper files from modular scripts.
 * It inlines all utility dependencies to create self-contained IIFE bundles.
 *
 * Usage:
 *   - Developers only need to write scripts in src/scripts/
 *   - Wrappers are auto-generated during build
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Utility files content (will be inlined)
const UTILS_DIR = join(projectRoot, 'src/utils');
const SCRIPTS_DIR = join(projectRoot, 'src/scripts');
const WRAPPERS_OUTPUT_DIR = join(projectRoot, 'src/wrappers');

/**
 * Reads and returns the source code of a utility file
 */
function readUtilitySource(utilName) {
  const utilPath = join(UTILS_DIR, `${utilName}.ts`);
  if (!existsSync(utilPath)) {
    throw new Error(`Utility not found: ${utilPath}`);
  }
  return readFileSync(utilPath, 'utf8');
}

/**
 * Extracts utility functions/classes from source code
 * Removes imports, exports, and comments, keeping only the implementation
 */
function extractUtilityCode(source) {
  const lines = source.split('\n');
  const codeLines = [];
  let inComment = false;

  for (let line of lines) {
    // Skip import statements
    if (line.trim().startsWith('import ')) continue;

    // Skip export keywords but keep the code
    line = line.replace(/^export\s+/, '');

    // Handle multi-line comments
    if (line.includes('/**')) inComment = true;
    if (inComment) {
      if (line.includes('*/')) inComment = false;
      continue;
    }

    // Skip single-line comments at the start
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

    // Keep the code
    if (line.trim()) {
      codeLines.push(line);
    }
  }

  return codeLines.join('\n');
}

/**
 * Inline utility code for specific utilities
 */
const INLINE_UTILITIES = {
  logger: () => {
    const source = readUtilitySource('logger');
    return `
  // ============================================================================
  // LOGGER
  // ============================================================================
${extractUtilityCode(source)}`;
  },

  fetch: () => {
    const source = readUtilitySource('fetch');
    return `
  // ============================================================================
  // FETCH UTILITIES
  // ============================================================================
  const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5MB limit

${extractUtilityCode(source)}`;
  },

  storage: () => {
    const source = readUtilitySource('storage');
    return `
  // ============================================================================
  // STORAGE UTILITIES
  // ============================================================================
${extractUtilityCode(source)}`;
  },

  cookie: () => {
    const source = readUtilitySource('cookie');
    return `
  // ============================================================================
  // COOKIE UTILITIES
  // ============================================================================
${extractUtilityCode(source)}`;
  },

  validation: () => {
    const source = readUtilitySource('validation');
    return `
  // ============================================================================
  // VALIDATION UTILITIES
  // ============================================================================
${extractUtilityCode(source)}`;
  },
};

/**
 * Analyzes imports in a script file to determine required utilities
 */
function analyzeImports(scriptSource) {
  const imports = new Set();
  const lines = scriptSource.split('\n');

  for (const line of lines) {
    if (line.includes("from '../utils/")) {
      // Extract utility names from imports
      if (line.includes('/logger.js')) imports.add('logger');
      if (line.includes('/fetch.js')) imports.add('fetch');
      if (line.includes('/storage.js')) imports.add('storage');
      if (line.includes('/cookie.js')) imports.add('cookie');
      if (line.includes('/validation.js')) imports.add('validation');
      if (line.includes('/index.js')) {
        // If importing from index, check what's being imported
        const match = line.match(/import\s+{([^}]+)}/);
        if (match) {
          const namedImports = match[1].split(',').map(s => s.trim());
          // Map imports to their source files
          if (namedImports.some(i => i.includes('Logger') || i.includes('createLogger'))) imports.add('logger');
          if (namedImports.some(i => i.includes('fetch') || i.includes('Abort') || i.includes('Network'))) imports.add('fetch');
          if (namedImports.some(i => i.includes('Storage') || i.includes('getStorage') || i.includes('setStorage'))) imports.add('storage');
          if (namedImports.some(i => i.includes('Cookie') || i.includes('getCookie') || i.includes('parseJson'))) imports.add('cookie');
          if (namedImports.some(i => i.includes('Valid') || i.includes('valid'))) imports.add('validation');
        }
      }
    }
  }

  return Array.from(imports);
}

/**
 * Extracts the main script logic (removes imports, exports, and type definitions)
 */
function extractScriptLogic(scriptSource, scriptName) {
  const lines = scriptSource.split('\n');
  const logicLines = [];
  let inComment = false;
  let inInterface = false;
  let braceCount = 0;

  for (let line of lines) {
    // Skip import statements
    if (line.trim().startsWith('import ')) continue;

    // Handle multi-line comments
    if (line.includes('/**')) inComment = true;
    if (inComment) {
      if (line.includes('*/')) inComment = false;
      continue;
    }

    // Skip export interface/type definitions
    if (line.includes('export interface') || line.includes('export type')) {
      inInterface = true;
      braceCount = 0;
    }
    if (inInterface) {
      if (line.includes('{')) braceCount++;
      if (line.includes('}')) braceCount--;
      if (braceCount === 0 && line.includes('}')) {
        inInterface = false;
      }
      continue;
    }

    // Skip const blocks at the top (API, STORAGE_KEYS, etc.) - we'll handle these separately
    if (line.trim().startsWith('const API') ||
        line.trim().startsWith('const STORAGE_KEYS') ||
        line.trim().startsWith('const CONFIG')) {
      continue;
    }

    // Skip helper functions - they'll be inlined in the wrapper
    if (line.includes('async function fetch') ||
        line.includes('function get') ||
        line.includes('function is')) {
      continue;
    }

    // Find the main export function
    if (line.includes('export async function')) {
      // This is the main function - we'll extract its body
      continue;
    }

    logicLines.push(line);
  }

  return logicLines.join('\n');
}

/**
 * Generates wrapper content from a script file
 */
function generateWrapper(scriptPath) {
  const scriptSource = readFileSync(scriptPath, 'utf8');
  const scriptName = basename(scriptPath, '.ts');

  console.log(`  Analyzing ${scriptName}...`);

  // Analyze required utilities
  const requiredUtils = analyzeImports(scriptSource);
  console.log(`    Required utilities: ${requiredUtils.join(', ') || 'none'}`);

  // Build inlined utilities
  let inlinedUtilities = '';
  for (const util of requiredUtils) {
    if (INLINE_UTILITIES[util]) {
      inlinedUtilities += INLINE_UTILITIES[util]();
    }
  }

  // Read the original script to extract constants and logic
  // For now, we'll keep the structure simple and rely on manual implementation
  // But include all the necessary utilities

  const wrapperContent = `/**
 * AEP Wrapper for ${scriptName}
 *
 * AUTO-GENERATED - DO NOT EDIT MANUALLY
 * Generated from: src/scripts/${scriptName}.ts
 *
 * This wrapper is auto-generated during the build process.
 * To modify the script logic, edit the source file in src/scripts/
 */

// @ts-ignore - This is a wrapper file that will be extracted and minified
export default function aepWrapper() {
// START_AEP_CODE
return (async () => {
  const TEST_MODE = false; // Set to true for console testing
${inlinedUtilities}

  // ============================================================================
  // MAIN SCRIPT
  // ============================================================================
  // TODO: Implement your script logic here
  // This is a template - copy logic from your src/scripts/${scriptName}.ts file

  const config = {
    debug: TEST_MODE,
  };

  const logger = createLogger(config.debug, '${scriptName}', TEST_MODE);

  try {
    if (TEST_MODE) {
      console.log('='.repeat(80));
      console.log('${scriptName.toUpperCase()} - TEST MODE');
      console.log('='.repeat(80));
    }

    // Your script logic goes here
    const result = null;

    if (TEST_MODE) {
      console.log('='.repeat(80));
      console.log('RESULT:');
      console.log('='.repeat(80));
      console.log(JSON.stringify(result, null, 2));
      console.log('='.repeat(80));
    }

    return result;
  } catch (error) {
    logger.error('Error:', error);
    return null;
  }
})();
// END_AEP_CODE
}
`;

  return wrapperContent;
}

/**
 * Main generation process
 */
function generateWrappers() {
  console.log('\n🔧 Generating AEP Wrappers\n');
  console.log('='.repeat(60));

  // Ensure output directory exists
  if (!existsSync(WRAPPERS_OUTPUT_DIR)) {
    mkdirSync(WRAPPERS_OUTPUT_DIR, { recursive: true });
  }

  // Find all script files
  const scriptFiles = readdirSync(SCRIPTS_DIR)
    .filter(file => file.endsWith('.ts') && !file.includes('.test.'));

  console.log(`\nFound ${scriptFiles.length} script(s) to process:\n`);

  let generated = 0;
  const skipped = [];

  for (const scriptFile of scriptFiles) {
    const scriptPath = join(SCRIPTS_DIR, scriptFile);
    const wrapperName = scriptFile.replace('.ts', '.wrapper.ts');
    const wrapperPath = join(WRAPPERS_OUTPUT_DIR, wrapperName);

    // Check if wrapper already exists (don't overwrite existing wrappers)
    if (existsSync(wrapperPath)) {
      console.log(`  ⏭️  Skipping ${scriptFile} (wrapper exists)`);
      skipped.push(scriptFile);
      continue;
    }

    const wrapperContent = generateWrapper(scriptPath);
    writeFileSync(wrapperPath, wrapperContent, 'utf8');

    console.log(`  ✅ Generated wrapper: ${wrapperName}`);
    generated++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Summary:`);
  console.log(`   Generated: ${generated} wrapper(s)`);
  console.log(`   Skipped: ${skipped.length} wrapper(s) (already exist)`);

  if (generated > 0) {
    console.log(`\n⚠️  NOTE: Auto-generated wrappers contain templates.`);
    console.log(`   You need to copy your script logic into the wrapper's MAIN SCRIPT section.`);
  }

  console.log('\n✨ Wrapper generation complete!\n');
}

// Run the generator
generateWrappers();
