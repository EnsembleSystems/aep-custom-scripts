/**
 * Build script using esbuild for bundling
 *
 * This script:
 * 1. Uses esbuild to bundle scripts + utilities into single files
 * 2. Adds TEST_MODE constant (runtime localStorage check) and direct return statement
 * 3. Outputs readable code (AEP handles minification)
 *
 * Key features:
 * - No IIFE wrapper: AEP Launch supports direct Promise returns (ES6+)
 * - Clean output: Readable code for easier debugging
 * - Fast: 10-100x faster than webpack-based bundlers
 * - Simple: Direct return pattern for proper Promise handling
 * - Runtime debug mode: Set localStorage key '__aep_scripts_debug' to 'true' to enable
 */

import * as esbuild from 'esbuild';
import { readdirSync, existsSync, mkdirSync, writeFileSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Directories
const SCRIPTS_DIR = join(projectRoot, 'src/scripts');
const BUILD_DIR = join(projectRoot, 'build');

/**
 * Discovers all scripts in src/scripts/ recursively.
 * Skips directories starting with '_' (e.g. _templates).
 */
function discoverScripts() {
  if (!existsSync(SCRIPTS_DIR)) {
    console.warn('⚠️  Scripts directory not found.');
    return [];
  }

  function walkDir(dir) {
    const entries = readdirSync(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('_')) {
          files.push(...walkDir(join(dir, entry.name)));
        }
      } else if (entry.name.endsWith('.ts') && !entry.name.includes('.test.')) {
        files.push(join(dir, entry.name));
      }
    }
    return files;
  }

  return walkDir(SCRIPTS_DIR).map((filePath) => ({
    name: basename(filePath, '.ts'),
    path: filePath,
  }));
}

/**
 * Extracts the main function name from bundled code
 * @param {string} bundledCode - The bundled JavaScript code
 * @param {string} scriptName - The script file name (without extension)
 * @returns {string} The main function name
 */
function extractMainFunctionName(bundledCode, scriptName) {
  // Find the main function name - look for 'default function' pattern first
  // This ensures we match the exported default function, not imported dependencies
  const functionMatch = bundledCode.match(/default\s+function\s+(\w+)/);

  if (functionMatch) {
    // Found 'export default function FooScript' pattern (after export keyword removed)
    return functionMatch[1];
  }

  // Fallback: look for any function ending with 'Script' that matches the file name
  const expectedFunctionName = `${scriptName}Script`;
  const specificMatch = bundledCode.match(
    new RegExp(`function\\s+(${expectedFunctionName})\\s*\\(`)
  );

  if (specificMatch) {
    return specificMatch[1];
  }

  // Last resort: use the expected name based on the file
  return expectedFunctionName;
}

/**
 * Determines the correct function call signature based on function parameters
 * @param {string} bundledCode - The bundled JavaScript code
 * @param {string} mainFunctionName - The main function name
 * @returns {string} The function call with appropriate parameters
 */
function determineFunctionCall(bundledCode, mainFunctionName) {
  // Check if the function signature includes 'event' or 'content' parameter
  const functionSignatureMatch = bundledCode.match(
    new RegExp(`function ${mainFunctionName}\\s*\\([^)]*\\)`)
  );

  if (!functionSignatureMatch) {
    return `${mainFunctionName}(TEST_MODE)`;
  }

  const signature = functionSignatureMatch[0];
  const hasContent = signature.includes('content');
  const hasEvent = signature.includes('event');

  if (hasContent && hasEvent) {
    // Function has both content and event parameters (e.g., customDataCollectionOnFilterClickCallback)
    return `${mainFunctionName}(content, event, TEST_MODE)`;
  }

  if (hasContent || hasEvent) {
    // Function has either content or event parameter
    const eventIndex = Math.min(
      signature.indexOf('event') !== -1 ? signature.indexOf('event') : Infinity,
      signature.indexOf('content') !== -1 ? signature.indexOf('content') : Infinity
    );
    const testModeIndex = signature.indexOf('testMode');

    // If event/content comes before testMode (or testMode not found), use (content, TEST_MODE)
    // Otherwise use (TEST_MODE, content)
    if (testModeIndex === -1 || eventIndex < testModeIndex) {
      return `${mainFunctionName}(content, TEST_MODE)`;
    }
    return `${mainFunctionName}(TEST_MODE, content)`;
  }

  // No content or event parameter
  return `${mainFunctionName}(TEST_MODE)`;
}

/**
 * Removes export statements from bundled code
 * @param {string} code - The bundled JavaScript code
 * @returns {string} Code with export statements removed
 */
