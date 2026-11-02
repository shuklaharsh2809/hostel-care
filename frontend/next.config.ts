import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every screen in this app is tenant-specific and read from the session cookie,
  // so we use request-time rendering instead of Cache Components.
  cacheComponents: false,
  // Keep the dev badge away from the sidebar's "Log out" button (bottom-left).
  devIndicators: { position: "bottom-right" },
  turbopack: {
    // This app lives in frontend/ inside a repo that also has a root package.json.
    root: path.resolve(import.meta.dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
