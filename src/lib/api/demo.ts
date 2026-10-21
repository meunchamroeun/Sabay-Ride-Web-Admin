/**
 * Demo admin: a mock backend that lives in the browser, so the dashboard can be tried before a
 * real ADMIN account exists. It answers the same paths and shapes as the API (see /v3/api-docs),
 * keeps changes (approve, reject, suspend, reactivate) in memory until the page is reloaded, and
 * never sends anything to the real servers.
 */
import { ApiError } from "./errors";
import { addAudit, buildOps, handleOps, monthTotals, NOT_HANDLED, page, type OpsData } from "./demo-ops";
import type { AdminShop, AuthUser, PayoutRow, Photo, Profile, Review, ShopStatus } from "./types";

/** Turned off by setting NEXT_PUBLIC_DEMO_ADMIN=false (e.g. once real admin accounts exist). */
export const DEMO_ENABLED = process.env.NEXT_PUBLIC_DEMO_ADMIN !== "false";

/** Sign-in for the demo admin. Not a real account — it only unlocks the sample data. */
export const DEMO_ACCOUNT = { identifier: "admin1", altIdentifier: "+85500000001", password: "Demo1234!" };

export const DEMO_TOKEN = "demo-admin-token";

export const DEMO_USER: AuthUser = {
  id: "00000000-0000-4000-8000-00000000a001",
  fullName: "Admin 1",
  phone: "+85500000001",
  email: "admin1@sabayride.demo",
  roles: ["ADMIN"],
  phoneVerified: true,
};

export function isDemoCredentials(identifier: string, password: string) {
  const id = identifier.trim().toLowerCase();
  return (
    DEMO_ENABLED &&
    password === DEMO_ACCOUNT.password &&
    (id === DEMO_ACCOUNT.identifier || id === DEMO_ACCOUNT.altIdentifier || id === DEMO_USER.email)
  );
}

/* ------------------------------------------------------------------ sample data */

const day = 86_400_000;
const ago = (days: number, hours = 0) => new Date(Date.now() - days * day - hours * 3_600_000).toISOString();
// Stable, distinct-looking UUIDs (the UI shows the first 8 characters as a short reference).
const uuid = (n: number, salt = "5") => {
  const h = (k: number) => ((Math.imul(n * 7919 + k * 104729 + salt.charCodeAt(0) * 31, 2654435761) >>> 0).toString(16).padStart(8, "0"));
  return `${h(1)}-${h(2).slice(0, 4)}-4${h(3).slice(0, 3)}-8${h(4).slice(0, 3)}-${h(5)}${h(6).slice(0, 4)}`;
};

