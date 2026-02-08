'use client';

import { useEffect } from 'react';
import { useTokenStore } from '@/store/useTokenStore';

export function TokenBridge() {
    const { resolvedTokens } = useTokenStore();

    useEffect(() => {
        // Flatten tokens for sending
        // We need to traverse the resolvedTokens object and send basic key-value pairs
        // or send the whole object and let the receiver handle it. 
        // The current receiver expects { type: 'UPDATE_TOKEN', payload: { name, value } }
        // A more efficient way is to send a batch update.

        // For now, let's iterate and send individual updates to keep it simple with the current plan.
        // In a real app we'd want to batch this.

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

        const toCssValue = (token: any): string => {
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

        // Helper to flatten object to CSS vars
        const flattenTokens = (obj: any, prefix = ''): Record<string, string> => {
            let result: Record<string, string> = {};
            for (const key in obj) {
                const value = obj[key];
                const strippedKey = key.startsWith('--') ? key.slice(2) : key;
                const newKey = key.startsWith('--')
                    ? strippedKey
                    : (prefix ? `${prefix}-${strippedKey}` : strippedKey);

                if (typeof value === 'object' && value !== null) {
                    // Check if it's a value object (Style Dictionary sometimes leaves metadata)
                    if ('value' in value) {
                        result[newKey] = toCssValue(value);
                    } else {
                        Object.assign(result, flattenTokens(value, newKey));
                    }
                } else {
                    result[newKey] = toCssValue(value);
                }
            }
            return result;
        };

        const flat = flattenTokens(resolvedTokens);
        const iframe = document.querySelector<HTMLIFrameElement>('#storybook-preview');

        if (iframe && iframe.contentWindow) {
            Object.entries(flat).forEach(([name, value]) => {
                iframe.contentWindow?.postMessage({
                    type: 'UPDATE_TOKEN',
                    payload: { name, value }
                }, '*');
            });
        }

    }, [resolvedTokens]);

    return null; // Headless component
}
