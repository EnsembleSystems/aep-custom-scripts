/**
 * Build script for SnapLogic scripts using esbuild + Babel
 *
 * This script:
 * 1. Uses esbuild to bundle scripts + utilities into single files
 * 2. Uses Babel to transform ES6 → ES5 for Nashorn/JDK 7-8 compatibility
 * 3. Wraps with SnapLogic ScriptHook boilerplate
 * 4. Outputs readable code for debugging
 *
 * Key differences from AEP build:
 * - Babel handles ES5 transformation (shorthand properties, const/let, arrow functions)
 * - ScriptHook wrapper pattern instead of Promise return
 * - Nashorn compatibility header
 * - Compatible with JDK 7/8 Rhino/Nashorn engines
 */

import * as esbuild from 'esbuild';
import * as babel from '@babel/core';
import { readdirSync, existsSync, mkdirSync, writeFileSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Directories
const SCRIPTS_DIR = join(projectRoot, 'src/snaplogic/scripts');
const BUILD_DIR = join(projectRoot, 'build-snaplogic');

/**
 * Nashorn compatibility header
 */
const NASHORN_HEADER = `// Ensure compatibility with both JDK 7 and 8 JSR-223 Script Engines
try {
  load('nashorn:mozilla_compat.js');
} catch (e) {}

// Import the interface required by the Script snap.
importPackage(com.snaplogic.scripting.language);

// Import the serializable Java types we'll use for the output data.
importClass(java.util.LinkedHashMap);
importClass(java.util.ArrayList);

`;

/**
 * ScriptHook footer template
 */
const SCRIPTHOOK_FOOTER = `

/**
 * The Script Snap will look for a ScriptHook object in the "hook"
 * variable. The snap will then call the hook's "execute" method.
 */
var hook = new com.snaplogic.scripting.language.ScriptHook(impl);
`;

/**
 * Discovers all scripts in src/snaplogic/scripts/
 */
function discoverScripts() {
  if (!existsSync(SCRIPTS_DIR)) {
    console.warn('⚠️  SnapLogic scripts directory not found.');
    return [];
  }

  return readdirSync(SCRIPTS_DIR)
    .filter((file) => file.endsWith('.ts') && !file.includes('.test.'))
    .map((file) => ({
      name: basename(file, '.ts'),
      path: join(SCRIPTS_DIR, file),
    }));
}

/**
 * Transforms ES6 code to ES5 using Babel
 */
async function transformToES5(code) {
  const result = await babel.transformAsync(code, {
    presets: [
      [
        '@babel/preset-env',
        {
          targets: {
            // Target old browsers to ensure ES5 output
            ie: '11',
          },
          modules: false, // Keep ESM, we'll strip exports separately
        },
      ],
    ],
    // Handle ESM exports from esbuild
    sourceType: 'module',
    compact: false,
    minified: false,
    comments: true,
  });

  return result.code;
}

/**
 * Cleans bundled code for SnapLogic
 */
function cleanBundledCode(code) {
  return code
    .replace(/["']use strict["'];?\s*/g, '') // Babel adds this, Nashorn doesn't need it
    .replace(/export\s*\{[^}]*\};?\s*/g, '') // Remove ESM exports
    .replace(/\n{3,}/g, '\n\n') // Collapse multiple blank lines
    .trim();
}

/**
 * Wraps bundled code with SnapLogic ScriptHook boilerplate
 */
function wrapForSnapLogic(bundledCode) {
  return NASHORN_HEADER + bundledCode + SCRIPTHOOK_FOOTER;
}

/**
 * Builds a single script with esbuild + Babel
 */
async function buildScript(scriptPath) {
  const scriptName = basename(scriptPath, '.ts');
  console.log(`\n📦 Building: ${scriptName}`);

  try {
    const outputPath = join(BUILD_DIR, `${scriptName}.js`);

    // Get original file size for stats
    const originalSize = statSync(scriptPath).size;

    // Step 1: Bundle with esbuild (ES2015 target - Babel will handle ES5)
    console.log(`   Bundling with esbuild...`);
    const bundleResult = await esbuild.build({
      entryPoints: [scriptPath],
      bundle: true,
      minify: false,
      format: 'esm', // Use ESM - we'll strip exports after
      platform: 'neutral', // No platform-specific code
      target: 'es2015', // ES2015, Babel converts to ES5
      write: false,
      treeShaking: true,
      legalComments: 'none',
      logLevel: 'silent',
    });

    if (!bundleResult.outputFiles || bundleResult.outputFiles.length === 0) {
      throw new Error('esbuild produced no output');
    }

    let bundledCode = bundleResult.outputFiles[0].text;

    // Step 2: Transform to ES5 with Babel
    console.log(`   Transforming to ES5 with Babel...`);
    bundledCode = await transformToES5(bundledCode);

    // Step 3: Clean up the bundled code
    bundledCode = cleanBundledCode(bundledCode);

    // Step 4: Wrap with SnapLogic boilerplate
    const wrappedCode = wrapForSnapLogic(bundledCode);

    // Write the final code
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
  console.log('\n🚀 Starting SnapLogic Scripts Build (esbuild + Babel)\n');
  console.log('='.repeat(60));

  // Ensure output directory exists
  if (!existsSync(BUILD_DIR)) {
    mkdirSync(BUILD_DIR, { recursive: true });
  }

  // Discover scripts
  const scripts = discoverScripts();

  if (scripts.length === 0) {
    console.log('\n⚠️  No SnapLogic scripts found to build.');
    console.log('   Add TypeScript scripts to src/snaplogic/scripts/\n');
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
    console.log('📁 Bundled scripts are in: build-snaplogic/\n');
    console.log('📋 To deploy to SnapLogic:');
    console.log('   1. Open the .js file');
    console.log('   2. Copy the entire contents');
    console.log('   3. Paste into SnapLogic Script snap\n');
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run the build
build();
