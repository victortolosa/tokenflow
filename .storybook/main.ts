import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs"
  ],
  "framework": "@storybook/nextjs-vite",
  "staticDirs": [
    "../public"
  ],
  async viteFinal(config) {
    const existingHeaders = config.server?.headers ?? {};
    const nextOrigin =
      process.env.NEXT_PUBLIC_APP_ORIGIN ??
      process.env.NEXT_PUBLIC_STORYBOOK_EMBED_ORIGIN ??
      'http://localhost:3000';
    const allowedHost =
      process.env.NEXT_PUBLIC_STORYBOOK_ALLOWED_HOST ??
      process.env.STORYBOOK_ALLOWED_HOST ??
      'localhost';

    config.server = {
      ...config.server,
      allowedHosts: allowedHost === 'all' ? 'all' : [allowedHost],
      headers: {
        ...existingHeaders,
        'Access-Control-Allow-Origin': '*',
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': `frame-ancestors 'self' ${nextOrigin}`
      }
    };

    return config;
  }
};
export default config;
