/**
 * Custom On Page Load Script for Adobe Experience Platform (AEP)
 *
 * This is a placeholder script that can be customized for page load events.
 * Currently outputs only the test header and returns null.
 *
 * USAGE IN ADOBE LAUNCH:
 * ----------------------
 * This script should be used in a RULE ACTION on page load.
 *
 * Setup:
 * 1. Create a Rule with Event Type: "Page Bottom" or "DOM Ready"
 * 2. In the Action, select "Custom Code"
 * 3. Paste this script
 */

import { createLogger } from '../utils/logger.js';

// Types
export interface CustomOnPageLoadConfig {
  debug: boolean;
}

/**
 * Main entry point for the custom on page load script
 *
 * @param testMode - Set to true for console testing, false for AEP deployment (default: false)
 *
 * USAGE IN LAUNCH RULE ACTION (Page Load):
 * -----------------------------------------
 * Call this script on page load (Page Bottom or DOM Ready event):
 * return customOnPageLoadScript();
 *
 * TESTING IN BROWSER CONSOLE:
 * ----------------------------
 * customOnPageLoadScript(true);
 */
export function customOnPageLoadScript(testMode: boolean = false): null {
  const config: CustomOnPageLoadConfig = {
    debug: testMode,
  };

  const logger = createLogger(config.debug, 'Custom On Page Load', testMode);

  try {
    logger.testHeader('CUSTOM ON PAGE LOAD SCRIPT');

    // Placeholder - add custom logic here as needed
    logger.log('Custom on page load script executed');

    return null;
  } catch (error) {
    logger.error('Unexpected error in custom on page load script:', error);
    return null;
  }
}
