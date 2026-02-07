
/**
 * Utility to fetch and resolve design tokens from the public directory.
 * This is used by Storybook to display the design system.
 */

export type TokenValue = {
    value: string | number | Record<string, any>;
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
            throw new Error(`Failed to fetch tokens at ${path}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching tokens:', error);
        return {};
    }
}

/**
 * Resolves a token reference path like "Neutral.--neutral-v700" to its value.
 * Handles nested paths of any depth.
 */
function resolveReference(pathString: string, allTokens: any, visited: Set<string> = new Set()): any {
    // Prevent infinite loops
    if (visited.has(pathString)) {
        console.warn(`Circular reference detected: ${pathString}`);
        return null;
    }
    visited.add(pathString);

    const path = pathString.split('.');
    let current = allTokens;

    for (const part of path) {
        if (current && typeof current === 'object' && part in current) {
            current = current[part];
        } else {
            console.warn(`[resolveReference] Failed at path "${pathString}", part "${part}" not found. Available:`,
                current ? Object.keys(current).slice(0, 5) : 'null');
            return null;
        }
    }

    // If we found a token object with a value property, resolve that value
    if (current && typeof current === 'object' && 'value' in current) {
        return resolveTokenValue(current.value, allTokens, visited);
    }

    return current;
}

/**
 * Resolves a token value that might be a reference (e.g., "{Palette.Blue.v50}")
 * to its actual value (e.g., "#61C9FF").
 */
export function resolveTokenValue(value: any, allTokens: any, visited: Set<string> = new Set()): any {
    if (typeof value !== 'string') {
        // If it's an object (like a shadow definition), resolve its properties
        if (typeof value === 'object' && value !== null) {
            const resolvedObject: any = {};
            for (const key in value) {
                resolvedObject[key] = resolveTokenValue(value[key], allTokens, new Set(visited));
            }
            return resolvedObject;
        }
        return value;
    }

    // Check if the string contains any references like {Group.SubGroup.Token}
    const referenceRegex = /\{([^}]+)\}/g;
    const matches = Array.from(value.matchAll(referenceRegex));

    if (matches.length === 0) {
        return value;
    }

    // Case 1: The whole string is exactly one reference
    if (matches.length === 1 && matches[0][0] === value) {
        const resolved = resolveReference(matches[0][1], allTokens, visited);
        if (resolved === null) {
            return value; // Return original if resolution failed
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
    tokens: any,
    allTokens: any,
    groupName: string = ''
): Array<{ name: string; value: any; type: string; originalValue: any; description?: string }> {
    let flattened: any[] = [];

    for (const key in tokens) {
        const token = tokens[key];

        if (typeof token === 'object' && token !== null) {
            if ('value' in token && 'type' in token) {
                // It's a token definition
                const name = groupName ? `${groupName}.${key}` : key;
                flattened.push({
                    name,
                    value: resolveTokenValue(token.value, allTokens),
                    originalValue: token.value,
                    type: token.type,
                    description: token.description,
                });
            } else {
                // It's a group - recurse
                const newGroupName = groupName ? `${groupName}.${key}` : key;
                flattened = [
                    ...flattened,
                    ...flattenTokens(token, allTokens, newGroupName)
                ];
            }
        }
    }

    return flattened;
}

function isObject(item: any) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

export function deepMerge(target: any, source: any): any {
    const output = { ...target };
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    Object.assign(output, { [key]: source[key] });
                } else {
                    output[key] = deepMerge(target[key], source[key]);
                }
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }
    return output;
}
