/**
 * Build script using esbuild for bundling
 *
 * This script:
 * 1. Uses esbuild to bundle scripts + utilities into single files
 * 2. Adds TEST_MODE constant and direct return statement
 * 3. Outputs readable code (AEP handles minification)
 *
 * Key features:
 * - No IIFE wrapper: AEP Launch supports direct Promise returns (ES6+)
 * - Clean output: Readable code for easier debugging
 * - Fast: 10-100x faster than webpack-based bundlers
 * - Simple: Direct return pattern for proper Promise handling
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
 * Discovers all scripts in src/scripts/
 */
function discoverScripts() {
  if (!existsSync(SCRIPTS_DIR)) {
    console.warn('⚠️  Scripts directory not found.');
    return [];
  }

  return readdirSync(SCRIPTS_DIR)
    .filter((file) => file.endsWith('.ts') && !file.includes('.test.'))
    .map((file) => ({
      name: basename(file, '.ts'),
      path: join(SCRIPTS_DIR, file),
    }));
}

// Removed unused aepWrapperPlugin function - wrapper is applied directly in buildScript

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

    let bundledCode = bundleResult.outputFiles[0].text;

    // Remove export statements since we don't need them in the bundle
    bundledCode = bundledCode
      .replace(/export\s*\{[^}]*\};?\s*/g, '') // Remove export { ... }; blocks first
      .replace(/export\s+/g, ''); // Then remove remaining export keywords

    // Find the main function name - look for 'default function' pattern first
    // This ensures we match the exported default function, not imported dependencies
    const functionMatch = bundledCode.match(/default\s+function\s+(\w+)/);
    let mainFunctionName;

    if (functionMatch) {
      // Found 'export default function FooScript' pattern (after export keyword removed)
      [, mainFunctionName] = functionMatch;
    } else {
      // Fallback: look for any function ending with 'Script' that matches the file name
      const expectedFunctionName = `${scriptName}Script`;
      const specificMatch = bundledCode.match(
        new RegExp(`function\\s+(${expectedFunctionName})\\s*\\(`)
      );

      if (specificMatch) {
        [, mainFunctionName] = specificMatch;
      } else {
        // Last resort: use the expected name based on the file
        mainFunctionName = expectedFunctionName;
      }
    }

    // Get TEST_MODE from environment variable (defaults to false for production)
    // Developers can set TEST_MODE=true locally, but it won't be committed
    const testMode = process.env.TEST_MODE === 'true' || process.env.TEST_MODE === '1';

    // Check if the function signature includes 'event' or 'content' parameter
    // Determine parameter order by checking which comes first
    const functionSignatureMatch = bundledCode.match(
      new RegExp(`function ${mainFunctionName}\\s*\\([^)]*\\)`)
    );
    const needsEventParam =
      functionSignatureMatch &&
      (functionSignatureMatch[0].includes('event') ||
        functionSignatureMatch[0].includes('content'));

    // Determine the parameter order
    // Check if 'event'/'content' comes before 'testMode' in the signature
    let functionCall;
    if (needsEventParam) {
      const signature = functionSignatureMatch[0];
      const eventIndex = Math.min(
        signature.indexOf('event') !== -1 ? signature.indexOf('event') : Infinity,
        signature.indexOf('content') !== -1 ? signature.indexOf('content') : Infinity
      );
      const testModeIndex = signature.indexOf('testMode');

      // If event/content comes before testMode (or testMode not found), use (content, TEST_MODE)
      // Otherwise use (TEST_MODE, content)
      if (testModeIndex === -1 || eventIndex < testModeIndex) {
        functionCall = `${mainFunctionName}(content, TEST_MODE)`;
      } else {
        functionCall = `${mainFunctionName}(TEST_MODE, content)`;
      }
    } else {
      functionCall = `${mainFunctionName}(TEST_MODE)`;
    }

    const wrappedCode = `const TEST_MODE = ${testMode};

${bundledCode}

return ${functionCall};`;

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