/** Self-contained placeholder photo (no external image host): tinted tile with a scooter mark. */
function placeholderPhoto(seed: number) {
  const hues = [150, 205, 32, 265, 350, 180];
  const hue = hues[seed % hues.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${hue},45%,58%)"/><stop offset="1" stop-color="hsl(${hue + 30},50%,32%)"/></linearGradient></defs>
<rect width="240" height="240" fill="url(#g)"/>
<g fill="none" stroke="rgba(255,255,255,.85)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
<circle cx="72" cy="150" r="24"/><circle cx="170" cy="150" r="24"/>
<path d="M72 150h46l26-44h-30M144 106l26 44M118 150l-14-40h-22M150 92h22"/></g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

type DemoShop = AdminShop & { photos: number };

const SHOP_SEED: [string, string, ShopStatus, boolean, number, number][] = [
  // name, address, status, payment setup, cancellations, days since applying
  ["Angkor Wheels", "Sivatha Blvd, Svay Dangkum", "VERIFIED", true, 0, 41],
  ["Vuthy Moto Rental", "Pub Street, Old Market", "VERIFIED", true, 1, 38],
  ["Lotus Ride Siem Reap", "Wat Bo Road, Sala Kamreuk", "VERIFIED", true, 0, 30],
  ["Temple Run Scooters", "Charles de Gaulle Blvd", "VERIFIED", false, 2, 22],
  ["Phsar Leu Bikes", "National Road 6, Phsar Leu", "VERIFIED", true, 0, 18],
  ["Tonle Sap Motors", "Chong Kneas Road", "PENDING", false, 0, 3],
  ["Bayon Easy Rider", "Taphul Road, Svay Dangkum", "PENDING", false, 0, 2],
  ["Kampong Phluk Rentals", "Airport Road, Chreav", "PENDING", false, 0, 1],
  ["Night Market Moto", "Sok San Road, Old Market", "SUSPENDED", true, 5, 60],
  ["Quick Bike SR", "Street 20, Wat Damnak", "REJECTED", false, 0, 9],
];

function buildShops(): DemoShop[] {
  return SHOP_SEED.map(([name, address, status, setup, cancels, days], i) => {
    const verified = status === "VERIFIED" || status === "SUSPENDED";
    return {
      id: uuid(i + 1),
      ownerId: uuid(i + 101, "6"),
      name,
      phone: `+8551290000${(i + 1) % 10}`,
      address,
      city: "Siem Reap",
      status,
      rejectionReason:
        status === "REJECTED"
          ? "Shop photos do not match the registered address. Please upload photos of the storefront."
          : undefined,
      verifiedById: verified ? DEMO_USER.id : undefined,
      verifiedAt: verified ? ago(days - 1) : undefined,
      paymentSetupComplete: setup,
      payoutEnabled: setup && status === "VERIFIED",
      payoutSharePercent: 90,
      visibleInSearch: status === "VERIFIED" && setup,
      cancellationCount: cancels,
      createdAt: ago(days, i),
      photos: i % 4 === 3 ? 0 : 3 + (i % 3),
    };
  });
}

/** One payout per handed-over booking (SRS §9.3: the shop is paid at handover). */
function buildPayouts(ops: OpsData): PayoutRow[] {
  const handed = ops.bookings.filter((b) => b.payoutStatus === "PAID" || b.payoutStatus === "FAILED");
  return handed.map((b, k) => {
    const handover = b.history?.find((h) => h.status === "ACTIVE")?.changedAt ?? b.createdAt;
    const failed = b.payoutStatus === "FAILED";
    return {
      paymentId: `payout-${b.id}`,
      bookingId: b.id,
      shopName: b.shopName,
      amount: b.payoutAmount,
      status: failed ? "FAILED" : "PAID",
      attempts: failed ? 3 : 1,
      failureReason: failed ? (k % 2 ? "Payment gateway timeout after 3 attempts" : "Beneficiary account not found at ABA") : undefined,
      createdAt: handover,
    };
  });
}

const REVIEW_SEED: [number, string, number, string][] = [
  [0, "Sokha Chan", 5, "Clean Honda Click, friendly owner, delivered to my hotel on time."],
  [1, "Dara Pich", 4, "Good bike, a little slow at handover but fair price."],
  [2, "Emily Carter", 5, "No passport deposit needed — that alone made me book here again."],
  [0, "Kimheng Ly", 5, "Helmet was brand new. Will rent again for Angkor Wat sunrise."],
  [4, "Lucas Martin", 3, "Bike was fine, the brakes needed adjusting."],
  [1, "Sreyneang Kim", 5, ""],
  [2, "Akira Tanaka", 4, "Easy pickup near the Old Market."],
  [3, "Rithy Sok", 2, "Shop cancelled my first booking. Second time was OK."],
  [0, "Maria Lopez", 5, "Great service, explained the temple routes on a map."],
  [4, "Vannak Heng", 4, "Good price for a 3-day rental."],
  [1, "Chloe Nguyen", 5, "Fast replies on Telegram."],
  [2, "Ben Wilson", 4, ""],
];

/** Reviews only on COMPLETED bookings, one per booking, written by that customer (FR-15). */
function buildReviews(ops: OpsData): Review[] {
  const completed = ops.bookings.filter((b) => b.status === "COMPLETED");
  return REVIEW_SEED.map(([, , rating, comment], i) => {
    const b = completed[(i * 4) % completed.length];
    const returned = b.history?.find((h) => h.status === "COMPLETED")?.changedAt ?? b.createdAt;
    return {
      id: uuid(i + 1, "9"),
      bookingId: b.id,
      shopId: b.shopId,
      shopName: b.shopName,
      customerName: b.customerName,
      rating,
      comment: comment || undefined,
      createdAt: new Date(Math.min(Date.now(), new Date(returned).getTime() + 5 * 3_600_000)).toISOString(),
    };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

let state: { shops: DemoShop[]; payouts: PayoutRow[]; reviews: Review[]; profile: Profile; ops: OpsData } | null = null;

const STORE_KEY = "sabayride.demo.state";

/** Demo changes survive a page reload within the tab (sessionStorage), and reset on sign-out. */
function loadState(): typeof state {
  try {
    const raw = typeof window !== "undefined" ? window.sessionStorage.getItem(STORE_KEY) : null;
    return raw ? (JSON.parse(raw) as typeof state) : null;
  } catch {
    return null;
  }
}

function saveState() {
  try {
    if (state) window.sessionStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: keep working in memory */
  }
}

function db() {
  if (!state) state = loadState();
  if (!state) {
    const shops = buildShops();
    const ops = buildOps(shops, { id: DEMO_USER.id, name: DEMO_USER.fullName });
    state = {
      shops,
      ops,
      payouts: buildPayouts(ops),
      reviews: buildReviews(ops),
      profile: {
        ...DEMO_USER,
        dateOfBirth: "1998-04-12",
        hasDrivingLicence: true,
        emailVerified: true,
        preferredLanguage: "km",
        telegramLinked: false,
        createdAt: ago(90),
      },
    };
  }
  return state;
}

/** Forget changes made in the demo (called on sign-out). */
export function resetDemo() {
  state = null;
  try {
    window.sessionStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ request handler */

const strip = ({ photos: _photos, ...shop }: DemoShop): AdminShop => {
  void _photos;
  return shop;
};

function findShop(id: string) {
  const shop = db().shops.find((s) => s.id === id);
  if (!shop) throw new ApiError(404, "SHOP_NOT_FOUND", "Shop not found.");
  return shop;
}

function requireReason(body: unknown) {
  const reason = (body as { reason?: string } | undefined)?.reason?.trim();
  if (!reason) throw new ApiError(400, "VALIDATION_FAILED", "A reason is required.", "reason");
  return reason;
}

/** SRS §14.12 administrator dashboard, computed from the demo data so every screen agrees. */
function dashboard() {
  const { shops, payouts, ops } = db();
  const count = (st: ShopStatus) => shops.filter((x) => x.status === st).length;
  const { month, gross, commission } = monthTotals(ops);
  const byStatus = (st: string) => month.filter((b) => b.status === st).length;
  const customers = ops.users.filter((u) => u.roles.includes("CUSTOMER") && !u.roles.includes("SHOP_OWNER")).length;
  return {
    shops: {
      total: shops.length,
      pending: count("PENDING"),
      verified: count("VERIFIED"),
      suspended: count("SUSPENDED"),
      rejected: count("REJECTED"),
    },
    users: {
      total: ops.users.length,
      customers,
      shopOwners: ops.users.filter((u) => u.roles.includes("SHOP_OWNER")).length,
      staff: ops.users.filter((u) => u.roles.includes("SHOP_STAFF")).length,
    },
    motorbikes: {
      total: ops.motorbikes.length,
      active: ops.motorbikes.filter((m) => m.status === "ACTIVE").length,
      maintenance: ops.motorbikes.filter((m) => m.status === "MAINTENANCE").length,
      inactive: ops.motorbikes.filter((m) => m.status === "INACTIVE").length,
    },
    bookings: {
      total: month.length,
      completed: byStatus("COMPLETED"),
      active: byStatus("ACTIVE"),
      pendingRequests: byStatus("PENDING"),
      cancelled: byStatus("CANCELLED"),
      expired: byStatus("EXPIRED"),
    },
    revenue: {
      grossBookingValue: gross.toFixed(2),
      platformCommission: commission.toFixed(2),
      paidToShops: (gross - commission).toFixed(2),
    },
    payouts: {
      paidCount: payouts.filter((p) => p.status === "PAID").length,
      pendingCount: payouts.filter((p) => p.status === "PENDING").length,
      failedCount: payouts.filter((p) => p.status === "FAILED").length,
    },
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Answers one API call for the demo admin. Paths are relative to /api/v1, e.g. "/admin/shops". */
export async function demoRequest(method: string, path: string, query: URLSearchParams, body: unknown): Promise<unknown> {
  const result = await handleDemo(method, path, query, body);
  if (method !== "GET") saveState();
  return result;
}

async function handleDemo(method: string, path: string, query: URLSearchParams, body: unknown): Promise<unknown> {
  await sleep(180 + Math.random() * 220); // feel like a network
  const d = db();
  let m: RegExpMatchArray | null;

  if (method === "GET" && path === "/admin/dashboard") return dashboard();

  if (method === "GET" && path === "/admin/shops") {
    const status = (query.get("status") ?? "PENDING") as ShopStatus;
    const list = d.shops.filter((s) => s.status === status);
    // The API returns the review queue oldest first; other lists newest first.
    list.sort((a, b) => (status === "PENDING" ? 1 : -1) * a.createdAt.localeCompare(b.createdAt));
    return page(list.map(strip), query);
  }

  if ((m = path.match(/^\/admin\/shops\/([^/]+)$/)) && method === "GET") return strip(findShop(m[1]));

  if ((m = path.match(/^\/admin\/shops\/([^/]+)\/(verify|reject|suspend|reactivate)$/)) && method === "POST") {
    const shop = findShop(m[1]);
    const action = m[2];
    if (action === "verify") {
      if (shop.status === "VERIFIED") throw new ApiError(409, "ALREADY_VERIFIED", "This shop is already verified.");
      Object.assign(shop, { status: "VERIFIED", verifiedById: DEMO_USER.id, verifiedAt: new Date().toISOString(), rejectionReason: undefined });
    } else if (action === "reject") {
      Object.assign(shop, { status: "REJECTED", rejectionReason: requireReason(body) });
    } else if (action === "suspend") {
      Object.assign(shop, { status: "SUSPENDED", rejectionReason: requireReason(body) });
    } else {
      Object.assign(shop, { status: "VERIFIED", rejectionReason: undefined });
    }
    shop.payoutEnabled = shop.status === "VERIFIED" && shop.paymentSetupComplete;
    shop.visibleInSearch = shop.payoutEnabled;
    addAudit(d.ops, DEMO_USER.fullName, "VERIFY", "shop", shop.id, `${action[0].toUpperCase()}${action.slice(1)} ${shop.name}`);
    return strip(shop);
  }

  if (method === "GET" && path === "/admin/payouts") {
    const status = query.get("status");
    return page(d.payouts.filter((p) => !status || p.status === status), query);
  }

  if (method === "GET" && path === "/admin/reviews") return page(d.reviews, query);

  if ((m = path.match(/^\/shops\/([^/]+)\/photos$/)) && method === "GET") {
    const shop = findShop(m[1]);
    return Array.from({ length: shop.photos }, (_, i): Photo => ({
      id: `${shop.id}-p${i}`,
      imageUrl: placeholderPhoto(db().shops.indexOf(shop) * 3 + i),
      isPrimary: i === 0,
      sortOrder: i,
    }));
  }

  if ((m = path.match(/^\/shops\/([^/]+)\/reviews$/)) && method === "GET") {
    return page(d.reviews.filter((r) => r.shopId === m![1]), query);
  }

  if (path === "/users/me" && method === "GET") return d.profile;
  if (path === "/users/me" && method === "PATCH") {
    const b = body as Partial<Profile>;
    Object.assign(d.profile, Object.fromEntries(Object.entries(b).filter(([, v]) => v != null)));
    return d.profile;
  }
  if (path === "/users/me/password" && method === "POST") {
    const b = body as { currentPassword: string };
    if (b.currentPassword !== DEMO_ACCOUNT.password) {
      throw new ApiError(400, "WRONG_PASSWORD", "Current password is incorrect.", "currentPassword");
    }
    return undefined;
  }

  if (path === "/auth/logout" || path === "/auth/password/forgot") return undefined;

  const ops = handleOps(d.ops, { id: DEMO_USER.id, name: DEMO_USER.fullName }, method, path, query, body);
  if (ops !== NOT_HANDLED) return ops;

  throw new ApiError(404, "DEMO_NOT_AVAILABLE", `Not available in demo mode: ${method} ${path}`);
}
