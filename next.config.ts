import type { NextConfig } from "next";

const storybookUrl = process.env.STORYBOOK_URL ?? "http://localhost:6006";

const storybookProxyPaths = [
  "/storybook/:path*",
  "/iframe.html",
  "/vite-app.js",
  "/vite-inject-mocker-entry.js",
  "/@vite/:path*",
  "/@id/:path*",
  "/@fs/:path*",
  "/node_modules/:path*",
  "/.storybook/:path*",
  "/src/:path*",
  "/@storybook/:path*",
  "/sb-preview/:path*",
  "/sb-manager/:path*",
  "/assets/:path*",
];

const nextConfig: NextConfig = {
  async rewrites() {
    return storybookProxyPaths.map((source) => {
      const destination = source.startsWith("/storybook/")
        ? `${storybookUrl}/:path*`
        : `${storybookUrl}${source}`;

      return { source, destination };
    });
  },
};

export default nextConfig;
