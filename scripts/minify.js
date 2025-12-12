/**
 * Build script to minify AEP wrapper scripts
 *
 * This script:
 * 1. Compiles TypeScript wrapper files
 * 2. Extracts code between START_AEP_CODE and END_AEP_CODE markers
 * 3. Minifies the code using Terser
 * 4. Outputs minified scripts ready for AEP deployment
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { minify } from 'terser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Configuration
const scripts = [
  {
    name: 'fetchEventData',
    input: join(projectRoot, 'dist/wrappers/fetchEventData.wrapper.js'),
    output: join(projectRoot, 'build/fetchEventData.min.js'),
  },
  {
    name: 'fetchPartnerData',
    input: join(projectRoot, 'dist/wrappers/fetchPartnerData.wrapper.js'),
    output: join(projectRoot, 'build/fetchPartnerData.min.js'),
  },
  {
    name: 'fetchPublisherId',
    input: join(projectRoot, 'dist/wrappers/fetchPublisherId.wrapper.js'),
    output: join(projectRoot, 'build/fetchPublisherId.min.js'),
  },
];

// Terser configuration for AEP scripts
const terserOptions = {
  parse: {
    bare_returns: true, // Allow return statements outside functions (for AEP IIFE pattern)
  },
  compress: {
    drop_console: false, // Keep console for debugging
    dead_code: true,
    conditionals: true,
    evaluate: true,
    booleans: true,
    loops: true,
    unused: true,
    hoist_funs: true,
    keep_fargs: false,
    hoist_vars: false,
    if_return: true,
    join_vars: true,
    side_effects: true,
  },
  mangle: {
    toplevel: true,
    reserved: [], // Don't reserve any names
  },
  format: {
    comments: false,
    beautify: false,
  },
  toplevel: true, // Enable top-level optimizations
};

/**
 * Extracts code between START_AEP_CODE and END_AEP_CODE markers
 */
function extractAepCode(content) {
  const startMarker = '// START_AEP_CODE';
  const endMarker = '// END_AEP_CODE';

  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    console.warn('⚠️  AEP code markers not found, using entire file');
    return content;
  }

  // Extract code between markers (excluding the markers themselves)
  return content.substring(startIndex + startMarker.length, endIndex).trim();
}

/**
 * Minifies a script file
 */
async function minifyScript(scriptConfig) {
  console.log(`\n📦 Processing: ${scriptConfig.name}`);

  try {
    // Read compiled JavaScript
    if (!existsSync(scriptConfig.input)) {
      throw new Error(`Input file not found: ${scriptConfig.input}`);
    }

    const content = readFileSync(scriptConfig.input, 'utf8');

    // Extract AEP code
    const aepCode = extractAepCode(content);

    // Minify with Terser
    const result = await minify(aepCode, terserOptions);

    if (result.error) {
      throw result.error;
    }

    if (!result.code) {
      throw new Error('Minification produced no output');
    }

    // Ensure output directory exists
    const outputDir = dirname(scriptConfig.output);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Write minified output
    writeFileSync(scriptConfig.output, result.code, 'utf8');

    // Calculate compression stats
    const originalSize = Buffer.byteLength(aepCode, 'utf8');
    const minifiedSize = Buffer.byteLength(result.code, 'utf8');
    const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(1);

    console.log(`✅ ${scriptConfig.name}:`);
    console.log(`   Original:  ${originalSize.toLocaleString()} bytes`);
    console.log(`   Minified:  ${minifiedSize.toLocaleString()} bytes`);
    console.log(`   Savings:   ${savings}%`);
    console.log(`   Output:    ${scriptConfig.output}`);

  } catch (error) {
    console.error(`❌ Error processing ${scriptConfig.name}:`, error.message);
    throw error;
  }
}

/**
 * Main build process
 */
async function build() {
  console.log('\n🚀 Starting AEP Scripts Minification\n');
  console.log('=' .repeat(60));

  try {
    for (const script of scripts) {
      await minifyScript(script);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✨ Build completed successfully!\n');
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
