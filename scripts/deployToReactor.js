#!/usr/bin/env node

/**
 * Deploy AEP Scripts to Adobe Launch via Reactor API
 *
 * This script uses the @adobe/reactor-sdk to programmatically update
 * Launch resources (Data Elements, Rules, Extensions) with built script code.
 *
 * Usage:
 *   npm run deploy -- --env=dev
 *   npm run deploy -- --env=stage --dry-run
 *   npm run deploy -- --env=prod --script=searchUrlMonitor
 *
 * Required environment variables:
 *   REACTOR_ACCESS_TOKEN - Adobe I/O access token
 *   REACTOR_COMPANY_ID - Adobe Experience Cloud Org ID
 *
 * Optional environment variables:
 *   REACTOR_API_URL - Reactor API base URL (default: https://reactor.adobe.io)
 */

import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import ReactorSdk from '@adobe/reactor-sdk';

const Reactor = ReactorSdk.default || ReactorSdk;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    env: 'dev',
    dryRun: false,
    script: null,
  };

  args.forEach((arg) => {
    if (arg.startsWith('--env=')) {
      [, parsed.env] = arg.split('=');
    } else if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg.startsWith('--script=')) {
      [, parsed.script] = arg.split('=');
    }
  });

  return parsed;
}

// Validate environment variables
function validateEnv() {
  const required = ['REACTOR_ACCESS_TOKEN', 'REACTOR_COMPANY_ID'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((key) => console.error(`   - ${key}`));
    console.error('\nSet these in your environment or .env file');
    process.exit(1);
  }
}

// Load deployment configuration
function loadConfig() {
  const configPath = resolve(__dirname, '../deploy-config.json');
  try {
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    return config;
  } catch (error) {
    console.error('❌ Failed to load deploy-config.json:', error.message);
    process.exit(1);
    return null; // Unreachable, but satisfies consistent-return
  }
}

// Load built script content
function loadScript(scriptName) {
  const scriptPath = resolve(__dirname, '../build', `${scriptName}.js`);
  try {
    return readFileSync(scriptPath, 'utf8');
  } catch (error) {
    console.error(`❌ Failed to load script ${scriptName}:`, error.message);
    return null;
  }
}

// Set nested property in object using dot notation path
function setNestedProperty(obj, path, value) {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
  return obj;
}

// Deploy to Data Element
async function deployToDataElement(client, resource, scriptContent, dryRun) {
  const { resourceId, script } = resource;
  const name = `${script}.js`;

  if (dryRun) {
    console.log(`   🔍 DRY RUN - Would update Data Element: ${resourceId} (name: ${name})`);
    return { success: true, dryRun: true };
  }

  console.log(`   📥 Fetching current Data Element config...`);
  const current = await client.getDataElement(resourceId);

  const currentSettings =
    typeof current.data.attributes.settings === 'string'
      ? JSON.parse(current.data.attributes.settings)
      : current.data.attributes.settings;

  const newSettings = {
    ...currentSettings,
    source: scriptContent,
  };

  console.log(`   📤 Updating Data Element (name: ${name})...`);
  await client.updateDataElement({
    id: resourceId,
    type: 'data_elements',
    attributes: { name, settings: JSON.stringify(newSettings) },
  });

  return { success: true };
}

// Deploy to Rule Component (action/condition)
async function deployToRuleComponent(client, resource, scriptContent, dryRun) {
  const { ruleComponentId, script } = resource;
  const name = `${script}.js`;

  if (dryRun) {
    console.log(`   🔍 DRY RUN - Would update Rule Component: ${ruleComponentId} (name: ${name})`);
    return { success: true, dryRun: true };
  }

  console.log(`   📥 Fetching current Rule Component config...`);
  const current = await client.getRuleComponent(ruleComponentId);

  const currentSettings =
    typeof current.data.attributes.settings === 'string'
      ? JSON.parse(current.data.attributes.settings)
      : current.data.attributes.settings;

  const newSettings = {
    ...currentSettings,
    source: scriptContent,
  };

  console.log(`   📤 Updating Rule Component (name: ${name})...`);
  await client.updateRuleComponent({
    id: ruleComponentId,
    type: 'rule_components',
    attributes: { name, settings: JSON.stringify(newSettings) },
  });

  return { success: true };
}

