/**
 * DOM utility functions for working with elements, shadow DOM, and attributes
 */

import type { Logger } from './logger.js';

/**
 * Splits a string by delimiter and returns the part at the specified index
 * Returns empty string if index is out of bounds
 *
 * @param value - The string to split
 * @param delimiter - The delimiter to split by
 * @param index - The zero-based index of the part to return
 * @returns The trimmed part at the specified index, or empty string if not found
 *
 * @example
 * splitAndGet('Card 1 | Title | abc123', '|', 2) // Returns 'abc123'
 * splitAndGet('Card 1 | Title', '|', 5) // Returns ''
 */
export function splitAndGet(value: string, delimiter: string, index: number): string {
  if (!value || index < 0) {
    return '';
  }

  const parts = value.split(delimiter).map((part) => part.trim());
  return parts[index] || '';
}

/**
 * Safely gets an attribute value from an element
 * Returns empty string if element or attribute doesn't exist
 *
 * @param element - The element to get the attribute from (can be null/undefined)
 * @param attributeName - The name of the attribute
 * @returns The attribute value or empty string
 *
 * @example
 * getAttribute(element, 'daa-lh') // Returns attribute value or ''
 */
export function getAttribute(element: Element | null | undefined, attributeName: string): string {
  if (!element) {
    return '';
  }
  return element.getAttribute(attributeName) || '';
}

/**
 * Safely gets text content from an element
 * Returns empty string if element doesn't exist
 *
 * @param element - The element to get text content from (can be null/undefined)
 * @returns The text content or empty string
 *
 * @example
 * getTextContent(element) // Returns text content or ''
 */
export function getTextContent(element: Element | null | undefined): string {
  if (!element) {
    return '';
  }
  return element.textContent?.trim() || '';
}

/**
 * Safely queries the shadow DOM of an element
 * Returns null if element or shadowRoot doesn't exist
 *
 * @param element - The element with a shadow root
 * @param selector - The CSS selector to query
 * @returns The first matching element or null
 *
 * @example
 * queryShadow(cardElement, '.card-title') // Returns element or null
 */
export function queryShadow(element: Element | null | undefined, selector: string): Element | null {
  if (!element) {
    return null;
  }

  const { shadowRoot } = element as Element & { shadowRoot?: ShadowRoot };

  if (!shadowRoot) {
    return null;
  }

  return shadowRoot.querySelector(selector);
}

/**
 * Finds the first element in an event's composed path that matches a predicate
 * Works through shadow DOM boundaries
 *
 * @param event - The event to traverse
 * @param predicate - Function to test each element
 * @returns The first matching element or null
 *
 * @example
 * findInComposedPath(event, (el) => el.tagName.toLowerCase() === 'button')
 */
export function findInComposedPath(
  event: Event,
  predicate: (element: Element) => boolean
): Element | null {
  const path = event.composedPath();

  const element = path.find((item): item is Element => item instanceof Element && predicate(item));

  return element || null;
}

/**
 * Checks if an element matches any of the given criteria
 *
 * @param element - The element to check
 * @param tagName - Optional tag name to match (case-insensitive)
 * @param className - Optional class name to match
 * @returns True if element matches any criterion
 *
 * @example
 * matchesElement(el, 'single-partner-card', 'card-wrapper')
 */
export function matchesElement(element: Element, tagName?: string, className?: string): boolean {
  let matches = false;

  if (tagName) {
    matches = matches || element.tagName.toLowerCase() === tagName.toLowerCase();
  }

  if (className) {
    matches = matches || element.classList.contains(className);
  }

  return matches;
}

/**
 * Dispatches a custom event on the document
 *
 * @param eventName - The name of the custom event
 * @param detail - Optional data to include with the event
 * @param logger - Optional logger instance for debug logging
 *
 * @example
 * dispatchCustomEvent('partnerCardClick', { cardId: '123' }, logger)
 */
export function dispatchCustomEvent(eventName: string, detail?: unknown, logger?: Logger): void {
  if (logger) {
    logger.log(`Dispatching custom event: ${eventName}`, detail);
  }
  document.dispatchEvent(new CustomEvent(eventName, { detail }));
}

/**
 * Creates an element matcher predicate for use with findInComposedPath
 * @param tagName - Optional tag name to match (case-insensitive)
 * @param className - Optional class name to match
 * @returns Predicate function
 *
 * @example
 * const isCard = createElementMatcher('single-partner-card', 'card-wrapper');
 * findInComposedPath(event, isCard);
 */
export function createElementMatcher(
  tagName?: string,
  className?: string
): (element: Element) => boolean {
  return (element: Element) => {
    if (tagName && element.tagName.toLowerCase() === tagName.toLowerCase()) {
      return true;
    }
    if (className && element.classList.contains(className)) {
      return true;
    }
    return false;
  };
}

/**
 * Extracts a structured value from a delimited attribute
 * @param element - Element to extract from
 * @param attributeName - Name of the attribute
 * @param delimiter - Delimiter to split by
 * @param indices - Object mapping names to indices
 * @returns Object with extracted values
 *
 * @example
 * extractStructuredAttribute(
 *   element,
 *   'daa-lh',
 *   '|',
 *   { position: 0, contentID: 2 }
 * )
 * // Returns { position: '1', contentID: 'abc123' }
 */
export function extractStructuredAttribute(
  element: Element | null | undefined,
  attributeName: string,
  delimiter: string,
  indices: Record<string, number>
): Record<string, string> {
  const attrValue = getAttribute(element, attributeName);

  if (!attrValue) {
    return {};
  }

  const result: Record<string, string> = {};

  Object.entries(indices).forEach(([key, index]) => {
    const value = splitAndGet(attrValue, delimiter, index);
    if (value) {
      result[key] = value;
    }
  });

  return result;
}
