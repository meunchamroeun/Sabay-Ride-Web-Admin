/**
 * Runtime configuration. The backend base URL lives here and only here —
 * switch between staging and production with NEXT_PUBLIC_API_BASE_URL.
 */
export const API_ENVIRONMENTS = {
  staging: "https://sabayride-staging.cavkim.tech",
  production: "https://sabayride.cavkim.tech",
} as const;

export type ApiEnv = keyof typeof API_ENVIRONMENTS;

const envName = (process.env.NEXT_PUBLIC_API_ENV ?? "staging") as ApiEnv;

export const config = {
  apiBaseUrl: (
    process.env.NEXT_PUBLIC_API_BASE_URL ?? API_ENVIRONMENTS[envName] ?? API_ENVIRONMENTS.staging
  ).replace(/\/+$/, ""),
  apiEnv: envName,
  apiPrefix: "/api/v1",
  /**
   * Browser requests go to this same-origin path and next.config.ts rewrites them to apiBaseUrl.
   * That keeps working on any domain (Vercel previews, custom domains) without the backend
   * having to whitelist each origin for CORS.
   */
  proxyPath: "/backend",
  /** Refresh this many seconds before the access token expires (tokens live 15 min). */
  refreshSkewSeconds: 60,
  defaultLocale: "km" as const,
  locales: ["km", "en"] as const,
  /** Display-only USD → KHR conversion (NFR-23). Rate source is still [TBD] in the SRS. */
  khrPerUsd: 4100,
};

export type Locale = (typeof config.locales)[number];

export const swaggerUrl = `${config.apiBaseUrl}/swagger-ui.html`;