// Deploy to Extension (via settings path)
async function deployToExtension(client, resource, scriptContent, dryRun) {
  const { extensionId, settingsPath } = resource;

  if (dryRun) {
    console.log(`   🔍 DRY RUN - Would update Extension: ${extensionId} at path: ${settingsPath}`);
    return { success: true, dryRun: true };
  }

  console.log(`   📥 Fetching current Extension config...`);
  const current = await client.getExtension(extensionId);

  const currentSettings =
    typeof current.data.attributes.settings === 'string'
      ? JSON.parse(current.data.attributes.settings)
      : current.data.attributes.settings;

  const newSettings = JSON.parse(JSON.stringify(currentSettings));
  setNestedProperty(newSettings, settingsPath, scriptContent);

  console.log(`   📤 Updating Extension at ${settingsPath}...`);
  await client.updateExtension(extensionId, {
    id: extensionId,
    type: 'extensions',
    attributes: { settings: JSON.stringify(newSettings) },
  });

  return { success: true };
}

// Deploy a single script resource
async function deployScript(client, resource, dryRun = false) {
  const { script, type, comment } = resource;

  console.log(`\n📦 Processing: ${script}`);
  if (comment) {
    console.log(`   ℹ️  ${comment}`);
  }
  console.log(`   📍 Type: ${type}`);

  // Load script content
  const scriptContent = loadScript(script);
  if (!scriptContent) {
    console.log(`   ⚠️  Script file not found, skipping`);
    return { success: false, skipped: true };
  }

  console.log(`   ✓ Loaded script (${scriptContent.length} bytes)`);

  if (dryRun) {
    console.log(
      `   🔍 DRY RUN - Script preview (first 200 chars):\n   ${scriptContent.substring(0, 200)}...`
    );
  }

  try {
    let result;

    switch (type) {
      case 'data_element':
        result = await deployToDataElement(client, resource, scriptContent, dryRun);
        break;

      case 'rule_action':
      case 'rule_condition':
      case 'rule_event':
        result = await deployToRuleComponent(client, resource, scriptContent, dryRun);
        break;

      case 'extension':
        result = await deployToExtension(client, resource, scriptContent, dryRun);
        break;

      default:
        throw new Error(`Unknown resource type: ${type}`);
    }

    if (!dryRun) {
      console.log(`   ✅ Successfully deployed ${script}`);
    }
    return result;
  } catch (error) {
    console.error(`   ❌ Failed to deploy ${script}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Main deployment function
async function deploy() {
  const args = parseArgs();
  const config = loadConfig();

  console.log('\n🚀 AEP Script Deployment Tool');
  console.log('================================');
  console.log(`Environment: ${args.env}`);
  console.log(`Dry Run: ${args.dryRun ? 'YES' : 'NO'}`);
  if (args.script) {
    console.log(`Single Script: ${args.script}`);
  }

  // Validate environment
  validateEnv();

  // Get environment config
  const envConfig = config.environments[args.env];
  if (!envConfig) {
    console.error(`❌ Unknown environment: ${args.env}`);
    console.error(`   Available: ${Object.keys(config.environments).join(', ')}`);
    process.exit(1);
  }

  console.log(`Property ID: ${envConfig.propertyId}`);

  // Initialize Reactor SDK client
  const client = new Reactor(process.env.REACTOR_ACCESS_TOKEN, {
    reactorUrl: process.env.REACTOR_API_URL || 'https://reactor.adobe.io',
    customHeaders: { 'x-gw-ims-org-id': process.env.REACTOR_COMPANY_ID },
  });

  // Get list of resources to deploy
  let resourcesToDeploy = envConfig.resources || [];

  if (args.script) {
    resourcesToDeploy = resourcesToDeploy.filter((r) => r.script === args.script);
    if (resourcesToDeploy.length === 0) {
      console.error(`❌ Script not found in config: ${args.script}`);
      process.exit(1);
    }
  }

  if (resourcesToDeploy.length === 0) {
    console.log('\n⚠️  No resources configured for deployment');
    console.log('   Add resources to deploy-config.json');
    process.exit(0);
  }

  // Deploy each resource
  const results = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
  };

  for (const resource of resourcesToDeploy) {
    results.total++;
    const result = await deployScript(client, resource, args.dryRun);

    if (result.success) {
      results.success++;
    } else if (result.skipped) {
      results.skipped++;
    } else {
      results.failed++;
    }
  }

  // Print summary
  console.log('\n================================');
  console.log('📊 Deployment Summary');
  console.log('================================');
  console.log(`Total: ${results.total}`);
  console.log(`✅ Success: ${results.success}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Skipped: ${results.skipped}`);

  if (args.dryRun) {
    console.log('\n🔍 This was a DRY RUN - no changes were made');
  }

  // Exit with error code if any failed
  if (results.failed > 0) {
    process.exit(1);
  }
}

// Run deployment
deploy().catch((error) => {
  console.error('\n❌ Deployment failed:', error);
  process.exit(1);
});
