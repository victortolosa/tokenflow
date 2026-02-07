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

        // Helper to flatten object to CSS vars
        const flattenTokens = (obj: any, prefix = ''): Record<string, string> => {
            let result: Record<string, string> = {};
            for (const key in obj) {
                const value = obj[key];
                const newKey = prefix ? `${prefix}-${key}` : key;

                if (typeof value === 'object' && value !== null) {
                    // Check if it's a value object (Style Dictionary sometimes leaves metadata)
                    if ('value' in value) {
                        result[newKey] = value.value;
                    } else {
                        Object.assign(result, flattenTokens(value, newKey));
                    }
                } else {
                    result[newKey] = String(value);
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
