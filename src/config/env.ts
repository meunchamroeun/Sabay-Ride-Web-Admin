/**
 * Runtime configuration. Backend base URLs live here and only here.
 *
 * NEXT_PUBLIC_API_ENV picks the default backend; NEXT_PUBLIC_API_BASE_URL overrides that
 * default's URL. Admins can switch between staging and production on the login screen —
 * the browser always calls /backend/<env>/… and next.config.ts proxies it to the right host.
 */
type ApiEnvName = "staging" | "production";

const defaultEnv: ApiEnvName = process.env.NEXT_PUBLIC_API_ENV === "production" ? "production" : "staging";
const override = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");

export const API_ENVIRONMENTS: Record<ApiEnvName, string> = {
  staging: "https://sabayride-staging.cavkim.tech",
  production: "https://sabayride.cavkim.tech",
  ...(override ? { [defaultEnv]: override } : {}),
};

export type ApiEnv = ApiEnvName;
export const API_ENV_NAMES = Object.keys(API_ENVIRONMENTS) as ApiEnv[];

export const config = {
  defaultApiEnv: defaultEnv,
  apiPrefix: "/api/v1",
  /** Same-origin proxy root; avoids CORS on any domain the dashboard is served from. */
  proxyPath: "/backend",
  /** Refresh this many seconds before the access token expires (tokens live 15 min). */
  refreshSkewSeconds: 60,
  defaultLocale: "km" as const,
  locales: ["km", "en"] as const,
  /** Display-only USD → KHR conversion (NFR-23). Rate source is still [TBD] in the SRS. */
  khrPerUsd: 4100,
};

export type Locale = (typeof config.locales)[number];

export const swaggerUrlFor = (env: ApiEnv) => `${API_ENVIRONMENTS[env]}/swagger-ui.html`;
export const hostOf = (env: ApiEnv) => API_ENVIRONMENTS[env].replace(/^https?:\/\//, "");
