/**
 * Admin screens whose endpoints the SabayRide API (Prod and Staging) does not have yet.
 * Until a screen is listed as ready it shows "Coming soon" for every sign-in, demo included,
 * so the dashboard only ever shows real data.
 *
 * When the backend ships one, add its key to NEXT_PUBLIC_API_READY (comma-separated,
 * e.g. "bookings,users") in Vercel and redeploy, or set it to true below.
 */
export type PendingFeature = "bookings" | "motorbikes" | "users" | "reports" | "audit" | "blog";

/** Endpoints each screen needs (shown on its Coming soon page and in api-doc.md §10). */
export const FEATURE_ENDPOINTS: Record<PendingFeature, string[]> = {
  bookings: ["GET /api/v1/admin/bookings", "GET /api/v1/admin/bookings/{id}"],
  motorbikes: ["GET /api/v1/admin/motorbikes"],
  users: ["GET /api/v1/admin/users", "POST /api/v1/admin/users/{id}/suspend", "POST /api/v1/admin/users/{id}/reactivate"],
  reports: ["GET /api/v1/admin/reports?period=DAILY|WEEKLY|MONTHLY"],
  audit: ["GET /api/v1/admin/audit-logs"],
  blog: ["GET/POST /api/v1/admin/blog/posts", "PATCH/DELETE /api/v1/admin/blog/posts/{id}", "POST /api/v1/admin/blog/posts/{id}/publish · /unpublish"],
};

const READY: Record<PendingFeature, boolean> = {
  bookings: true,
  motorbikes: true,
  users: true,
  reports: false,
  audit: false,
  blog: true,
};

const fromEnv = new Set(
  (process.env.NEXT_PUBLIC_API_READY ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

export const isApiReady = (feature: PendingFeature) => READY[feature] || fromEnv.has(feature);
