
import type { Preview, Decorator } from '@storybook/react';
import React, { useEffect, useState } from 'react';
import { fetchTokens, flattenTokens, deepMerge } from '../src/utils/token-utils';
import '../src/app/fonts.css';

const TokenReceiver: Decorator = (Story, context) => {
  const [, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  const mode = context.globals.mode || 'primary';

  useEffect(() => {
    async function loadTokens() {
      setLoading(true);
      try {
        // 1. Fetch base layers
        const globalTokens = await fetchTokens('/tokens/Snap%20Motif/Global.json');
        const primaryTokens = await fetchTokens('/tokens/Snap%20Motif/Primary.json');

        // 2. Merge Global + Primary (base mode)
        let allTokens = deepMerge(globalTokens, primaryTokens);

        // 3. If a mode override exists, merge it on top
        if (mode !== 'primary') {
          const filename = mode.charAt(0).toUpperCase() + mode.slice(1);
          const modeTokens = await fetchTokens(`/tokens/Snap%20Motif/${filename}.json`);
          allTokens = deepMerge(allTokens, modeTokens);
        }

        // 4. Flatten and apply to :root
        const flatTokens = flattenTokens(allTokens, allTokens);

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

        const toCssValue = (token: { value: any; type: string }) => {
          if (token.type === 'boxShadow') {
            return formatShadow(token.value);
          }
          return token.value;
        };

        flatTokens.forEach((t) => {
          // Use the full name but replace dots with dashes for CSS variable compatibility
          // e.g. "Root.bg-color" becomes "--Root-bg-color"
          // If the name already starts with "--", we'll just use it directly after cleaning dots
          const cleanName = t.name.replace(/\./g, '-');
          const varName = cleanName.startsWith('--') ? cleanName : `--${cleanName}`;

          const cssValue = toCssValue(t);
          document.documentElement.style.setProperty(varName, String(cssValue));

          // Also keep the legacy behavior for now to avoid breaking existing styles 
          // that might expect the short name
          const parts = t.name.split('.');
          const shortVarName = parts[parts.length - 1];
          if (shortVarName.startsWith('--')) {
            document.documentElement.style.setProperty(shortVarName, String(cssValue));
          }
        });

        console.log(`[TokenReceiver] Mode "${mode}" loaded. ${flatTokens.length} tokens applied.`);
        setLoaded(true);
      } catch (e) {
        console.error("Failed to load tokens", e);
      } finally {
        setLoading(false);
      }
    }

    loadTokens();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'UPDATE_TOKEN') {
        const { name, value } = event.data.payload;
        document.documentElement.style.setProperty(`--${name}`, value);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);

  }, [mode]);

  if (loading) {
    return <div style={{ minHeight: '100vh', padding: '1rem', opacity: 0.5 }}><Story /></div>;
  }

  const wrapperStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-color)',
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

const preview: Preview = {
  decorators: [TokenReceiver],
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
