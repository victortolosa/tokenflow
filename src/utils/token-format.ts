/**
 * Shared formatting utilities for design tokens.
 * Extracted to avoid duplication across TokenBridge, TokenAccordion,
 * ButtonTokenEditor, and the Storybook preview decorator.
 */

import type { ShadowValue, TokenLeaf } from './token-types';

/** Maximum allowed length for a CSS custom-property value. */
const MAX_CSS_VALUE_LENGTH = 1000;

/**
 * Pattern that matches characters / sequences that are dangerous inside a
 * CSS custom-property value.  Blocks `url(`, `expression(`, `@import`,
 * `</style`, and raw semicolons.
 */
const UNSAFE_CSS_PATTERN = /url\s*\(|expression\s*\(|@import|<\/style|;/i;

// ---------------------------------------------------------------------------
// Shadow formatting
// ---------------------------------------------------------------------------

export function formatShadow(shadow: unknown): string {
  if (!shadow) return '';
  if (Array.isArray(shadow)) {
    return shadow.map(formatShadow).filter(Boolean).join(', ');
  }
  if (typeof shadow === 'string') return shadow;
  if (typeof shadow === 'object' && shadow !== null) {
    const { x = '0px', y = '0px', blur = '0px', spread = '0px', color = 'rgba(0, 0, 0, 0)' } = shadow as ShadowValue;
    return `${x} ${y} ${blur} ${spread} ${color}`;
  }
  return String(shadow);
}

// ---------------------------------------------------------------------------
// Generic token-to-CSS value conversion
// ---------------------------------------------------------------------------

export function toCssValue(token: unknown): string {
  if (!token) return '';

  const rawValue = (typeof token === 'object' && token !== null && 'value' in token)
    ? (token as TokenLeaf).value
    : token;

  const tokenType = (typeof token === 'object' && token !== null && 'type' in token)
    ? (token as TokenLeaf).type
    : null;

  if (tokenType === 'boxShadow') {
    return formatShadow(rawValue);
  }
  if (Array.isArray(rawValue)) {
    return rawValue
      .map((entry) => (typeof entry === 'object' ? formatShadow(entry) : String(entry)))
      .join(', ');
  }
  if (typeof rawValue === 'object' && rawValue !== null) {
    return JSON.stringify(rawValue);
  }
  return String(rawValue);
}

// ---------------------------------------------------------------------------
// Token type guessing (heuristic)
// ---------------------------------------------------------------------------

export function guessTokenType(name: string, value: unknown): string {
  if (typeof value === 'object') return 'typography';
  const str = String(value);
  if (name.includes('color') || str.startsWith('#') || str.startsWith('rgb')) return 'color';
  if (
    name.includes('spacing') ||
    name.includes('size') ||
    str.endsWith('px') ||
    str.endsWith('rem')
  ) {
    return 'spacing';
  }
  return 'other';
}

// ---------------------------------------------------------------------------
// Leaf detection
// ---------------------------------------------------------------------------

export function isTokenLeaf(node: unknown): node is TokenLeaf {
  return typeof node === 'object' && node !== null && 'value' in (node as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Hex colour detection
// ---------------------------------------------------------------------------

export function isHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value);
}

// ---------------------------------------------------------------------------
// CSS value sanitisation
// ---------------------------------------------------------------------------

/**
 * Sanitises a value before it is applied via `style.setProperty()`.
 * Returns the sanitised string or `null` if the value looks malicious.
 */
export function sanitizeCssValue(value: string): string | null {
  if (typeof value !== 'string') return String(value ?? '');
  if (value.length > MAX_CSS_VALUE_LENGTH) return null;
  if (UNSAFE_CSS_PATTERN.test(value)) return null;
  return value;
}
