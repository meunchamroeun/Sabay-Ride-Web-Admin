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

## Demo admin (testing without a real admin account)

Until the backend team issues an ADMIN account, sign in on the login page with:

| Username | Password |
| --- | --- |
| `admin1` (or `+85500000001`) | `Demo1234!` |

The demo answers every admin endpoint from sample data in the browser (`src/lib/api/demo.ts`): 10 shops, 16 payouts, 12 reviews and a dashboard. Approve, reject, suspend, payout setup and payout retry all work and stay until the page is reloaded or you sign out. Nothing is sent to the real servers, and the top bar shows a **Demo data** badge. Set `NEXT_PUBLIC_DEMO_ADMIN=false` to remove it once real admin accounts exist.

## Screens → API

| Screen | Endpoints | SRS |
| --- | --- | --- |
| Dashboard | `GET /admin/dashboard`, `/admin/shops?status=PENDING`, `/admin/reviews`, `/admin/payouts?status=FAILED` | FR-39 |
| Shops | `GET /admin/shops`, `GET /admin/shops/{id}`, `POST …/verify · reject · suspend · reactivate`, `PATCH …/payout` | FR-35 – FR-37, FR-73, FR-81 |
| Payouts | `GET /admin/payouts`, `POST /admin/payouts/{id}/retry` | FR-78, FR-79 |
| Reviews | `GET /admin/reviews` (read-only) | FR-38 |
| Bookings · Motorbikes | `GET /admin/bookings`, `GET /admin/motorbikes` *(proposed)* | FR-38, FR-50 |
| Users | `GET /admin/users`, `POST …/suspend · reactivate` *(proposed)* | FR-37 |
| Reports | `GET /admin/reports?period=` *(proposed)* + CSV export | FR-40 |
| Audit log | `GET /admin/audit-logs` *(proposed)* | FR-41 |
| Travel blog | `/admin/blog/posts` CRUD + publish *(proposed)* | FR-65 |
| Profile | `GET/PATCH /users/me`, `POST /users/me/password` | — |
| Notifications | *backend not built yet* — placeholder | FR-16, FR-85 |

`GET /admin/dashboard` has no published schema (springdoc name collision with the shop dashboard), so `src/lib/dashboard.ts` reads it structurally: every object it returns becomes a metric group, and `grossBookingValue`, `platformCommission` and `failedCount` drive the revenue and payout-health cards.

## i18n

Strings live in `src/i18n/locales/{km,en}.json`. Khmer is the default; the choice is saved in `localStorage`. Font: Kantumruy Pro (Khmer and Latin).
