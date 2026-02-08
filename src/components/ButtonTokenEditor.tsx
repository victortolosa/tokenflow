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
  if (token.type === 'boxShadow') {
    return formatShadow(token.value);
  }
  if (typeof token.value === 'string') return token.value;
  if (token.value === null || token.value === undefined) return '';
  if (typeof token.value === 'object') return JSON.stringify(token.value);
  return String(token.value);
};

const formatLabel = (tokenKey: string) => tokenKey.replace(/^--button-/, '').replace(/^--/, '');

export function ButtonTokenEditor() {
  const { resolvedTokens, updateToken, isLoadingTokens } = useTokenStore();

  const { groupKey, entries } = useMemo(() => {
    const groupKey = resolvedTokens?.Button ? 'Button' : resolvedTokens?.button ? 'button' : null;
    const group = groupKey ? resolvedTokens[groupKey] : null;
    const entries = group && typeof group === 'object'
      ? Object.entries(group).filter(([, token]) => token && typeof token === 'object' && 'value' in token)
      : [];
    return { groupKey, entries };
  }, [resolvedTokens]);

  if (!groupKey && isLoadingTokens) {
    return (
      <div className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg p-4 text-center">
        Loading default tokens...
      </div>
    );
  }

  if (!groupKey) {
    return (
      <div className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg p-4 text-center">
        Import tokens to edit button styles.
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg p-4 text-center">
        No button tokens found in the current set.
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {entries.map(([key, token]) => {
        const value = toDisplayValue(token);
        const showColor = token.type === 'color' && isHexColor(value);
        const label = formatLabel(key);

        const handleChange = (nextValue: string) => {
          updateToken(`${groupKey}.${key}`, nextValue);
        };

        return (
          <div key={key} className="flex items-center justify-between gap-3 p-2 border-b border-gray-100 last:border-0">
            <label
              className="text-xs text-gray-600 font-mono truncate w-1/2"
              title={key}
            >
              {label}
            </label>
            <div className="flex items-center gap-2 w-1/2 justify-end">
              <input
                type="text"
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                className="w-full text-xs p-1 border rounded bg-gray-50 text-gray-900 border-gray-200 focus:border-blue-500 focus:outline-none"
              />
              {showColor && (
                <input
                  type="color"
                  value={value}
                  onChange={(e) => handleChange(e.target.value)}
                  className="h-7 w-7 p-0 border-0 rounded cursor-pointer"
                  aria-label={`${label} color`}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