function removeExportStatements(code) {
  return code
    .replace(/export\s*\{[^}]*\};?\s*/g, '') // Remove export { ... }; blocks first
    .replace(/export\s+/g, ''); // Then remove remaining export keywords
}

/**
 * Wraps bundled code with TEST_MODE constant and return statement
 *
 * TEST_MODE is determined at runtime by checking localStorage for the
 * '__aep_scripts_debug' key. This allows developers to toggle debug mode
 * without rebuilding - just set the key to 'true' in browser DevTools.
 *
 * @param {string} bundledCode - The bundled JavaScript code
 * @param {string} functionCall - The function call string
 * @returns {string} The wrapped code
 */
function wrapCodeForAEP(bundledCode, functionCall) {
  return `const TEST_MODE = localStorage.getItem('__aep_scripts_debug') === 'true';

${bundledCode}

return ${functionCall};`;
}

/**
 * Builds a single script with esbuild
 */
async function buildScript(scriptPath) {
  const scriptName = basename(scriptPath, '.ts');
  console.log(`\n📦 Building: ${scriptName}`);

  try {
    const outputPath = join(BUILD_DIR, `${scriptName}.js`);

    // Get original file size for stats
    const originalSize = statSync(scriptPath).size;

    // Build with esbuild - first get the bundled but not minified code
    console.log(`   Bundling with esbuild...`);
    const bundleResult = await esbuild.build({
      entryPoints: [scriptPath],
      bundle: true,
      minify: false,
      format: 'esm', // Use ESM to avoid IIFE wrapper
      platform: 'browser',
      target: 'es2017', // ES2017 for AEP (native async/await, cleaner output)
      write: false,
      treeShaking: true,
      legalComments: 'none',
      logLevel: 'silent',
    });

    if (!bundleResult.outputFiles || bundleResult.outputFiles.length === 0) {
      throw new Error('esbuild produced no output');
    }

    // Process the bundled code
    let bundledCode = bundleResult.outputFiles[0].text;
    bundledCode = removeExportStatements(bundledCode);

    // Extract function metadata
    const mainFunctionName = extractMainFunctionName(bundledCode, scriptName);
    const functionCall = determineFunctionCall(bundledCode, mainFunctionName);

    // Wrap code for AEP deployment (TEST_MODE is now determined at runtime via localStorage)
    const wrappedCode = wrapCodeForAEP(bundledCode, functionCall);

    // Write the final code (no minification - AEP does this for us)
    writeFileSync(outputPath, wrappedCode, 'utf8');

    // Calculate stats
    const bundledSize = Buffer.byteLength(bundledCode, 'utf8');
    const wrappedSize = Buffer.byteLength(wrappedCode, 'utf8');

    console.log(`✅ ${scriptName}:`);
    console.log(`   Original:  ${originalSize.toLocaleString()} bytes (TypeScript source)`);
    console.log(`   Bundled:   ${bundledSize.toLocaleString()} bytes`);
    console.log(`   Wrapped:   ${wrappedSize.toLocaleString()} bytes`);
    console.log(`   Output:    ${outputPath}`);

    return true;
  } catch (error) {
    console.error(`❌ Error building ${scriptName}:`, error.message);
    if (error.errors) {
      error.errors.forEach((err) => console.error('  ', err.text));
    }
    throw error;
  }
}

/**
 * Main build process
 */
async function build() {
  console.log('\n🚀 Starting AEP Scripts Build (with esbuild)\n');
  console.log('='.repeat(60));

  // Ensure output directory exists
  if (!existsSync(BUILD_DIR)) {
    mkdirSync(BUILD_DIR, { recursive: true });
  }

  // Discover scripts
  const scripts = discoverScripts();

  if (scripts.length === 0) {
    console.log('\n⚠️  No scripts found to build.');
    console.log('   Add TypeScript scripts to src/scripts/\n');
    return;
  }

  console.log(`\nFound ${scripts.length} script(s) to build:\n`);

  try {
    let successCount = 0;

    for (const script of scripts) {
      await buildScript(script.path);
      successCount++;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n✨ Build completed successfully! (${successCount}/${scripts.length})\n`);
    console.log('📁 Bundled scripts are in: build/\n');
    console.log('📋 To deploy to AEP:');
    console.log('   1. Open the .js file');
    console.log('   2. Copy the entire contents');
    console.log('   3. Paste into AEP Data Element as custom code');
    console.log('   (AEP will minify the code automatically)\n');
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run the build
build();
