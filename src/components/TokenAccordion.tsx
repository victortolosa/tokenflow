'use client';

import { useMemo } from 'react';
import { useTokenStore } from '@/store/useTokenStore';

const isHexColor = (value: string) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value);

const formatShadow = (shadow: any): string => {
  if (!shadow) return '';
  if (Array.isArray(shadow)) {
    return shadow.map(formatShadow).filter(Boolean).join(', ');
  }
  if (typeof shadow === 'string') return shadow;
  if (typeof shadow === 'object') {
    const { x = '0px', y = '0px', blur = '0px', spread = '0px', color = 'rgba(0, 0, 0, 0)' } = shadow;
    return `${x} ${y} ${blur} ${spread} ${color}`;
  }
  return String(shadow);
};

const toDisplayValue = (token: any): string => {
  if (!token) return '';
  const rawValue = (typeof token === 'object' && token !== null && 'value' in token) ? token.value : token;
  const tokenType = (typeof token === 'object' && token !== null && 'type' in token) ? token.type : null;

  if (tokenType === 'boxShadow') {
    return formatShadow(rawValue);
  }
  if (Array.isArray(rawValue)) {
    return rawValue.map((entry) => (typeof entry === 'object' ? formatShadow(entry) : String(entry))).join(', ');
  }
  if (typeof rawValue === 'object' && rawValue !== null) {
    return JSON.stringify(rawValue);
  }
  return String(rawValue);
};

const isLeaf = (node: any) => typeof node === 'object' && node !== null && 'value' in node;

function TokenValueRow({ name, token }: { name: string; token: any }) {
  const { updateToken } = useTokenStore();
  const label = name.split('.').pop() ?? name;
  const rawValue = token?.value;
  const displayValue = toDisplayValue(token);
  const isEditable = typeof rawValue === 'string' || typeof rawValue === 'number';
  const showColor = token?.type === 'color' && typeof rawValue === 'string' && isHexColor(rawValue);

  return (
    <div className="flex items-start justify-between gap-3 p-2 border-b border-gray-100 last:border-0">
      <div className="w-1/2 min-w-0">
        <div className="text-xs text-gray-700 font-mono truncate" title={name}>{label}</div>
        {token?.type && (
          <div className="text-[10px] text-gray-400 uppercase tracking-wide">{token.type}</div>
        )}
      </div>
      <div className="w-1/2 flex items-center gap-2 justify-end">
        {isEditable ? (
          <input
            type="text"
            value={displayValue}
            onChange={(e) => updateToken(name, e.target.value)}
            className="w-full text-xs p-1 border rounded bg-gray-50 text-gray-900 border-gray-200 focus:border-blue-500 focus:outline-none font-mono"
          />
        ) : (
          <div className="w-full text-[10px] font-mono text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-1 break-all">
            {displayValue}
          </div>
        )}
        {showColor && (
          <input
            type="color"
            value={rawValue}
            onChange={(e) => updateToken(name, e.target.value)}
            className="h-7 w-7 p-0 border-0 rounded cursor-pointer"
            aria-label={`${label} color`}
          />
        )}
      </div>
    </div>
  );
}

function TokenTree({ tokens, path }: { tokens: any; path: string }) {
  if (!tokens || typeof tokens !== 'object') return null;

  if (isLeaf(tokens)) {
    return <TokenValueRow name={path} token={tokens} />;
  }

  return (
    <div className="pl-3 border-l border-gray-100 space-y-1">
      {Object.entries(tokens).map(([key, child]) => {
        const nextPath = `${path}.${key}`;
        if (isLeaf(child)) {
          return <TokenValueRow key={nextPath} name={nextPath} token={child} />;
        }
        return (
          <div key={nextPath} className="pt-2">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{key}</div>
            <TokenTree tokens={child} path={nextPath} />
          </div>
        );
      })}
    </div>
  );
}

export function TokenAccordion() {
  const { resolvedTokens, isLoadingTokens } = useTokenStore();
  const entries = useMemo(() => Object.entries(resolvedTokens ?? {}), [resolvedTokens]);

  if (isLoadingTokens && entries.length === 0) {
    return (
      <div className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg p-4 text-center">
        Loading tokens...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg p-4 text-center">
        No tokens loaded. Import tokens to explore.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map(([groupName, groupTokens]) => (
        <details key={groupName} className="group border border-gray-200 rounded-lg bg-white">
          <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 rounded-lg flex items-center justify-between">
            <span>{groupName}</span>
            <span className="text-[10px] text-gray-400 group-open:hidden">Expand</span>
            <span className="text-[10px] text-gray-400 hidden group-open:inline">Collapse</span>
          </summary>
          <div className="p-3">
            <TokenTree tokens={groupTokens} path={groupName} />
          </div>
        </details>
      ))}
    </div>
  );
}
