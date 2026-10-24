# SabayRide Admin — API connection guide

How the admin web dashboard (this repo) connects to the SabayRide Spring Boot API. For the backend team, frontend developers and anyone deploying the dashboard.

- **Live dashboard:** https://sabay-ride-web-admin.vercel.app
- **API docs (Swagger):** [staging](https://sabayride-staging.cavkim.tech/swagger-ui.html) · [production](https://sabayride.cavkim.tech/swagger-ui.html)
- **OpenAPI JSON:** `<base>/v3/api-docs`

---

## 1. Environments

| Name | Base URL | Payments | Use it for |
| --- | --- | --- | --- |
| Staging (សាកល្បង) | `https://sabayride-staging.cavkim.tech` | No QR, payments settle instantly | Testing flows |
| Production (ប្រើប្រាស់ជាក់ស្តែង) | `https://sabayride.cavkim.tech` | Real ABA KHQR, stays `PENDING` until paid | Real operations |

All endpoints live under **`/api/v1`**. Everything except `/api/v1/auth/*` and a few public reads needs a Bearer token.

### Configuration

The URLs live in one place, `src/config/env.ts`. Environment variables (`.env.local`, or Vercel project settings):

| Variable | Default | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_API_ENV` | `staging` | Which backend the dashboard uses by default (`staging` or `production`). |
| `NEXT_PUBLIC_API_BASE_URL` | — | Optional. Overrides the URL of the default backend (e.g. a local API `http://localhost:8080`). |
| `NEXT_PUBLIC_DEMO_ADMIN` | on | Set to `false` to remove the demo admin (see §8). |

`NEXT_PUBLIC_*` values are read at **build time**, so redeploy after changing them on Vercel.

Admins can also switch backend at runtime: hover the **Connected to** card on the login page and choose Production or Staging. The choice is saved per browser (`localStorage` key `sabayride.admin.apiEnv`). Switching signs you out, because tokens belong to one backend.

---

## 2. How requests reach the API (proxy)

The browser never calls the API host directly. Every request goes to the dashboard's own origin and Next.js rewrites it to the matching backend:

```
Browser ──► https://<dashboard>/backend/staging/api/v1/...     ──► https://sabayride-staging.cavkim.tech/api/v1/...
Browser ──► https://<dashboard>/backend/production/api/v1/...  ──► https://sabayride.cavkim.tech/api/v1/...
```

- Rewrites are defined in `next.config.ts`; requests are built in `src/lib/api/client.ts`.
- **Why:** the API's CORS policy only allows some origins (e.g. `http://localhost:3000`) and answers `403` to the Vercel domain. Proxying makes the dashboard work on any domain (Vercel previews, custom domains) without the backend whitelisting each one.
- **Note for the backend team:** requests arrive from Vercel's servers, not the admin's IP. If you log or rate-limit by IP, the original client IP is in `X-Forwarded-For`.

Want the browser to call the API directly instead? Add the dashboard origin to the API's CORS allow-list (methods `GET, POST, PATCH, DELETE`, headers `content-type, authorization`), then point `url()` in `client.ts` at the base URL.

---

## 3. Authentication

### 3.1 Sign in — `POST /api/v1/auth/login`

```http
POST /api/v1/auth/login
Content-Type: application/json

{ "identifier": "+85512345678", "password": "••••••••" }
```

`identifier` is a phone in E.164 format (`+855…`) or an email.

```jsonc
// 200 OK — AuthTokens
{
  "accessToken": "eyJ…",          // JWT, valid 15 minutes (expiresIn = 900)
  "refreshToken": "…",            // single use, see 3.3
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": { "id": "uuid", "fullName": "…", "phone": "+855…", "email": "…", "roles": ["ADMIN"], "phoneVerified": true }
}
```

- A wrong password and an unknown account both return `401 INVALID_CREDENTIALS`.
- **Only `ADMIN` can use the dashboard.** After login the dashboard checks `user.roles`. Accounts with only `CUSTOMER` or `SHOP_OWNER` are signed out again with "This account is not an administrator", because those roles use the mobile app. Admin endpoints also return `403` for them.

### 3.2 Calling protected endpoints

```http
GET /api/v1/admin/shops?status=PENDING
Authorization: Bearer <accessToken>
```

Tokens are stored in `localStorage` under `sabayride.admin.session` (`src/lib/api/token-store.ts`).

### 3.3 Refresh — `POST /api/v1/auth/refresh`

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{ "refreshToken": "<current refresh token>" }
```

Returns a **new** `AuthTokens` pair. Important rules:

1. **Refresh tokens are single use.** The one you send is spent; store the new one.
2. **Reusing a spent token revokes every session** for that user (treated as theft).

How the dashboard handles it (`refreshSession()` in `client.ts`):

- Refreshes **60 seconds before** the access token expires, and once more if a request gets `401`.
- Only one refresh runs at a time **per tab** (shared promise) and **across tabs** (Web Locks `navigator.locks` + re-reading storage), so the same refresh token is never sent twice.
- If the refresh fails (`401 INVALID_REFRESH_TOKEN`), the session is cleared and the admin is sent to `/login?expired=1`.

### 3.4 Sign out — `POST /api/v1/auth/logout`

```json
{ "refreshToken": "<current refresh token>" }
```

Always `204`. The access token cannot be revoked and stays valid up to 15 minutes, so the dashboard deletes both tokens locally.

### 3.5 Forgot password — `POST /api/v1/auth/password/forgot`

```json
{ "phone": "+855…" }
```

Always `202`. If the number has an account with Telegram linked, a reset code is sent there. On the login page, "Forgot password?" sends the code and then opens the reset step below.

### 3.5.1 Reset password — `POST /api/v1/auth/password/reset`

```json
{ "phone": "+855…", "code": "123456", "newPassword": "at least 8 characters" }
```

`204` on success. It revokes every session and returns **no tokens**, so the admin signs in again with the new password. A wrong or expired code returns `400`.

### 3.6 Change password — `POST /api/v1/users/me/password`

```json
{ "currentPassword": "…", "newPassword": "8–72 characters" }
```

**Revokes every session and returns a fresh `AuthTokens` pair.** The dashboard stores the new pair so this device stays signed in, while every other device is signed out.

---

## 4. Conventions

| Topic | Rule |
| --- | --- |
| **Money** | Sent as a decimal **string**, e.g. `"14.40"`. Never do float maths on it; the dashboard only formats it. USD is the currency; Khmer riel is display-only (`× 4100`, `config.khrPerUsd`). |
| **IDs** | UUID strings. The UI shows the first 8 characters, e.g. `#33153DD0`. |
| **Dates** | ISO-8601 UTC (`2026-10-15T09:36:28Z`), shown in **Asia/Phnom_Penh** time. |
| **Pagination** | `?page=0&size=20` (page starts at 0, max size 100). Response: `{ "content": [], "page": 0, "size": 20, "totalElements": 42 }`. |
| **Errors** | `{ "code": "INVALID_CREDENTIALS", "message": "…", "field": "password", "timestamp": "…" }`. The dashboard shows `message (code)`. A `403` shows "Your account doesn't have permission… An ADMIN role is required". |

---

## 5. Endpoints used by each screen

All paths are relative to `/api/v1`. Client functions are in `src/lib/api/endpoints.ts`.

### Dashboard — `/`

| Call | Purpose |
| --- | --- |
| `GET /admin/dashboard` | Totals for the current month: shops, users, bookings, revenue split, payout health. |
| `GET /admin/shops?status=PENDING&page=0&size=5` | "Shop review queue" card. |
| `GET /admin/payouts?status=FAILED&page=0&size=1` | Failed payout count (`totalElements`). |

The cards follow the SRS administrator dashboard (§14.12): customers, shops and shops pending verification, motorbikes, bookings, platform commission, and payouts pending or failed.

> **Backend request:** the OpenAPI schema for `/admin/dashboard` points to `Response`, which is the *shop* dashboard (`shop`, `bookings`, `fleet`) — a springdoc name collision. The dashboard therefore reads the admin response **structurally**: every top-level object becomes a card, numeric fields become rows, and it looks for `grossBookingValue`, `platformCommission` and `failedCount` by name (`src/lib/dashboard.ts`). Please give the admin DTO its own schema name (e.g. `@Schema(name = "AdminDashboardResponse")`) so the shape is documented.

### Shops — `/shops`

| Call | Purpose |
| --- | --- |
| `GET /admin/shops?status={PENDING\|VERIFIED\|SUSPENDED\|REJECTED}&page&size` | Tabs. `PENDING` is oldest first (the review queue). |
| `GET /admin/shops/{id}` | Detail panel (`AdminShopResponse`). |
| `GET /shops/{shopId}/photos` | Photos in the detail panel (public, no token). |
| `GET /shops/{shopId}/reviews?page=0&size=5` | Recent reviews in the detail panel (public). |
| `POST /admin/shops/{id}/verify` | **Approve**. No body. |
| `POST /admin/shops/{id}/reject` | **Reject**. Body `{ "reason": "…" }` (max 255, shown to the owner). |
| `POST /admin/shops/{id}/suspend` | **Suspend**: hides the shop and disables payouts. Body `{ "reason": "…" }`. |
| `POST /admin/shops/{id}/reactivate` | **Reactivate**: back to `VERIFIED`. No body. |

Which actions are shown depends on the status:

| Status | Actions |
| --- | --- |
| `PENDING` | Approve, Reject |
| `REJECTED` | Approve |
| `VERIFIED` | Suspend |
| `SUSPENDED` | Reactivate |

A shop appears in customer search only when it is `VERIFIED` **and** `paymentSetupComplete` is true (`visibleInSearch`). The panel shows the payout account status read-only: the SRS gives "Edit shop profile and payout details" to the shop owner only (§5.1), so the dashboard does not call `PATCH /admin/shops/{id}/payout` even though the API has it.

### Payouts — `/payouts`

| Call | Purpose |
| --- | --- |
| `GET /admin/payouts?status={FAILED\|PENDING\|PAID}&page&size` | Tabs; no `status` = all. Rows are `PayoutRow`. |

View only. Payouts and their three retries are automatic with "no administrator action" (FR-78, FR-79); a payout that still fails is flagged here and in the top-bar bell for the administrator's attention. The dashboard therefore does not call `POST /admin/payouts/{id}/retry`, even though the API has it.

### Reviews — `/reviews`

| Call | Purpose |
| --- | --- |
| `GET /admin/reviews?page&size=12` | All reviews, newest first. Read-only: the API has no moderation endpoint. Each review may carry the shop owner's answer, `shopReply` and `shopRepliedAt` (FR-27), shown under the review. |

### Notifications — top-bar bell

| Call | Purpose |
| --- | --- |
| `GET /notifications?page=0&size=10` | Newest first. The page also carries `unreadCount`, which drives the badge. |
| `POST /notifications/{id}/read` | Opening an unread item marks it read. Returns `{ unreadCount }`; `404` if already read. |
| `POST /notifications/read-all` | "Mark all as read". Returns `{ unreadCount: 0 }`. |

The item schema is not published (springdoc collision on `PageResponse`), so the bell reads `title`, `body`/`message`, `type`, `read`/`readAt` and `createdAt` defensively (`src/lib/notifications.ts`). A `type` containing `PAYOUT` links to Payouts. Under the list, the failed-payout count from `GET /admin/payouts?status=FAILED` stays as the FR-79 flag. **Backend request:** publish the notification item schema.

### Profile — `/profile`

| Call | Purpose |
| --- | --- |
| `GET /users/me` | Profile card. |
| `PATCH /users/me` | Body `{ "fullName": "…", "preferredLanguage": "km" \| "en" }`. Only sent fields change. |
| `POST /users/me/password` | Change password (see §3.6). |

### Screens marked "Coming soon"

**Bookings**, **Motorbikes**, **Users**, **Reports**, **Audit log** and **Travel blog** are built to the SRS, but the API (Production and Staging) has none of their endpoints yet. Until it does:
- The page shows **Coming soon** and lists the endpoints it needs, for every sign-in including the demo admin. Nothing is called, and no sample data is shown.
- The sidebar and the phone "More" menu mark them **Soon**. On phones, Reviews takes the Bookings slot in the bottom bar.

When the backend ships one, add its key to `NEXT_PUBLIC_API_READY` (e.g. `bookings,users`) and redeploy; the page then calls the paths in **§10**. Keys: `bookings`, `motorbikes`, `users`, `reports`, `audit`, `blog` (`src/config/api-features.ts`).

Motorbikes stay view-only for admins even then: the SRS gives "Add or edit motorbikes" to shop owners only (§5.1), and the API only has `/shops/me/motorbikes` for owners.

The top-bar bell shows the signed-in admin's notifications from `GET /notifications` (SRS §10 sends the admin **payout failed**), plus the failed-payout count as the FR-79 flag. Roadside assistance is handled by shops in the app, so it has no admin screen.

---

## 6. Example: one call, end to end

```ts
import { adminApi } from "@/lib/api/endpoints";

// Approve a shop
const shop = await adminApi.verify("6f1c…-uuid");
// → POST /backend/staging/api/v1/admin/shops/6f1c…/verify
//   Authorization: Bearer <token>   (refreshed automatically if close to expiry)
// → proxied to https://sabayride-staging.cavkim.tech/api/v1/admin/shops/6f1c…/verify
// ← 200 AdminShopResponse { status: "VERIFIED", verifiedAt: "…", … }
```

Every call goes through `api()` in `client.ts`, which:

1. Builds `/backend/<env>/api/v1/<path>?<query>`.
2. Adds `Authorization: Bearer …`, refreshing first if the token expires within 60 seconds.
3. Retries once after a refresh if the server answers `401`.
4. Throws `ApiError(status, code, message, field)` for non-2xx responses.

Screens use TanStack Query on top of this, caching for 30 seconds and refetching after each action.

---

## 7. Run locally against the API

```bash
cd sabayride-admin
cp .env.example .env.local   # staging by default
npm install
npm run dev                  # http://localhost:3000
```

To use a backend running on your machine:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080 npm run dev
```

Quick check that the proxy reaches the API (expect `401 INVALID_CREDENTIALS`):

```bash
curl -i -X POST http://localhost:3000/backend/staging/api/v1/auth/login -H 'Content-Type: application/json' -d '{"identifier":"x","password":"x"}'
```

---

## 8. Demo admin (no backend account needed)

Until an `ADMIN` account exists, sign in on the login page with:

| Username | Password |
| --- | --- |
| `admin1` (or `+85500000001`) | `Demo1234!` |

Demo sessions never call the API. `src/lib/api/demo.ts` answers the paths that exist in the API with sample data: 10 shops, 16 payouts and 12 reviews. "Coming soon" screens stay Coming soon in the demo too. Approve, reject, suspend, payout setup and retry all work in memory until reload or sign-out, and a **Demo data** badge is shown in the top bar. Disable it with `NEXT_PUBLIC_DEMO_ADMIN=false`.

---

## 9. What the dashboard needs from the backend

| # | Request | Why |
| --- | --- | --- |
| 1 | An **ADMIN** account on staging (and later production). | The supplied test accounts are `CUSTOMER` / `SHOP_OWNER`; all `/admin/*` calls return `403` for them. |
| 2 | Distinct OpenAPI schema names for `GET /admin/dashboard` and `GET /admin/shops`. | Swagger shows the wrong shapes: the dashboard points to the shop dashboard's `Response`, and the shops list points to a `PageResponse` of reviews. Both are springdoc name collisions (same class name in different packages). |
| 3 | The admin endpoints in **§10** (bookings, motorbikes, users, reports, audit log, blog). | The screens are built and call exactly these paths. |
| 4 | `motorbikes` and `users.customers` in `GET /admin/dashboard`. | SRS §14.12 asks for total customers and total motorbikes on the admin dashboard. |
| 5 | *(Optional)* CORS for the dashboard origin. | Only needed if you want the browser to call the API directly instead of through the proxy (§2). |

---

## 10. Proposed admin endpoints (SRS §14.4, §14.8)

None of these exist in the API yet (checked against Production and Staging); the matching screens show "Coming soon" until they do. These are the paths the screens will call. Field names follow the SRS data dictionary (§16) in camelCase. Lists use the standard page envelope `{ content, page, size, totalElements }` (default size 20, max 100). TypeScript shapes are in `src/lib/api/types.ts`, and working sample responses come from the demo in `src/lib/api/demo-ops.ts`.

All of them are ADMIN-only and should write an audit-log entry for every change (NFR-19).

### 10.1 Bookings — FR-38, FR-50

| Method & path | Query / body | Returns |
| --- | --- | --- |
| `GET /admin/bookings` | `status` (`PENDING`, `CONFIRMED`, `ACTIVE`, `COMPLETED`, `CANCELLED`, `REJECTED`, `EXPIRED`), `q` (ID, customer, shop or plate), `page`, `size` | `Page<AdminBooking>`, newest first |
| `GET /admin/bookings/{id}` | — | `AdminBooking` including `history` |

```jsonc
// AdminBooking
{
  "id": "uuid", "customerName": "Lucas Martin", "customerPhone": "+855…",
  "shopId": "uuid", "shopName": "Phsar Leu Bikes",
  "startDate": "2026-10-15", "endDate": "2026-10-18", "rentalDays": 3,
  "status": "ACTIVE", "paymentOption": "PAY_NOW", "pickupMethod": "SELF_PICKUP", "deliveryAddress": null,
  "subtotal": "45.00", "deliveryFee": "0.00", "total": "45.00",
  "amountOnline": "45.00", "amountCash": "0.00", "commissionAmount": "4.50",
  "payoutAmount": "40.50", "payoutStatus": "PAID",            // PENDING | PAID | FAILED | NOT_APPLICABLE
  "items": [{ "motorbikeId": "uuid", "model": "Honda PCX 160", "plateNumber": "SR 2A-4160", "pricePerDay": "15.00", "lineTotal": "45.00", "swappedFrom": null }],
  "history": [{ "status": "PENDING", "changedBy": "Lucas Martin", "note": null, "changedAt": "…" }],
  "createdAt": "…"
}
```

### 10.2 Motorbikes — FR-38

| Method & path | Query | Returns |
| --- | --- | --- |
| `GET /admin/motorbikes` | `status` (`ACTIVE`, `MAINTENANCE`, `INACTIVE`), `q` (model, plate, unit code, shop), `page`, `size` | `Page<AdminMotorbike>` |

`AdminMotorbike`: `id, shopId, shopName, plateNumber, unitCode, model, brand, type, engineCc, pricePerDay, status, photoUrl?, createdAt`. There is no availability field: availability depends on a date range (SRS §6).

### 10.3 Users — FR-37

| Method & path | Query / body | Returns |
| --- | --- | --- |
| `GET /admin/users` | `role` (`CUSTOMER`, `SHOP_OWNER`, `SHOP_STAFF`, `ADMIN`), `active` (`true`/`false`), `q` (name, phone, email), `page`, `size` | `Page<AdminUser>` |
| `POST /admin/users/{id}/suspend` | `{ "reason": "…" }` (required, max 255) | `AdminUser` |
| `POST /admin/users/{id}/reactivate` | — | `AdminUser` |

`AdminUser`: `id, fullName, phone, email?, roles[], active, phoneVerified, createdAt, lastLoginAt?`. Suspending should also revoke the user's sessions. The dashboard never offers suspend on ADMIN accounts.

### 10.4 Reports — FR-40

| Method & path | Query | Returns |
| --- | --- | --- |
| `GET /admin/reports` | `period` = `DAILY` (last 14 days), `WEEKLY` (last 12 weeks, from Monday) or `MONTHLY` (last 6 months); optional `from`, `to` (`YYYY-MM-DD`) | `PlatformReport` |

```jsonc
// PlatformReport — dates are Cambodia local dates
{
  "period": "MONTHLY", "from": "2026-05-01", "to": "2026-10-31",
  "totals": { "bookings": 72, "completed": 52, "cancelled": 8,
              "grossBookingValue": "2463.00", "platformCommission": "246.30", "paidToShops": "2216.70" },
  "series": [{ "label": "2026-05", "bookings": 9, "completed": 7, "cancelled": 1,
               "grossBookingValue": "310.00", "platformCommission": "31.00" }],
  "shops":  [{ "shopId": "uuid", "shopName": "Vuthy Moto Rental", "completed": 11,
               "grossBookingValue": "750.00", "platformCommission": "75.00", "received": "675.00" }]
}
```

- **`series[].label`:** `YYYY-MM-DD` for daily and weekly (the week's Monday), `YYYY-MM` for monthly.
- **Gross and commission** count bookings that are `CONFIRMED`, `ACTIVE` or `COMPLETED`.
- **`shops`** covers completed rentals only. Shops are paid at handover, so this is a report, not an invoice (SRS §9.7).
- **Export:** the dashboard downloads CSV itself (UTF-8 with BOM, so Excel shows Khmer correctly), so no export endpoint is needed.

### 10.5 Audit log — FR-41, NFR-19

| Method & path | Query | Returns |
| --- | --- | --- |
| `GET /admin/audit-logs` | `action` (`CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `VERIFY`, `PAYOUT`), `q` (user or description), `page`, `size` (default 25) | `Page<AuditLogEntry>`, newest first |

`AuditLogEntry`: `id, userName, userId?, action, entityName, entityId, description, ipAddress, createdAt`. Use `"system"` as `userName` for automatic actions such as payouts and expiry.

### 10.6 Travel blog — FR-65, FR-66

| Method & path | Body | Returns |
| --- | --- | --- |
| `GET /admin/blog/posts?status=&page=&size=` | — | `Page<BlogPost>` (drafts included), last updated first |
| `POST /admin/blog/posts` | `{ "title", "slug", "content", "coverImageUrl"? }` | `BlogPost` created as `DRAFT` |
| `PATCH /admin/blog/posts/{id}` | any of the above | `BlogPost` |
| `POST /admin/blog/posts/{id}/publish` | — | `BlogPost` (`PUBLISHED`, sets `publishedAt` the first time) |
| `POST /admin/blog/posts/{id}/unpublish` | — | `BlogPost` (back to `DRAFT`) |

`BlogPost`: `id, title, slug, content (Markdown), coverImageUrl?, status, authorName, publishedAt?, createdAt, updatedAt`.
- **Validation:** title up to 200 characters; slug `^[a-z0-9]+(-[a-z0-9]+)*$` and unique, with `409 SLUG_TAKEN` on a duplicate.
- **Field errors:** return `field` so the editor can show the message under the right input (NFR-24).
- **Public app:** the app's public blog endpoints should return `PUBLISHED` posts only (FR-66).
