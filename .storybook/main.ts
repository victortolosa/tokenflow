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
    const nextOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'http://localhost:3000';
    const nextImageDefine = {
      'process.env.__NEXT_IMAGE_OPTS': 'undefined'
    };

    config.server = {
      ...config.server,
      allowedHosts: [new URL(nextOrigin).hostname],
      headers: {
        ...existingHeaders,
        'Access-Control-Allow-Origin': nextOrigin,
        'X-Frame-Options': `ALLOW-FROM ${nextOrigin}`,
        'Content-Security-Policy': `frame-ancestors 'self' ${nextOrigin}`
      }
    };

    config.define = {
      ...config.define,
      ...nextImageDefine
    };

    config.optimizeDeps = {
      ...config.optimizeDeps,
      esbuildOptions: {
        ...config.optimizeDeps?.esbuildOptions,
        define: {
          ...config.optimizeDeps?.esbuildOptions?.define,
          ...nextImageDefine
        }
      }
    };

    return config;
  }
};
export default config;
