/**
 * Build script using esbuild for bundling and minification
 *
 * This script:
 * 1. Uses esbuild to bundle scripts + utilities into single files
 * 2. Wraps bundled code in AEP-compatible IIFE pattern
 * 3. Minifies with esbuild's built-in minifier
 *
 * Benefits over ncc:
 * - Simpler: No webpack runtime code to strip
 * - Faster: 10-100x faster than webpack-based bundlers
 * - Cleaner output: Native IIFE support without transformations
 * - All-in-one: Bundling + minification in one tool
 */

import * as esbuild from 'esbuild';
import {
  readdirSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  statSync,
} from 'fs';
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
    const outputPath = join(BUILD_DIR, `${scriptName}.min.js`);

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
      target: 'es2020',
      write: false,
      treeShaking: true,
      legalComments: 'none',
      logLevel: 'silent',
    });

    if (!bundleResult.outputFiles || bundleResult.outputFiles.length === 0) {
      throw new Error('esbuild produced no output');
    }

    let bundledCode = bundleResult.outputFiles[0].text;

    // Remove export statements since we're wrapping in IIFE
    bundledCode = bundledCode
      .replace(/export\s+/g, '') // Remove all export keywords
      .replace(/export\s*{[^}]*};?/g, ''); // Remove export {...}

    // Find the main function name
    const functionCallMatch = bundledCode.match(/async function (\w+Script)/);
    const mainFunctionName = functionCallMatch
      ? functionCallMatch[1]
      : `${scriptName}Script`;

    // Get TEST_MODE from environment variable (defaults to false for production)
    // Developers can set TEST_MODE=true locally, but it won't be committed
    const testMode =
      process.env.TEST_MODE === 'true' || process.env.TEST_MODE === '1';

    // Wrap in AEP IIFE pattern with async support
    const wrappedCode = `return (async () => {
  const TEST_MODE = ${testMode};

${bundledCode}

  return await ${mainFunctionName}(TEST_MODE);
})();`;

    // Now minify the complete wrapped code
    console.log(`   Minifying...`);
    const minifyResult = await esbuild.build({
      stdin: {
        contents: wrappedCode,
        loader: 'js',
      },
      minify: true,
      target: 'es2020',
      write: false,
      legalComments: 'none',
      logLevel: 'silent',
    });

    if (!minifyResult.outputFiles || minifyResult.outputFiles.length === 0) {
      throw new Error('Minification produced no output');
    }

    const minifiedCode = minifyResult.outputFiles[0].text;

    // Write the final minified code
    writeFileSync(outputPath, minifiedCode, 'utf8');

    // Calculate stats
    const bundledSize = Buffer.byteLength(bundledCode, 'utf8');
    const wrappedSize = Buffer.byteLength(wrappedCode, 'utf8');
    const minifiedSize = Buffer.byteLength(minifiedCode, 'utf8');
    const savings = ((1 - minifiedSize / wrappedSize) * 100).toFixed(1);

    console.log(`✅ ${scriptName}:`);
    console.log(
      `   Original:  ${originalSize.toLocaleString()} bytes (TypeScript source)`
    );
    console.log(`   Bundled:   ${bundledSize.toLocaleString()} bytes`);
    console.log(`   Wrapped:   ${wrappedSize.toLocaleString()} bytes`);
    console.log(`   Minified:  ${minifiedSize.toLocaleString()} bytes`);
    console.log(`   Savings:   ${savings}% (from wrapped)`);
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
    console.log(
      `\n✨ Build completed successfully! (${successCount}/${scripts.length})\n`
    );
    console.log('📁 Minified scripts are in: build/\n');
    console.log('📋 To deploy to AEP:');
    console.log('   1. Open the minified .js file');
    console.log('   2. Copy the entire contents');
    console.log('   3. Paste into AEP Data Element as custom code\n');
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run the build
build();
