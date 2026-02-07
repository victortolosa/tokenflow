'use client';

import { useTokenStore } from '@/store/useTokenStore';
import { ColorControl } from './controls/ColorControl';
import { SpacingControl } from './controls/SpacingControl';
import { TypographyControl } from './controls/TypographyControl';
import clsx from 'clsx';
import { useState } from 'react';

export function TokenManager() {
    const { resolvedTokens, updateToken } = useTokenStore();
    const [activeTab, setActiveTab] = useState<'all' | 'color' | 'spacing' | 'typography'>('all');

    // Helper to recursively traverse tokens and render controls
    // This is tricky because SD output structure varies.
    // We need to identify "leaf" tokens which have a 'value' and 'type' (optional).

    const renderControls = (tokens: any, path = ''): React.ReactNode => {
        if (!tokens || typeof tokens !== 'object') return null;

        // Check if it's a token leaf (has 'value')
        if ('value' in tokens) {
            const type = tokens.type || guessType(path, tokens.value);
            const name = path;
            const value = tokens.value;

            return (
                <div key={path}>
                    {renderControl(type, name, value)}
                </div>
            );
        }

        // Otherwise, iterate children
        return Object.entries(tokens).map(([key, child]) => {
            const newPath = path ? `${path}.${key}` : key;
            // Check if child is a leaf or node
            // To avoid rendering too many headers, we can just recurse
            return renderControls(child, newPath);
        });
    };

    const guessType = (name: string, value: any) => {
        if (typeof value === 'object') return 'typography'; // heuristic
        if (name.includes('color') || String(value).startsWith('#') || String(value).startsWith('rgb')) return 'color';
        if (name.includes('spacing') || name.includes('size') || String(value).endsWith('px') || String(value).endsWith('rem')) return 'spacing';
        return 'other';
    };

    const renderControl = (type: string, name: string, value: any) => {
        const handleChange = (val: any) => updateToken(name, val);

        switch (type) {
            case 'color':
                return <ColorControl name={name} value={value} onChange={handleChange} />;
            case 'spacing':
            case 'dimension':
                return <SpacingControl name={name} value={value} onChange={handleChange} />;
            case 'typography':
                return <TypographyControl name={name} value={value} onChange={handleChange} />;
            default:
                // Fallback text input
                return (
                    <div className="flex items-center justify-between gap-4 p-2 border-b border-gray-100 last:border-0">
                        <label className="text-sm text-gray-700 font-mono truncate w-1/2" title={name}>{name}</label>
                        <input
                            className="border rounded text-xs p-1 w-1/2 bg-gray-50"
                            value={String(value)}
                            onChange={(e) => handleChange(e.target.value)}
                        />
                    </div>
                );
        }
    };

    // Filter logic could be applied here by checking path against activeTab

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h2 className="font-semibold text-gray-800">Token Tuner</h2>
                <div className="flex gap-2">
                    {/* Simple filters */}
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

// Extracting recursive component for cleaner state handling if needed, 
// or just use the function above. Let's make it a proper component to handle recursion cleanly.

function RecursiveList({ tokens, path = '', activeTab, updateToken }: any) {
    if (!tokens || typeof tokens !== 'object') return null;

    // Leaf check
    if ('value' in tokens) {
        const value = tokens.value;
        const type = tokens.type || guessType(path, value);

        if (activeTab !== 'all' && type !== activeTab) return null; // Simple filter

        return <ControlDispatcher type={type} name={path} value={value} onChange={(val: any) => updateToken(path, val)} />;
    }

    return (
        <div className="pl-2 border-l border-gray-100 ml-1">
            {Object.entries(tokens).map(([key, child]) => (
                <div key={key}>
                    {/* Only show header if node has children that are leaves or groups, 
                 but we don't want to clutter. 
                 Let's show the key as a section header if it's not a leaf. */}
                    {!isLeaf(child) && <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-2 mb-1">{key}</div>}
                    <RecursiveList tokens={child} path={path ? `${path}.${key}` : key} activeTab={activeTab} updateToken={updateToken} />
                </div>
            ))}
        </div>
    );
}

function isLeaf(node: any) {
    return typeof node === 'object' && node !== null && 'value' in node;
}

function ControlDispatcher({ type, name, value, onChange }: any) {
    switch (type) {
        case 'color':
            return <ColorControl name={name} value={value} onChange={onChange} />;
        case 'spacing':
        case 'dimension':
            return <SpacingControl name={name} value={value} onChange={onChange} />;
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

function guessType(name: string, value: any) {
    if (typeof value === 'object') return 'typography';
    if (name.includes('color') || String(value).startsWith('#') || String(value).startsWith('rgb')) return 'color';
    if (name.includes('spacing') || name.includes('size') || String(value).endsWith('px') || String(value).endsWith('rem') || !isNaN(Number(value))) return 'spacing';
    return 'other';
}
