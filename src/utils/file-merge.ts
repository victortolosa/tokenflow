export function deepMerge(target: any, source: any): any {
    if (typeof target !== 'object' || target === null) {
        return source;
    }
    if (typeof source !== 'object' || source === null) {
        return target;
    }

    const output = { ...target };

    Object.keys(source).forEach(key => {
        if (typeof source[key] === 'object' && source[key] !== null) {
            if (!(key in target)) {
                Object.assign(output, { [key]: source[key] });
            } else {
                output[key] = deepMerge(target[key], source[key]);
            }
        } else {
            Object.assign(output, { [key]: source[key] });
        }
    });

    return output;
}

export async function mergeTokenFiles(files: File[]): Promise<any> {
    const jsonFiles = files.filter(f => f.name.endsWith('.json') && f.name !== '$metadata.json');
    let combinedTokens = {};

    for (const file of jsonFiles) {
        try {
            const text = await file.text();
            const json = JSON.parse(text);
            // If it's a "Split by top-level" export, the file name usually indicates the top-level key?
            // Actually, standard Tokens Studio multi-file export usually contains the top-level object *inside* the file, 
            // or the file content IS the partial object.
            // E.g. global.json -> { "color": { ... } }
            // So deep merging them all together should work.

            combinedTokens = deepMerge(combinedTokens, json);
        } catch (e) {
            console.warn(`Failed to parse ${file.name}`, e);
        }
    }

    return combinedTokens;
}
