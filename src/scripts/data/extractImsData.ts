/**
 * IMS Data Extractor for Adobe Experience Platform (AEP)
 *
 * Extracts IMS org data (imsID and imsName) from localStorage.
 * Sources (checked in order):
 * 1. "selectedOrg" - if object, uses id/name directly
 * 2. "selectedOrg" - if string (numeric ID), looks up in "orgsArr" by orgID
 */

import { executeScript } from '../../utils/script.js';
import { getStorageItem } from '../../utils/storage.js';
import { isObject, isString, isArray } from '../../utils/validation.js';
import type { Logger } from '../../utils/logger.js';
import type { ImsData } from '../../types/index.js';

// Constants
const SELECTED_ORG_KEY = 'selectedOrg';
const ORGS_ARR_KEY = 'orgsArr';

interface OrgRecord {
  orgID: string;
  orgCode: string;
  orgName: string;
}

/**
 * Extracts IMS data from a selectedOrg object (has id and name fields)
 */
function extractFromOrgObject(selectedOrg: unknown, logger: Logger): ImsData | null {
  if (!isObject(selectedOrg) || !isString(selectedOrg.id) || !selectedOrg.id) {
    return null;
  }

  const id = selectedOrg.id as string;
  const { name } = selectedOrg as { name: string };
  logger.log('Found IMS data from selectedOrg object', { id, name });
  return { imsID: id, imsName: isString(name) ? name : '' };
}

/**
 * Looks up an org by numeric ID in the orgsArr localStorage array
 */
function findOrgInArray(orgId: string, logger: Logger): ImsData | null {
  const orgsArr = getStorageItem<unknown[]>(ORGS_ARR_KEY);

  if (!isArray(orgsArr) || orgsArr.length === 0) {
    logger.log('No orgsArr found in localStorage');
    return null;
  }

  const match = orgsArr.find(
    (org) => isObject(org) && isString(org.orgID) && org.orgID === orgId
  ) as OrgRecord | undefined;

  if (!match) {
    logger.log(`No matching org found for ID: ${orgId}`);
    return null;
  }

  logger.log('Found IMS data from orgsArr lookup', {
    orgCode: match.orgCode,
    orgName: match.orgName,
  });
  return {
    imsID: isString(match.orgCode) ? match.orgCode : '',
    imsName: isString(match.orgName) ? match.orgName : '',
  };
}

/**
 * Main entry point for the IMS data extractor
 * @param testMode - Set to true for console testing, false for AEP deployment
 */
export function extractImsDataScript(testMode: boolean = false): ImsData | null {
  return executeScript(
    {
      scriptName: 'IMS Data',
      testMode,
      testHeaderTitle: 'IMS DATA EXTRACTOR - TEST MODE',
      onError: (error, logger) => {
        logger.error('Unexpected error extracting IMS data:', error);
        return null;
      },
    },
    (logger) => {
      const selectedOrg = getStorageItem<unknown>(SELECTED_ORG_KEY);

      if (selectedOrg === null) {
        logger.log('No selectedOrg found in localStorage');
        return null;
      }

      // Case 1: selectedOrg is an object with id/name
      const fromObject = extractFromOrgObject(selectedOrg, logger);
      if (fromObject) return fromObject;

      // Case 2: selectedOrg is a string or number (numeric ID) — look up in orgsArr
      if ((isString(selectedOrg) && selectedOrg) || typeof selectedOrg === 'number') {
        const orgId = String(selectedOrg);
        logger.log(`selectedOrg is a string/numeric ID: ${orgId}, looking up in orgsArr`);
        const fromArray = findOrgInArray(orgId, logger);
        if (fromArray) return fromArray;
      }

      logger.log('Unable to resolve IMS data from localStorage');
      return null;
    }
  );
}
