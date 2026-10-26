# Sabay-Ride-Web-Admin

> **Connecting to the API?** See [api-doc.md](api-doc.md): environments, the `/backend` proxy, auth and token refresh, and every endpoint each screen uses.

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
- Forgot password: `POST /auth/password/forgot` sends a code to Telegram, then `POST /auth/password/reset` sets the new password.
- Access tokens last 15 minutes. `src/lib/api/client.ts` refreshes 60 s before expiry and retries once on `401`.
- `POST /auth/refresh` is **single use** and replaying a spent token revokes every session, so refreshes are de-duplicated inside a tab (shared promise) and across tabs (Web Locks plus a storage re-check).

## Install on a phone (PWA)

The dashboard is an installable web app. On Android Chrome use **Install app**, and on iPhone Safari use **Share → Add to Home Screen**. It then opens full-screen with the SabayRide icon.

- **Phones** (under 768px) get an app-style header and a bottom tab bar: Home, Shops, Bookings, Payouts and More. More opens the full menu.
- **Offline:** `public/sw.js` shows `public/offline.html` when there is no connection. It never caches pages or API data, because admin data is private and live.
- **Manifest and icons:** `src/app/manifest.ts` and `public/icons/`. The service worker registers only in production builds.

## Real data only

The dashboard signs in real `ADMIN` accounts and shows only data from the API you pick on the login page (Production or Staging). Screens whose endpoints the API does not have yet show **Coming soon** with the endpoints they need.

There is no ADMIN account yet: the test accounts the backend shared are `CUSTOMER` and `SHOP_OWNER`, which the dashboard refuses with "This account is not an administrator".

**Local sample data (developers only):** set `NEXT_PUBLIC_DEMO_ADMIN=true` in `.env.local` to enable an in-browser sample admin (`src/lib/api/demo.ts`) for UI work. Never set it in Vercel. Any sample session left in a browser is signed out automatically while the flag is off.

## Screens → API

Checked against the live OpenAPI spec of Production and Staging (`https://sabayride.cavkim.tech/swagger-ui.html`). The latest update adds the administrator endpoints for Bookings, Motorbikes, Users, and Blog posts, plus manual payout retry.

| Screen | Status | Endpoints | SRS |
| --- | --- | --- | --- |
| Dashboard | ✅ Real data | `GET /admin/dashboard`, `/admin/shops?status=PENDING`, `/admin/payouts?status=FAILED` | FR-39 |
| Shops | ✅ Real data | `GET /admin/shops`, `GET /admin/shops/{id}`, `POST …/verify · reject · suspend · reactivate` | FR-35 – FR-37, FR-73, FR-81 |
| Bookings | ✅ Real data | `GET /admin/bookings`, `GET /admin/bookings/{id}` | FR-38, FR-50 |
| Motorbikes | ✅ Real data | `GET /admin/motorbikes` (view only; shops manage their fleet) | FR-38 |
| Users | ✅ Real data | `GET /admin/users`, `POST …/suspend · reactivate` | FR-37 |
| Payouts | ✅ Real data | `GET /admin/payouts`, `POST /admin/payouts/{id}/retry` | FR-78, FR-79 |
| Travel blog | ✅ Real data | `GET/POST /admin/blog/posts`, `PATCH /admin/blog/posts/{id}`, `POST …/publish · unpublish` | FR-65 |
| Reviews | ✅ Real data | `GET /admin/reviews` (read-only, with shop owner replies) | FR-38, FR-27 |
| Notifications (bell) | ✅ Real data | `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all` | FR-16, §10 |
| Profile | ✅ Real data | `GET/PATCH /users/me`, `POST /users/me/password` | — |
| Sign-in & password reset | ✅ Real data | `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/password/forgot`, `/auth/password/reset` | — |
| Reports | ⏳ Waiting for API | `GET /admin/reports?period=` + CSV export *(pending backend)* | FR-40 |
| Audit log | ⏳ Waiting for API | `GET /admin/audit-logs` *(pending backend)* | FR-41 |

**Scope follows the SRS.** Features the SRS does not give the administrator are left out even when the API has them: editing a shop's payout account or commission (`PATCH /admin/shops/{id}/payout`, owner-only in §5.1), retrying payouts by hand (`POST /admin/payouts/{id}/retry`, automatic per FR-78/79), deleting blog posts (FR-65 lists create, edit, publish, unpublish), CSV export outside Reports (FR-40), social sign-in (FR-01/02), and alerts other than failed payouts (§10).

"Coming soon" screens are fully built and switch on without code changes: when the backend ships one, add its key to `NEXT_PUBLIC_API_READY` (comma-separated: `bookings,motorbikes,users,reports,audit,blog`) in Vercel and redeploy. The list lives in `src/config/api-features.ts`.

`GET /admin/dashboard` has no published schema (springdoc name collision with the shop dashboard), so `src/lib/dashboard.ts` reads it structurally: every object it returns becomes a metric group, and `grossBookingValue`, `platformCommission` and `failedCount` drive the revenue and payout-health cards.

## i18n

Strings live in `src/i18n/locales/{km,en}.json`. Khmer is the default; the choice is saved in `localStorage`. Font: Kantumruy Pro (Khmer and Latin).
