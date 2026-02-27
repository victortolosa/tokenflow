'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X, Upload, FolderInput } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTokenStore } from '@/store/useTokenStore';
import { mergeTokenFiles } from '@/utils/file-merge';

const MAX_SINGLE_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface ImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ImportModal({ open, onOpenChange }: ImportModalProps) {
    const { rawTokens, applyOverrideTokens, isLoadingTokens } = useTokenStore();
    const [input, setInput] = useState(rawTokens);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setInput((current) => (current === rawTokens ? current : rawTokens));
    }, [rawTokens, open]);

    const processTokens = (tokens: Record<string, unknown>) => {
        const jsonString = JSON.stringify(tokens, null, 2);
        setInput(jsonString);
        setError(null);

        applyOverrideTokens(tokens)
            .then(() => {
                onOpenChange(false);
            })
            .catch((err: unknown) => {
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
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl w-full max-w-lg p-6 focus:outline-none">
                    <div className="flex items-center justify-between mb-4">
                        <Dialog.Title className="text-lg font-semibold text-gray-900">
                            Import Tokens
                        </Dialog.Title>
                        <Dialog.Close className="p-1 rounded hover:bg-gray-100 transition-colors">
                            <X className="w-5 h-5 text-gray-500" />
                        </Dialog.Close>
                    </div>

                    <Dialog.Description className="text-sm text-gray-500 mb-4">
                        Import design tokens from a Tokens Studio JSON file or folder.
                    </Dialog.Description>

                    <div className="flex gap-2 mb-4">
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

                    <div className="relative mb-4">
                        <textarea
                            className="w-full h-48 p-2 border rounded font-mono text-xs bg-gray-50 text-black resize-y focus:border-blue-500 focus:outline-none"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Or paste your tokens.json here..."
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm mb-4 whitespace-pre-line">{error}</p>}

                    <button
                        onClick={handleApply}
                        disabled={isLoadingTokens}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isLoadingTokens ? 'Applying...' : 'Load JSON'}
                    </button>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
