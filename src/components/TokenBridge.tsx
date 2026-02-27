'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useTokenStore } from '@/store/useTokenStore';
import { toCssValue } from '@/utils/token-format';

export function TokenBridge() {
    const { resolvedTokens } = useTokenStore();
    const latestPayloadRef = useRef<Record<string, string>>({});
    const observedFramesRef = useRef<WeakSet<HTMLIFrameElement>>(new WeakSet());

    const flattenTokens = useCallback(
        (obj: Record<string, unknown>, path: string[] = []): Record<string, string> => {
            const result: Record<string, string> = {};
            for (const key in obj) {
                const value = obj[key];
                const nextPath = [...path, key];

                if (typeof value === 'object' && value !== null) {
                    if ('value' in value) {
                        const tokenValue = toCssValue(value);
                        const fullPath = nextPath.join('.').replace(/\./g, '-');
                        const fullName = fullPath.startsWith('--') ? fullPath.slice(2) : fullPath;
                        const shortName = key.startsWith('--') ? key.slice(2) : key;
                        result[fullName] = tokenValue;
                        result[shortName] = tokenValue;
                    } else {
                        Object.assign(result, flattenTokens(value as Record<string, unknown>, nextPath));
                    }
                } else {
                    const tokenValue = toCssValue(value);
                    const fullPath = nextPath.join('.').replace(/\./g, '-');
                    const fullName = fullPath.startsWith('--') ? fullPath.slice(2) : fullPath;
                    const shortName = key.startsWith('--') ? key.slice(2) : key;
                    result[fullName] = tokenValue;
                    result[shortName] = tokenValue;
                }
            }
            return result;
        },
        []
    );

    const getStorybookOrigin = useCallback(() => {
        const raw = process.env.NEXT_PUBLIC_STORYBOOK_URL ?? '/';
        try {
            return new URL(raw, window.location.origin).origin;
        } catch {
            return window.location.origin;
        }
    }, []);

    const getPreviewIframes = useCallback(() => {
        const frames = Array.from(
            document.querySelectorAll<HTMLIFrameElement>('iframe[id^="storybook-preview-"], #storybook-preview')
        );
        return frames;
    }, []);

    const postTokensToWindow = useCallback((target: Window, payload: Record<string, string>) => {
        const origin = getStorybookOrigin();
        target.postMessage({
            type: 'UPDATE_TOKENS_BATCH',
            payload,
        }, origin);
    }, [getStorybookOrigin]);

    const postTokens = useCallback((payload: Record<string, string>) => {
        const iframes = getPreviewIframes();
        if (iframes.length === 0) return;
        iframes.forEach((iframe) => {
            if (!iframe.contentWindow) return;
            postTokensToWindow(iframe.contentWindow, payload);
        });
    }, [getPreviewIframes, postTokensToWindow]);

    useEffect(() => {
        const flat = flattenTokens(resolvedTokens);
        latestPayloadRef.current = flat;
        postTokens(flat);
    }, [resolvedTokens, flattenTokens, postTokens]);

    useEffect(() => {
        const handleLoad = () => {
            postTokens(latestPayloadRef.current);
        };

        const attachListeners = () => {
            const iframes = getPreviewIframes();
            iframes.forEach((iframe) => {
                if (observedFramesRef.current.has(iframe)) return;
                observedFramesRef.current.add(iframe);
                iframe.addEventListener('load', handleLoad);
            });
            if (iframes.length > 0) {
                postTokens(latestPayloadRef.current);
            }
        };

        attachListeners();

        const observer = new MutationObserver(() => {
            attachListeners();
        });

        observer.observe(document.body, { childList: true, subtree: true });

        return () => {
            observer.disconnect();
            const iframes = getPreviewIframes();
            iframes.forEach((iframe) => {
                if (observedFramesRef.current.has(iframe)) {
                    iframe.removeEventListener('load', handleLoad);
                }
            });
            observedFramesRef.current = new WeakSet();
        };
    }, [getPreviewIframes, postTokens]);

    useEffect(() => {
        const handleRequest = (event: MessageEvent) => {
            const storybookOrigin = getStorybookOrigin();
            if (event.origin !== storybookOrigin) return;
            if (event.data?.type !== 'REQUEST_TOKENS') return;
            if (!event.source) return;
            try {
                postTokensToWindow(event.source as Window, latestPayloadRef.current);
            } catch {
                // Ignore post failures if the source is unavailable.
            }
        };

        window.addEventListener('message', handleRequest);
        return () => window.removeEventListener('message', handleRequest);
    }, [getStorybookOrigin, postTokensToWindow]);

    useEffect(() => {
        const handleUsageReport = (event: MessageEvent) => {
            const storybookOrigin = getStorybookOrigin();
            if (event.origin !== storybookOrigin) return;
            if (event.data?.type !== 'TOKEN_USAGE_REPORT') return;
            const { storyId, usedTokens } = event.data as { storyId: string; usedTokens: string[] };
            if (typeof storyId === 'string' && Array.isArray(usedTokens)) {
                useTokenStore.getState().setComponentTokenUsage(storyId, usedTokens);
            }
        };

        window.addEventListener('message', handleUsageReport);
        return () => window.removeEventListener('message', handleUsageReport);
    }, [getStorybookOrigin]);

    return null; // Headless component
}
