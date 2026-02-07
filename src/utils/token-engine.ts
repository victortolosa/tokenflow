import StyleDictionary from 'style-dictionary';

// We need to use a custom parser because we're passing a JS object/string directly, 
// not reading from a file system, and also to handle Tokens Studio format nuances if any.
// However, SD v4 might be different. Let's try to stick to basic SD usage first.

export async function resolveTokens(rawTokens: Record<string, any>) {
    // Style Dictionary v4 usage
    const sd = new StyleDictionary({
        tokens: rawTokens,
        platforms: {
            css: {
                transformGroup: 'css',
            },
        }
    });

    const resolved = await sd.exportPlatform('css');
    return resolved;
}
