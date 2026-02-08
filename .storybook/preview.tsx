
import type { Preview, Decorator } from '@storybook/react';
import React, { useEffect, useState } from 'react';
import { fetchTokens, flattenTokens, deepMerge } from '../src/utils/token-utils';
import '../src/app/fonts.css';

const TokenReceiver: Decorator = (Story, context) => {
  const [, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  const theme = context.globals.theme || 'primary';

  useEffect(() => {
    async function loadTokens() {
      setLoading(true);
      try {
        // 1. Fetch base layers
        const globalTokens = await fetchTokens('/sample-json/tokens/Snap%20Motif/Global.json');
        const primaryTokens = await fetchTokens('/sample-json/tokens/Snap%20Motif/Primary.json');

        // 2. Merge Global + Primary (base mode)
        let allTokens = deepMerge(globalTokens, primaryTokens);

        // 3. If a theme override exists, merge it on top
        if (theme !== 'primary') {
          const filename = theme.charAt(0).toUpperCase() + theme.slice(1);
          const themeTokens = await fetchTokens(`/sample-json/tokens/Snap%20Motif/${filename}.json`);
          allTokens = deepMerge(allTokens, themeTokens);
        }

        // 4. Flatten and apply to :root
        const flatTokens = flattenTokens(allTokens, allTokens);

        flatTokens.forEach((t) => {
          const parts = t.name.split('.');
          const varName = parts[parts.length - 1];
          if (varName.startsWith('--')) {
            document.documentElement.style.setProperty(varName, String(t.value));
          }
        });

        console.log(`[TokenReceiver] Theme "${theme}" loaded. ${flatTokens.length} tokens applied.`);
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

  }, [theme]);

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
    theme: {
      description: 'Global Theme',
      defaultValue: 'primary',
      toolbar: {
        title: 'Theme',
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