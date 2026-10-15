import type { NextConfig } from "next";

// The admin dashboard is a client-rendered app behind a localStorage session, talking to the
// Spring Boot API directly, so Cache Components / partial prefetching are left off.
const nextConfig: NextConfig = {
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
