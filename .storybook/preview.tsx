
import type { Preview, Decorator } from '@storybook/react';
import React, { useEffect, useState } from 'react';
import { fetchTokens, flattenTokens, deepMerge } from '../src/utils/token-utils';
import { formatShadow, sanitizeCssValue } from '../src/utils/token-format';
import '../src/app/globals.css';

const EXPECTED_PARENT_ORIGIN =
  process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'http://localhost:3000';

const MODE_CASCADE = ['primary', 'secondary', 'tertiary', 'quaternary'] as const;
const MODE_FILES: Record<(typeof MODE_CASCADE)[number], string> = {
  primary: 'Primary.json',
  secondary: 'Secondary.json',
  tertiary: 'Tertiary.json',
  quaternary: 'Quaternary.json',
};

function getCascadeModes(mode: string): Array<(typeof MODE_CASCADE)[number]> {
  const index = MODE_CASCADE.indexOf(mode as (typeof MODE_CASCADE)[number]);
  if (index === -1) return [MODE_CASCADE[0]];
  return MODE_CASCADE.slice(0, index + 1);
}

/** Module-level cache so mode switches don't re-fetch tokens unnecessarily. */
const tokenCache: Record<string, ReturnType<typeof flattenTokens>> = {};

const TokenReceiver: Decorator = (Story, context) => {
  const [, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  const mode = context.globals.mode || 'primary';

  useEffect(() => {
    const requestOverrides = () => {
      window.parent?.postMessage({ type: 'REQUEST_TOKENS' }, EXPECTED_PARENT_ORIGIN);
    };

    async function loadTokens() {
      // Return cached tokens if available
      if (tokenCache[mode]) {
        applyTokens(tokenCache[mode]);
        setLoaded(true);
        setLoading(false);
        requestOverrides();
        return;
      }

      setLoading(true);
      try {
        const globalTokens = await fetchTokens('/tokens/Snap%20Motif/Global.json');
        const cascadeModes = getCascadeModes(mode);

        let allTokens = globalTokens;
        for (const cascadeMode of cascadeModes) {
          const filename = MODE_FILES[cascadeMode];
          const modeTokens = await fetchTokens(`/tokens/Snap%20Motif/${filename}`);
          allTokens = deepMerge(allTokens, modeTokens);
        }

        const flat = flattenTokens(allTokens, allTokens);
        tokenCache[mode] = flat;
        applyTokens(flat);

        console.log(`[TokenReceiver] Mode "${mode}" loaded. ${flat.length} tokens applied.`);
        setLoaded(true);
        requestOverrides();
      } catch (e) {
        console.error("Failed to load tokens", e);
      } finally {
        setLoading(false);
        requestOverrides();
      }
    }

    loadTokens();

    const handleMessage = (event: MessageEvent) => {
      // Validate the sender origin
      if (event.origin !== EXPECTED_PARENT_ORIGIN) return;

      if (event.data?.type === 'UPDATE_TOKENS_BATCH') {
        const tokens: Record<string, string> = event.data.payload;
        for (const [name, value] of Object.entries(tokens)) {
          const safe = sanitizeCssValue(value);
          if (safe !== null) {
            document.documentElement.style.setProperty(`--${name}`, safe);
          }
        }
      }

      // Keep backwards-compat for single-token messages
      if (event.data?.type === 'UPDATE_TOKEN') {
        const { name, value } = event.data.payload;
        const safe = sanitizeCssValue(String(value));
        if (safe !== null) {
          document.documentElement.style.setProperty(`--${name}`, safe);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);

  }, [mode]);

  const previewBackground = 'var(--Root---bg-color, var(--bg-color, #fff))';

  if (loading) {
    return <div style={{ minHeight: '100vh', padding: '1rem', opacity: 0.5, backgroundColor: previewBackground }}><Story /></div>;
  }

  const wrapperStyle: React.CSSProperties = {
    backgroundColor: previewBackground,
    color: 'var(--fg-color, #000)',
    minHeight: context.viewMode === 'docs' ? 'auto' : '100vh',
    padding: context.viewMode === 'docs' ? '0' : '5rem',
    transition: 'background-color 0.2s ease, color 0.2s ease',
    boxSizing: 'border-box',
  };

  return (
    <div style={wrapperStyle}>
      <Story />
    </div>
  );
};

function applyTokens(flatTokens: Array<{ name: string; value: unknown; type: string }>) {
  const toCssValue = (token: { value: unknown; type: string }) => {
    if (token.type === 'boxShadow') {
      return formatShadow(token.value);
    }
    return token.value;
  };

  flatTokens.forEach((t) => {
    const cleanName = t.name.replace(/\./g, '-');
    const varName = cleanName.startsWith('--') ? cleanName : `--${cleanName}`;

    const raw = String(toCssValue(t));
    const cssValue = sanitizeCssValue(raw);
    if (cssValue === null) return;

    document.documentElement.style.setProperty(varName, cssValue);

    const parts = t.name.split('.');
    const shortVarName = parts[parts.length - 1];
    if (shortVarName.startsWith('--')) {
      document.documentElement.style.setProperty(shortVarName, cssValue);
    }
  });
}

const TokenUsageReporter: Decorator = (Story, context) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      const usedTokens = new Set<string>();
      const tokenVarRegex = /var\(--([^,)]+)/g;

      // Scan stylesheets
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules)) {
            const text = rule.cssText;
            let match;
            while ((match = tokenVarRegex.exec(text)) !== null) {
              usedTokens.add(match[1].trim());
            }
            tokenVarRegex.lastIndex = 0;
          }
        } catch {
          // cross-origin sheets throw SecurityError — skip
        }
      }

      // Scan inline styles
      document.querySelectorAll('[style]').forEach((el) => {
        const style = el.getAttribute('style') ?? '';
        let match;
        while ((match = tokenVarRegex.exec(style)) !== null) {
          usedTokens.add(match[1].trim());
        }
        tokenVarRegex.lastIndex = 0;
      });

      window.parent?.postMessage(
        { type: 'TOKEN_USAGE_REPORT', storyId: context.id, usedTokens: Array.from(usedTokens) },
        EXPECTED_PARENT_ORIGIN
      );
    }, 300);

    return () => clearTimeout(timer);
  }, [context.id]);

  return <Story />;
};

const preview: Preview = {
  decorators: [TokenReceiver, TokenUsageReporter],
  globalTypes: {
    mode: {
      description: 'Global Mode',
      defaultValue: 'primary',
      toolbar: {
        title: 'Mode',
        icon: 'paintbrush',
        items: ['primary', 'secondary', 'tertiary', 'quaternary'],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo'
    }
  },
};

export default preview;
