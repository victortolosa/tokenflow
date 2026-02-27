
/**
 * Utility to fetch and resolve design tokens from the public directory.
 * This is used by Storybook to display the design system.
 */

export type TokenValue = {
    value: string | number | Record<string, unknown>;
    type: string;
    description?: string;
    x?: string;
    y?: string;
    blur?: string;
    spread?: string;
    color?: string;
};

export type TokenSet = Record<string, TokenValue | Record<string, TokenValue>>;

export async function fetchTokens(path: string): Promise<TokenSet> {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} fetching ${path}`);
        }
        return await response.json();
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        console.error(`[fetchTokens] Failed to load "${path}": ${detail}`);
        return {};
    }
}

/**
 * Resolves a token reference path like "Neutral.--neutral-v700" to its value.
 * Handles nested paths of any depth.
 */
function resolveReference(pathString: string, allTokens: Record<string, unknown>, visited: Set<string> = new Set()): unknown {
    if (visited.has(pathString)) {
        console.warn(`Circular reference detected: ${pathString}`);
        return null;
    }
    visited.add(pathString);

    const path = pathString.split('.');
    let current: unknown = allTokens;

    for (const part of path) {
        if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
            current = (current as Record<string, unknown>)[part];
        } else {
            console.warn(`[resolveReference] Failed at path "${pathString}", part "${part}" not found.`);
            return null;
        }
    }

    if (current && typeof current === 'object' && 'value' in (current as Record<string, unknown>)) {
        return resolveTokenValue((current as Record<string, unknown>).value, allTokens, visited);
    }

    return current;
}

/**
 * Resolves a token value that might be a reference (e.g., "{Palette.Blue.v50}")
 * to its actual value (e.g., "#61C9FF").
 */
export function resolveTokenValue(value: unknown, allTokens: Record<string, unknown>, visited: Set<string> = new Set()): unknown {
    if (typeof value !== 'string') {
        if (typeof value === 'object' && value !== null) {
            const resolvedObject: Record<string, unknown> = {};
            for (const key in (value as Record<string, unknown>)) {
                resolvedObject[key] = resolveTokenValue((value as Record<string, unknown>)[key], allTokens, new Set(visited));
            }
            return resolvedObject;
        }
        return value;
    }

    const referenceRegex = /\{([^}]+)\}/g;
    const matches = Array.from(value.matchAll(referenceRegex));

    if (matches.length === 0) {
        return value;
    }

    // Case 1: The whole string is exactly one reference
    if (matches.length === 1 && matches[0][0] === value) {
        const resolved = resolveReference(matches[0][1], allTokens, visited);
        if (resolved === null) {
            return value;
        }
        return resolved;
    }

    // Case 2: Composite value (e.g., "{spacing.xs} {spacing.s}")
    return value.replace(referenceRegex, (match, pathString) => {
        const resolved = resolveReference(pathString, allTokens, new Set(visited));
        if (resolved === null) {
            return match;
        }
        return String(resolved);
    });
}

/**
 * Flattens a nested token object into a list of tokens with resolved values.
 */
export function flattenTokens(
    tokens: Record<string, unknown>,
    allTokens: Record<string, unknown>,
    groupName: string = ''
): Array<{ name: string; value: unknown; type: string; originalValue: unknown; description?: string }> {
    const flattened: Array<{ name: string; value: unknown; type: string; originalValue: unknown; description?: string }> = [];

    for (const key in tokens) {
        const token = tokens[key];

        if (typeof token === 'object' && token !== null) {
            const tokenObj = token as Record<string, unknown>;
            if ('value' in tokenObj && 'type' in tokenObj) {
                const name = groupName ? `${groupName}.${key}` : key;
                flattened.push({
                    name,
                    value: resolveTokenValue(tokenObj.value, allTokens),
                    originalValue: tokenObj.value,
                    type: tokenObj.type as string,
                    description: tokenObj.description as string | undefined,
                });
            } else {
                const newGroupName = groupName ? `${groupName}.${key}` : key;
                flattened.push(
                    ...flattenTokens(tokenObj as Record<string, unknown>, allTokens, newGroupName)
                );
            }
        }
    }

    return flattened;
}

function isObject(item: unknown): item is Record<string, unknown> {
    return (typeof item === 'object' && item !== null && !Array.isArray(item));
}

export function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const output = { ...target };
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    output[key] = source[key];
                } else {
                    output[key] = deepMerge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
                }
            } else {
                output[key] = source[key];
            }
        });
    }
    return output;
}
