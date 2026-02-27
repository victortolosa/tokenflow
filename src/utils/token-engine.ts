import StyleDictionary from 'style-dictionary';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolveTokens(rawTokens: Record<string, unknown>): Promise<Record<string, unknown>> {
    const sd = new StyleDictionary({
        tokens: rawTokens as any,
        platforms: {
            css: {
                transformGroup: 'css',
            },
        }
    });

    return await sd.exportPlatform('css') as Record<string, unknown>;
}
