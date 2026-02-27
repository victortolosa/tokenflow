import { useEffect, useState } from 'react';
import { useTokenStore } from '@/store/useTokenStore';
import { mergeTokenFiles } from '@/utils/file-merge';
import { Upload, FolderInput } from 'lucide-react';

const MAX_SINGLE_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function TokenUploader() {
    const { rawTokens, applyOverrideTokens, isLoadingTokens } = useTokenStore();
    const [input, setInput] = useState(rawTokens);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setInput((current) => (current === rawTokens ? current : rawTokens));
    }, [rawTokens]);

    const processTokens = (tokens: Record<string, unknown>) => {
        const jsonString = JSON.stringify(tokens, null, 2);
        setInput(jsonString);
        setError(null);

        applyOverrideTokens(tokens).catch((err: unknown) => {
            const detail = err instanceof Error ? err.message : String(err);
            setError(`Failed to apply token overrides: ${detail}`);
        });
    };

    const handleApply = () => {
        try {
            const parsed = JSON.parse(input);
            processTokens(parsed);
        } catch {
            setError('Invalid JSON format. Please check your input and try again.');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const files = Array.from(e.target.files);

        try {
            if (files.length === 1 && files[0].name.endsWith('.json')) {
                const file = files[0];
                if (file.size > MAX_SINGLE_FILE_SIZE) {
                    setError(`File "${file.name}" exceeds the ${MAX_SINGLE_FILE_SIZE / 1024 / 1024} MB size limit.`);
                    return;
                }
                const text = await file.text();
                processTokens(JSON.parse(text));
            } else {
                const { tokens, skippedFiles } = await mergeTokenFiles(files);
                if (skippedFiles.length > 0) {
                    setError(`Some files were skipped:\n${skippedFiles.join('\n')}`);
                }
                if (Object.keys(tokens).length === 0) {
                    setError('No valid token data found in the uploaded files.');
                    return;
                }
                processTokens(tokens);
            }
        } catch (err: unknown) {
            const detail = err instanceof Error ? err.message : String(err);
            setError(`Failed to parse uploaded file(s): ${detail}`);
        }
    };

    return (
        <div className="p-4 border rounded-lg bg-white shadow-sm flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Token Source</h2>

            <div className="flex gap-2">
                <label className="flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <Upload className="w-6 h-6 text-gray-400 mb-2" />
                    <span className="text-xs text-gray-500">Upload single .json</span>
                    <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>

                <label className="flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <FolderInput className="w-6 h-6 text-gray-400 mb-2" />
                    <span className="text-xs text-gray-500">Upload folder</span>
                    <input
                        type="file"
                        // @ts-expect-error webkitdirectory is non-standard but supported
                        webkitdirectory=""
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                </label>
            </div>

            <div className="relative">
                <textarea
                    className="w-full h-48 p-2 border rounded font-mono text-xs bg-gray-50 text-black resize-y focus:border-blue-500 focus:outline-none"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Or paste your tokens.json here..."
                />
            </div>

            {error && <p className="text-red-500 text-sm whitespace-pre-line">{error}</p>}

            <button
                onClick={handleApply}
                disabled={isLoadingTokens}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
                {isLoadingTokens ? 'Applying...' : 'Load JSON Text'}
            </button>
        </div>
    );
}
