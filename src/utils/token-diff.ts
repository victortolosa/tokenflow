import { isTokenLeaf } from './token-format';
import type { TokenLeaf } from './token-types';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function areTokenValuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!areTokenValuesEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (isObject(a) && isObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
      if (!areTokenValuesEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

export function hasTokenDifferences(a: unknown, b: unknown): boolean {
  if (isTokenLeaf(a) && isTokenLeaf(b)) {
    return !areTokenValuesEqual(a.value, b.value);
  }

  if (isTokenLeaf(a) || isTokenLeaf(b)) return true;

  if (isObject(a) && isObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
      if (hasTokenDifferences(a[key], b[key])) return true;
    }
    return false;
  }

  return !areTokenValuesEqual(a, b);
}

export function getTokenLeafAtPath(
  tokens: Record<string, unknown> | null,
  path: string
): TokenLeaf | null {
  if (!tokens) return null;
  const parts = path.split('.');
  let current: unknown = tokens;

  for (const part of parts) {
    if (!isObject(current) || !(part in current)) return null;
    current = (current as Record<string, unknown>)[part];
  }

  return isTokenLeaf(current) ? (current as TokenLeaf) : null;
}
