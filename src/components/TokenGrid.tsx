
import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Token {
    name: string;
    value: any;
    type: string;
    description?: string;
    originalValue?: any;
}

interface TokenGridProps {
    tokens: Token[];
    type: 'color' | 'typography' | 'spacing' | 'shadow' | 'borderRadius' | 'borderWidth';
}

const CopyValue = ({ value }: { value: string }) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer flex items-center gap-1"
            title="Copy to clipboard"
        >
            {value}
            {copied && <span className="text-green-500 text-[10px]">Copied!</span>}
        </button>
    );
};

export const TokenGrid: React.FC<TokenGridProps> = ({ tokens, type }) => {
    if (type === 'color') {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {tokens.map((token) => (
                    <div key={token.name} className="flex flex-col gap-2 p-4 border rounded-lg bg-white shadow-sm">
                        <div
                            className="w-full h-24 rounded-md border border-gray-100 shadow-inner"
                            style={{ backgroundColor: token.value }}
                        />
                        <div className="flex flex-col">
                            <span className="font-semibold text-sm text-gray-900 truncate" title={token.name}>
                                {token.name.split('.').pop()}
                            </span>
                            <span className="text-xs text-gray-500 mb-1 truncate" title={token.name}>
                                {token.name}
                            </span>
                            <CopyValue value={token.value} />
                            {token.description && (
                                <p className="text-xs text-gray-400 mt-2 line-clamp-2" title={token.description}>
                                    {token.description}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (type === 'typography') {
        // Group by category (e.g. h1, h2, body) based on name prefix if possible, or just list them
        // For now, simple list
        return (
            <div className="grid gap-8">
                {tokens.map((token) => (
                    <div key={token.name} className="flex flex-col gap-2 border-b pb-8 last:border-0">
                        <div className="flex items-baseline justify-between">
                            <span className="text-sm font-mono text-gray-500">{token.name}</span>
                            <CopyValue value={JSON.stringify(token.value, null, 2)} />
                        </div>

                        {/* 
                          We need to apply the typography styles to a sample text. 
                          Since the token value is an object or string, we might need a way to apply it.
                          If token.type is 'fontSizes', it's just a size.
                          If it's a composite typography token, value is an object.
                      */}

                        {typeof token.value === 'object' ? (
                            <div style={{
                                fontFamily: token.value.fontFamily,
                                fontSize: token.value.fontSize,
                                fontWeight: token.value.fontWeight,
                                lineHeight: token.value.lineHeight,
                                letterSpacing: token.value.letterSpacing,
                            }}>
                                The quick brown fox jumps over the lazy dog.
                            </div>
                        ) : (
                            <div style={{ [token.type === 'fontSizes' ? 'fontSize' : 'fontFamily']: token.value }}>
                                {token.value} — The quick brown fox jumps over the lazy dog.
                            </div>
                        )}

                        <div className="text-xs text-gray-400">
                            {typeof token.value === 'object' ? JSON.stringify(token.value) : token.value}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (type === 'spacing') {
        return (
            <div className="flex flex-col gap-4">
                {tokens.map((token) => (
                    <div key={token.name} className="flex items-center gap-4">
                        <div className="w-24 text-sm font-medium text-gray-900 truncate" title={token.name}>
                            {token.name.split('.').pop()}
                        </div>
                        <div
                            className="h-8 bg-blue-500 rounded-sm"
                            style={{ width: token.value }}
                        />
                        <div className="text-xs text-gray-500">
                            {token.value}
                        </div>
                        <div className="text-xs text-gray-400 ml-auto">
                            {token.name}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (type === 'borderRadius') {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {tokens.map((token) => (
                    <div key={token.name} className="flex flex-col items-center gap-3">
                        <div
                            className="w-24 h-24 bg-blue-100 border border-blue-300"
                            style={{ borderRadius: token.value }}
                        />
                        <div className="text-center">
                            <div className="text-sm font-medium">{token.name.split('.').pop()}</div>
                            <div className="text-xs text-gray-500">{token.value}</div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (type === 'shadow') {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 p-4">
                {tokens.map((token) => {
                    // shadow value can be a string or object
                    let shadowValue = '';
                    if (typeof token.value === 'string') {
                        shadowValue = token.value;
                    } else {
                        // construct shadow string if it's an object from standard SD format
                        // { x, y, blur, spread, color }
                        const { x, y, blur, spread, color } = token.value;
                        shadowValue = `${x} ${y} ${blur} ${spread} ${color}`;
                    }

                    return (
                        <div key={token.name} className="flex flex-col items-center gap-3">
                            <div
                                className="w-24 h-24 bg-white rounded-lg"
                                style={{ boxShadow: shadowValue }}
                            />
                            <div className="text-center">
                                <div className="text-sm font-medium">{token.name.split('.').pop()}</div>
                                <div className="text-xs text-gray-500 max-w-[150px] truncate" title={shadowValue}>{shadowValue}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    if (type === 'borderWidth') {
        return (
            <div className="flex flex-col gap-4">
                {tokens.map((token) => (
                    <div key={token.name} className="flex items-center gap-4">
                        <div className="w-24 text-sm font-medium text-gray-900 truncate" title={token.name}>
                            {token.name.split('.').pop()}
                        </div>
                        <div
                            className="h-8 bg-gray-200 border-black"
                            style={{ borderBottomWidth: token.value, width: '100px' }}
                        />
                        <div className="text-xs text-gray-500">
                            {token.value}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <pre className="p-4 bg-gray-100 rounded-lg overflow-auto">
            {JSON.stringify(tokens, null, 2)}
        </pre>
    );
};
