
import type { Preview, ReactRenderer, Decorator } from '@storybook/react';
import React, { useEffect, useState } from 'react';
import { fetchTokens, flattenTokens, deepMerge } from '../src/utils/token-utils';

const TokenReceiver: Decorator = (Story, context) => {
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [loading, setLoading] = useState(true);

  // Get selected theme from globals (default to 'primary')
  const theme = context.globals.theme || 'primary';

  useEffect(() => {
    async function loadTokens() {
      setLoading(true);
      try {
        // 1. Fetch all layers
        const globalTokens = await fetchTokens('/sample-json/tokens/Snap%20Motif/Global.json');
        const primaryTokens = await fetchTokens('/sample-json/tokens/Snap%20Motif/Primary.json');

        // 2. Base construction: Merge Global and Primary (Primary is the base mode)
        // Use deepMerge to ensure we don't lose groups (like Root) during construction
        let allTokens = deepMerge(globalTokens, primaryTokens);

        // 3. If a specific theme override exists, merge it ON TOP
        if (theme !== 'primary') {
          const filename = theme.charAt(0).toUpperCase() + theme.slice(1);
          const themeTokens = await fetchTokens(`/sample-json/tokens/Snap%20Motif/${filename}.json`);
          allTokens = deepMerge(allTokens, themeTokens);
        }

        // DEBUG: Check if key groups exist after merge
        console.log('[DEBUG] allTokens top-level keys:', Object.keys(allTokens));
        console.log('[DEBUG] Neutral exists?', !!allTokens.Neutral);
        console.log('[DEBUG] Palette exists?', !!allTokens.Palette);
        if (allTokens.Neutral) {
          console.log('[DEBUG] Neutral keys (first 5):', Object.keys(allTokens.Neutral).slice(0, 5));
        }

        // 4. Flatten and apply to :root (document.documentElement)
        const flatTokens = flattenTokens(allTokens, allTokens);

        flatTokens.forEach((t) => {
          const parts = t.name.split('.');
          const varName = parts[parts.length - 1];
          if (varName.startsWith('--')) {
            // Debug specific tokens
            if (varName === '--button-primary-bg-color') {
              console.log('[DEBUG] --button-primary-bg-color:', {
                originalValue: t.originalValue,
                resolvedValue: t.value,
                type: typeof t.value
              });
            }
            document.documentElement.style.setProperty(varName, String(t.value));
          }
        });

        // Log for debugging (invisible to user unless they open console)
        console.log(`[TokenReceiver] Theme "${theme}" loaded. ${flatTokens.length} tokens applied to :root`);

        // Signal loading complete
        setStyle({ loaded: true } as any);
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

  // Ensure background color is applied to the wrapper using the resolved token variable
  const wrapperStyle: React.CSSProperties = {
    ...style,
    backgroundColor: 'var(--bg-color)',
    color: 'var(--fg-color, #000)', // Added fallback for safety
    minHeight: '100vh',
    padding: '1rem',
    transition: 'background-color 0.2s ease, color 0.2s ease',
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