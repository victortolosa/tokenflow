import { isTokenLeaf } from './token-format';

/**
 * Deep-clones baseTokens and replaces every leaf's `value` with the
 * corresponding resolved/edited value from resolvedTokens.
 * Preserves the original Tokens Studio structure (grouping, types, descriptions).
 */
export function buildExportTokens(
  baseTokens: Record<string, unknown>,
  resolvedTokens: Record<string, unknown>,
): Record<string, unknown> {
  const clone = structuredClone(baseTokens);

  function walk(base: Record<string, unknown>, resolved: Record<string, unknown>) {
    for (const key of Object.keys(base)) {
      const baseNode = base[key];
      const resolvedNode = resolved[key];

      if (isTokenLeaf(baseNode) && isTokenLeaf(resolvedNode)) {
        baseNode.value = resolvedNode.value;
      } else if (
        typeof baseNode === 'object' && baseNode !== null &&
        typeof resolvedNode === 'object' && resolvedNode !== null
      ) {
        walk(
          baseNode as Record<string, unknown>,
          resolvedNode as Record<string, unknown>,
        );
      }
    }
  }

  walk(clone, resolvedTokens);
  return clone;
}

/** Triggers a browser download of `data` as a JSON file. */
export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
