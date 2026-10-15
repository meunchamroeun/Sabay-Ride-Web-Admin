# Sabay-Ride-Web-Admin

Web dashboard for SabayRide administrators (SRS v1.3, section 14.4). Shop owners and customers use the Flutter app; this console is admin-only.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · shadcn/ui on Radix · TanStack Query · i18next (Khmer default, English) · GSAP · Framer Motion · Recharts

## Run

```bash
cp .env.example .env.local   # choose staging or production
npm install
npm run dev                  # http://localhost:3000
```

## Backend

| Env | Base URL | Payments |
| --- | --- | --- |
| Staging | `https://sabayride-staging.cavkim.tech` | No QR, settles instantly — test flows here |
| Production | `https://sabayride.cavkim.tech` | Real ABA KHQR, stays `PENDING` until paid |

Both URLs live in `src/config/env.ts`. `NEXT_PUBLIC_API_ENV` picks the default and `NEXT_PUBLIC_API_BASE_URL` can override that default's URL. Admins switch between Production and Staging by hovering the "Connected to" card on the login screen; the choice is remembered per browser and switching signs out, because tokens belong to one backend.

The browser never calls an API host directly: requests go to `/backend/<staging|production>/api/v1/...` on the dashboard's own origin and `next.config.ts` rewrites them to the matching host. That avoids CORS on any Vercel or custom domain.

## Deploy

Hosted on Vercel (project `sabay-ride-web-admin`, connected to this repo; pushes to `main` deploy to production). Set `NEXT_PUBLIC_API_ENV` (and optionally `NEXT_PUBLIC_API_BASE_URL`) in the Vercel project settings; they are read at build time, so redeploy after changing them.

## Auth

- `POST /api/v1/auth/login` with `{ identifier, password }`; only accounts with the `ADMIN` role get in.
- Access tokens last 15 minutes. `src/lib/api/client.ts` refreshes 60 s before expiry and retries once on `401`.
- `POST /auth/refresh` is **single use** and replaying a spent token revokes every session, so refreshes are de-duplicated inside a tab (shared promise) and across tabs (Web Locks plus a storage re-check).

## Screens → API

| Screen | Endpoints | SRS |
| --- | --- | --- |
| Dashboard | `GET /admin/dashboard`, `/admin/shops?status=PENDING`, `/admin/reviews`, `/admin/payouts?status=FAILED` | FR-39 |
| Shops | `GET /admin/shops`, `GET /admin/shops/{id}`, `POST …/verify · reject · suspend · reactivate`, `PATCH …/payout` | FR-35 – FR-37, FR-73, FR-81 |
| Payouts | `GET /admin/payouts`, `POST /admin/payouts/{id}/retry` | FR-78, FR-79 |
| Reviews | `GET /admin/reviews` (read-only) | FR-38 |
| Profile | `GET/PATCH /users/me`, `POST /users/me/password` | — |
| Blog · Assistance · Notifications | *backend not built yet* — placeholder screens | FR-65, FR-58, FR-85 |

`GET /admin/dashboard` has no published schema (springdoc name collision with the shop dashboard), so `src/lib/dashboard.ts` reads it structurally: every object it returns becomes a metric group, and `grossBookingValue`, `platformCommission` and `failedCount` drive the revenue and payout-health cards.

## i18n

Strings live in `src/i18n/locales/{km,en}.json`. Khmer is the default; the choice is saved in `localStorage`. Font: Kantumruy Pro (Khmer and Latin).
