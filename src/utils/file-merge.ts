export function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    if (typeof target !== 'object' || target === null) {
        return source;
    }
    if (typeof source !== 'object' || source === null) {
        return target;
    }

    const output = { ...target };

    Object.keys(source).forEach(key => {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
            if (!(key in target)) {
                output[key] = source[key];
            } else {
                output[key] = deepMerge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
            }
        } else {
            output[key] = source[key];
        }
    });

    return output;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export interface MergeResult {
    tokens: Record<string, unknown>;
    skippedFiles: string[];
}

export async function mergeTokenFiles(files: File[]): Promise<MergeResult> {
    const jsonFiles = files.filter(
        (f) => f.name.endsWith('.json') && f.name !== '$metadata.json' && f.name !== '$themes.json'
    );
    let combinedTokens: Record<string, unknown> = {};
    const skippedFiles: string[] = [];

    for (const file of jsonFiles) {
        if (file.size > MAX_FILE_SIZE) {
            skippedFiles.push(`${file.name} (exceeds ${MAX_FILE_SIZE / 1024 / 1024} MB limit)`);
            continue;
        }

        try {
            const text = await file.text();
            const json = JSON.parse(text);
            combinedTokens = deepMerge(combinedTokens, json);
        } catch (e) {
            const detail = e instanceof Error ? e.message : String(e);
            skippedFiles.push(`${file.name} (${detail})`);
        }
    }

    return { tokens: combinedTokens, skippedFiles };
}
