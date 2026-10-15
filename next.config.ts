import type { NextConfig } from "next";
import { config } from "./src/config/env";

// The admin dashboard is a client-rendered app behind a localStorage session, so Cache
// Components / partial prefetching are left off. API calls are proxied through /backend so the
// Spring Boot API does not need a CORS entry for every domain the dashboard is served from.
const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: `${config.proxyPath}/:path*`, destination: `${config.apiBaseUrl}/:path*` }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
