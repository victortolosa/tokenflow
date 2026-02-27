'use client';

import { useTokenStore } from '@/store/useTokenStore';
import { ColorControl } from './controls/ColorControl';
import { SpacingControl } from './controls/SpacingControl';
import { TypographyControl } from './controls/TypographyControl';
import { guessTokenType, isTokenLeaf } from '@/utils/token-format';
import clsx from 'clsx';
import { useState } from 'react';

export function TokenManager() {
    const { resolvedTokens, updateToken } = useTokenStore();
    const [activeTab, setActiveTab] = useState<'all' | 'color' | 'spacing' | 'typography'>('all');

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h2 className="font-semibold text-gray-800">Token Tuner</h2>
                <div className="flex gap-2">
                    <button onClick={() => setActiveTab('all')} className={clsx("text-xs px-2 py-1 rounded", activeTab === 'all' ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-200")}>All</button>
                    <button onClick={() => setActiveTab('color')} className={clsx("text-xs px-2 py-1 rounded", activeTab === 'color' ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-200")}>Color</button>
                    <button onClick={() => setActiveTab('spacing')} className={clsx("text-xs px-2 py-1 rounded", activeTab === 'spacing' ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-200")}>Spacing</button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {Object.keys(resolvedTokens).length === 0 ? (
                    <div className="text-center text-gray-400 py-10 text-sm">
                        No tokens loaded. Upload JSON to begin.
                    </div>
                ) : (
                    <RecursiveList tokens={resolvedTokens} activeTab={activeTab} updateToken={updateToken} />
                )}
            </div>
        </div>
    );
}

function RecursiveList({ tokens, path = '', activeTab, updateToken }: {
    tokens: Record<string, unknown>;
    path?: string;
    activeTab: string;
    updateToken: (path: string, value: unknown) => void;
}) {
    if (!tokens || typeof tokens !== 'object') return null;

    if (isTokenLeaf(tokens)) {
        const value = tokens.value;
        const type = tokens.type || guessTokenType(path, value);

        if (activeTab !== 'all' && type !== activeTab) return null;

        return <ControlDispatcher type={type} name={path} value={value} onChange={(val: unknown) => updateToken(path, val)} />;
    }

    return (
        <div className="pl-2 border-l border-gray-100 ml-1">
            {Object.entries(tokens).map(([key, child]) => (
                <div key={key}>
                    {!isTokenLeaf(child) && <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-2 mb-1">{key}</div>}
                    <RecursiveList tokens={child as Record<string, unknown>} path={path ? `${path}.${key}` : key} activeTab={activeTab} updateToken={updateToken} />
                </div>
            ))}
        </div>
    );
}

function ControlDispatcher({ type, name, value, onChange }: {
    type: string;
    name: string;
    value: unknown;
    onChange: (value: unknown) => void;
}) {
    switch (type) {
        case 'color':
            return <ColorControl name={name} value={String(value)} onChange={onChange} />;
        case 'spacing':
        case 'dimension':
            return <SpacingControl name={name} value={String(value)} onChange={onChange} />;
        case 'typography':
            return <TypographyControl name={name} value={value} onChange={onChange} />;
        default:
            return (
                <div className="flex items-center justify-between gap-4 p-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors rounded">
                    <label className="text-sm text-gray-600 font-mono truncate w-1/2 cursor-help" title={name}>{name.split('.').pop()}</label>
                    <input
                        className="border rounded text-xs p-1 w-1/2 bg-white text-gray-800 focus:border-blue-500 focus:outline-none"
                        value={String(value)}
                        onChange={(e) => onChange(e.target.value)}
                    />
                </div>
            );
    }
}
