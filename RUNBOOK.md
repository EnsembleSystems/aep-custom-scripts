# AEP Custom Scripts Deployment Runbook

This guide explains how to deploy custom scripts to Adobe Experience Platform (AEP) Data Collection.

## Table of Contents

- [Prerequisites](#prerequisites)
- [1. Extension Configuration](#1-extension-configuration)
- [2. Data Elements](#2-data-elements)
- [3. Rules](#3-rules)
- [4. Build & Publish](#4-build--publish)

---

## Prerequisites

1. Ensure you have access to [Adobe Partner Portal - Data Collection Tags](https://experience.adobe.com/#/@adobepartners/sname:partnerportal-dev/platform/data-collection/tags/companies/COf8e5b64383f845cf9e1ce1af7fac5c00/properties/PR2e6c918ddbcb46e2b3e03f0b3691c1f2/overview)
2. Run `npm run build` locally to generate the latest scripts in the `build/` folder

---

## 1. Extension Configuration

Update the Web SDK extension callbacks with custom data collection scripts.

### Steps

1. Go to **AEP → Data Collection → Tags**
2. Select [Adobe Partner Portal](https://experience.adobe.com/#/@adobepartners/sname:partnerportal-dev/platform/data-collection/tags/companies/COf8e5b64383f845cf9e1ce1af7fac5c00/properties/PR2e6c918ddbcb46e2b3e03f0b3691c1f2/overview)
3. Select **Extensions** from the left sidebar
4. Select [Adobe Experience Platform Web SDK](https://experience.adobe.com/#/@adobepartners/sname:partnerportal-dev/platform/data-collection/tags/companies/COf8e5b64383f845cf9e1ce1af7fac5c00/properties/PR2e6c918ddbcb46e2b3e03f0b3691c1f2/extensions/EX5d92af18b9104d9d8b5af20bd1f1a6a9?reactor-lens_version=prod20260115205753)
5. Scroll down to the **Data Collection** section

### Script Mappings

| Build File                                           | AEP Location                                      |
| ---------------------------------------------------- | ------------------------------------------------- |
| `build/customDataCollectionOnBeforeEventSend.js`     | "On before event send callback" custom code block |
| `build/customDataCollectionOnFilterClickCallback.js` | "Filter click details" custom code block          |

---

## 2. Data Elements

Update the custom code for each data element.

### AttendeeData

1. Select **Data Elements** from the left sidebar
2. Search for and select **AttendeeData**
3. Click **Open Editor**
4. Copy and paste contents of `build/extractAttendeeData.js`
5. Click **Keep Changes**

### EventData

1. Select **Data Elements** from the left sidebar
2. Search for and select **EventData**
3. Click **Open Editor**
4. Copy and paste contents of `build/getEventData.js`
5. Click **Keep Changes**

### PartnerDatta (Note: double t)

1. Select **Data Elements** from the left sidebar
2. Search for and select **PartnerDatta** (Note: double t)
3. Click **Open Editor**
4. Copy and paste contents of `build/extractPartnerData.js`
5. Click **Keep Changes**

---

## 3. Rules

Update rule actions with custom code.

### Event Pages - onPageTop

1. Select **Rules** from the left sidebar
2. Search for and select **Event Pages - onPageTop**
3. Click on **Core - Custom Code (fetchEventData.js)**
4. Copy and paste contents of `build/fetchEventData.js` into the custom JS code editor
5. Click **Keep Changes**

### Login Page - PageLoad - Send Event (Optional)

> **Note:** This rule is currently a placeholder and can be skipped.

1. Select **Rules** from the left sidebar
2. Search for and select **Login Page - PageLoad - Send Event**
3. Click on **Core - Custom Code (customOnPageLoadEvent.js)**
4. Copy and paste contents of `build/customOnPageLoad.js` into the custom JS code editor
5. Click **Keep Changes**

### Search Page Entry

1. Select **Rules** from the left sidebar
2. Search for and select **Search Page Entry**
3. **Update Condition:**
   - Click on the condition **Core - Custom Code (searchConditionEntry.js)**
   - Copy and paste contents of `build/searchConditionEntry.js` into the custom JS code editor
   - Click **Keep Changes**
4. **Update Action:**
   - Click on **Core - Custom Code (searchTrackerEntry.js)**
   - Copy and paste contents of `build/searchTrackerEntry.js` into the custom JS code editor
   - Click **Keep Changes**

### Search URL Monitor

1. Select **Rules** from the left sidebar
2. Search for and select **Search URL Monitor**
3. Click on **Core - Custom Code (searchUrlMonitor.js)**
4. Copy and paste contents of `build/searchUrlMonitor.js` into the custom JS code editor
5. Click **Keep Changes**

### Search URL Change (Dynamic Search)

1. Select **Rules** from the left sidebar
2. Search for and select **Search URL Change** or **Dynamic Search Detection**
3. Click on **Core - Custom Code (searchTrackerDynamic.js)**
4. Copy and paste contents of `build/searchTrackerDynamic.js` into the custom JS code editor
5. Click on **Core - Custom Code (searchVariableSetter.js)**
6. Copy and paste contents of `build/searchVariableSetter.js` into the custom JS code editor
7. Click **Keep Changes**

---

## 4. Build & Publish

### Save and Build

1. After making all changes, click **Save to Library**
2. Click **Build**

### Publish to Staging

1. Select **Publishing Flow** from the left sidebar
2. Select your library
3. Click **Submit and Build to Staging**

## 5. TODO

### Missing Publisher/Partner ID extraction

1. Select **Data Elements** or **Rules\*** from the left sidebar
2. Search for and select **TBD: Not defined yet**
3. Click **Open Editor**
4. Copy and paste contents of `src/scripts/extractPublisherId.ts`
5. Click **Keep Changes**
