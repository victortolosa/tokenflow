
import React from 'react';

interface Token {
    name: string;
    value: any;
    type: string;
    description?: string;
    originalValue?: any;
}

interface TokenGridProps {
    tokens: Token[];
    type:
        | 'color'
        | 'typography'
        | 'spacing'
        | 'sizing'
        | 'shadow'
        | 'borderRadius'
        | 'borderWidth'
        | 'backgroundFilter';
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

const formatTokenValue = (value: unknown) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
};

const isMultiValue = (value: unknown) =>
    typeof value === 'string' && value.trim().split(/\s+/).length > 1;

const getTypographyStyle = (token: Token): React.CSSProperties => {
    if (token.value && typeof token.value === 'object') {
        const value = token.value as Record<string, unknown>;
        return {
            fontFamily: value.fontFamily as string | undefined,
            fontSize: value.fontSize as string | undefined,
            fontWeight: value.fontWeight as string | undefined,
            lineHeight: value.lineHeight as string | undefined,
            letterSpacing: value.letterSpacing as string | undefined,
            textTransform: value.textCase as string | undefined,
            textDecoration: value.textDecoration as string | undefined,
        };
    }

    switch (token.type) {
        case 'fontSizes':
            return { fontSize: String(token.value) };
        case 'fontWeights':
            return { fontWeight: String(token.value) };
        case 'fontFamilies':
            return { fontFamily: String(token.value) };
        case 'lineHeights':
            return { lineHeight: String(token.value) };
        case 'letterSpacing':
            return { letterSpacing: String(token.value) };
        case 'textCase':
            return { textTransform: String(token.value) };
        case 'textDecoration':
            return { textDecoration: String(token.value) };
        default:
            return {};
    }
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
                            <CopyValue value={formatTokenValue(token.value)} />
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
        return (
            <div className="grid gap-8">
                {tokens.map((token) => (
                    <div key={token.name} className="flex flex-col gap-2 border-b pb-8 last:border-0">
                        <div className="flex items-baseline justify-between">
                            <span className="text-sm font-mono text-gray-500">{token.name}</span>
                            <CopyValue value={formatTokenValue(token.value)} />
                        </div>

                        <div
                            className="text-gray-900 text-sm"
                            style={{
                                fontSize: token.type === 'fontSizes' ? String(token.value) : '16px',
                                ...getTypographyStyle(token),
                                whiteSpace: token.type === 'lineHeights' ? 'pre-line' : 'normal',
                            }}
                        >
                            {token.type === 'lineHeights'
                                ? 'The quick brown fox jumps over the lazy dog.\nPack my box with five dozen liquor jugs.'
                                : 'The quick brown fox jumps over the lazy dog.'}
                        </div>

                        <div className="text-xs text-gray-400">{formatTokenValue(token.value)}</div>
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
                        {isMultiValue(token.value) ? (
                            <div
                                className="w-28 h-14 border border-dashed border-blue-200 bg-blue-50"
                                style={{ padding: String(token.value) }}
                            >
                                <div className="w-full h-full bg-blue-500 rounded-sm" />
                            </div>
                        ) : (
                            <div
                                className="h-8 bg-blue-500 rounded-sm"
                                style={{ width: String(token.value) }}
                            />
                        )}
                        <div className="text-xs text-gray-500">
                            {formatTokenValue(token.value)}
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
                            style={{ borderRadius: String(token.value) }}
                        />
                        <div className="text-center">
                            <div className="text-sm font-medium">{token.name.split('.').pop()}</div>
                            <div className="text-xs text-gray-500">{formatTokenValue(token.value)}</div>
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

    if (type === 'sizing') {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {tokens.map((token) => (
                    <div key={token.name} className="flex flex-col items-center gap-3">
                        <div className="w-32 h-32 border border-dashed border-gray-200 flex items-center justify-center bg-gray-50">
                            <div
                                className="bg-blue-500/70"
                                style={{
                                    width: String(token.value),
                                    height: String(token.value),
                                    maxWidth: '128px',
                                    maxHeight: '128px',
                                }}
                            />
                        </div>
                        <div className="text-center">
                            <div className="text-sm font-medium">{token.name.split('.').pop()}</div>
                            <div className="text-xs text-gray-500">{formatTokenValue(token.value)}</div>
                        </div>
                    </div>
                ))}
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
                        <div className="w-16 h-16 bg-gray-50 border border-gray-800" style={{ borderWidth: String(token.value) }} />
                        <div className="text-xs text-gray-500">
                            {formatTokenValue(token.value)}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (type === 'backgroundFilter') {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {tokens.map((token) => (
                    <div key={token.name} className="flex flex-col gap-3 p-4 border rounded-lg bg-white shadow-sm">
                        <div
                            className="relative w-full h-24 rounded-md overflow-hidden border border-gray-100"
                            style={{
                                backgroundImage:
                                    'linear-gradient(135deg, #111 25%, #f3f3f3 25%, #f3f3f3 50%, #111 50%, #111 75%, #f3f3f3 75%, #f3f3f3 100%)',
                                backgroundSize: '18px 18px',
                            }}
                        >
                            <div
                                className="absolute inset-3 rounded-md border border-white/60"
                                style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.5)',
                                    backdropFilter: String(token.value),
                                    WebkitBackdropFilter: String(token.value),
                                }}
                            />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-semibold text-sm text-gray-900 truncate" title={token.name}>
                                {token.name.split('.').pop()}
                            </span>
                            <span className="text-xs text-gray-500 mb-1 truncate" title={token.name}>
                                {token.name}
                            </span>
                            <CopyValue value={formatTokenValue(token.value)} />
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

    return (
        <pre className="p-4 bg-gray-100 rounded-lg overflow-auto">
            {JSON.stringify(tokens, null, 2)}
        </pre>
    );
};
