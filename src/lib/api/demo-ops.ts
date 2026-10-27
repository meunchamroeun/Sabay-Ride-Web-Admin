/**
 * Demo data for the SRS admin screens that have no API yet: bookings, motorbikes, users,
 * reports, audit log and blog. Generated once from a fixed seed so every reload looks the same,
 * and kept internally consistent (dashboard totals and reports are computed from the bookings).
 */
import { ApiError } from "./errors";
import type {
  AdminBooking,
  AdminMotorbike,
  AdminUser,
  AuditAction,
  AuditLogEntry,
  BlogPost,
  BlogPostInput,
  BookingHistoryEntry,
  BookingStatus,
  Page,
  PlatformReport,
  ReportPeriod,
  ReportRow,
  Role,
} from "./types";

export interface OpsShop {
  id: string;
  name: string;
  status: string;
}

export interface OpsData {
  bookings: AdminBooking[];
  motorbikes: AdminMotorbike[];
  users: AdminUser[];
  audit: AuditLogEntry[];
  blog: BlogPost[];
}

/* ------------------------------------------------------------------ helpers */

const DAY = 86_400_000;
const iso = (t: number) => new Date(t).toISOString();
const dateOnly = (t: number) => iso(t).slice(0, 10);
const money = (n: number) => n.toFixed(2);

/** Small seeded PRNG (mulberry32) so the demo is identical on every load. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let idCounter = 0;
const nextId = (r: () => number) => {
  const h = (n: number) => Math.floor(r() * 16 ** n).toString(16).padStart(n, "0");
  idCounter++;
  return `${h(8)}-${h(4)}-4${h(3)}-8${h(3)}-${h(8)}${idCounter.toString(16).padStart(4, "0")}`;
};

export const page = <T>(list: T[], q: URLSearchParams): Page<T> => {
  const p = Math.max(0, Number(q.get("page") ?? 0));
  const size = Math.min(100, Math.max(1, Number(q.get("size") ?? 20)));
  return { content: list.slice(p * size, p * size + size), page: p, size, totalElements: list.length };
};

const matches = (q: string | null, ...fields: (string | undefined)[]) =>
  !q || fields.some((f) => f?.toLowerCase().includes(q.trim().toLowerCase()));

/* ------------------------------------------------------------------ seed data */

const MODELS: [string, string, string, number, number][] = [
  // model, brand, type, cc, price/day
  ["Honda Dream 125", "Honda", "Semi-automatic", 125, 7],
  ["Honda Click 125i", "Honda", "Scooter", 125, 9],
  ["Honda Scoopy", "Honda", "Scooter", 110, 8],
  ["Yamaha NMAX 155", "Yamaha", "Scooter", 155, 14],
  ["Honda PCX 160", "Honda", "Scooter", 160, 15],
  ["Suzuki Viva 115", "Suzuki", "Semi-automatic", 115, 6],
  ["Honda Wave 110", "Honda", "Semi-automatic", 110, 6],
  ["Honda CRF 250L", "Honda", "Manual", 250, 25],
];

export const MODEL_PHOTOS: Record<string, string> = {
  "Honda Dream 125": "https://images.unsplash.com/photo-1563074408-c10b8c208bc5?w=900&auto=format&fit=crop",
  "Honda Click 125i": "https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?w=900&auto=format&fit=crop",
  "Honda Scoopy": "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=900&auto=format&fit=crop",
  "Yamaha NMAX 155": "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=900&auto=format&fit=crop",
  "Honda PCX 160": "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=900&auto=format&fit=crop",
  "Suzuki Viva 115": "https://images.unsplash.com/photo-1579753089733-3aa94f73cef1?w=900&auto=format&fit=crop",
  "Honda Wave 110": "https://images.unsplash.com/photo-1748590853322-b99f3fdd3ab0?w=900&auto=format&fit=crop",
  "Honda CRF 250L": "https://images.unsplash.com/photo-1515777315835-281b94c9589f?w=900&auto=format&fit=crop",
};

const CUSTOMERS = [
  "Sokha Chan", "Dara Pich", "Emily Carter", "Kimheng Ly", "Lucas Martin", "Sreyneang Kim", "Akira Tanaka",
  "Rithy Sok", "Maria Lopez", "Vannak Heng", "Chloe Nguyen", "Ben Wilson", "Sophea Meas", "Noah Schmidt",
  "Bopha Chea", "Liam O'Brien", "Channary Phal", "Yuki Sato", "Visal Touch", "Hannah Kim", "Piseth Nhem",
  "Oliver Brown", "Sreymom Long", "Mateo García", "Kosal Ouk",
];

const OWNERS = [
  "Vuthy Sok", "Chanthou Lim", "Sopheap Keo", "Rotha Mao", "Dalin Prak", "Samnang Yim", "Kunthea Ros",
  "Makara Tep", "Sothea Hun", "Pheakdey Nov",
];

const BLOG: [string, string, boolean, number][] = [
  [
    "Angkor Wat sunrise by scooter: a first-timer's route",
    `Leaving Siem Reap at **4:45 AM** gets you to the Angkor Wat west gate with time to spare.

## The route
1. Take **Charles de Gaulle Blvd** north — it is lit and flat the whole way.
2. Buy your Angkor pass at the ticket centre on **Road 60** first; it opens at 4:30.
3. Park at the official scooter parking left of the moat (1,000 riel).

## Tips
- Fill the tank the night before: most stations open at 6:00.
- Bring a light jacket — it is cooler than you think on the bike.
- After sunrise, ride the **Small Circuit** clockwise: Bayon, Ta Prohm, Banteay Kdei.`,
    true,
    24,
  ],
  [
    "Riding safely in Siem Reap: helmets, traffic and fuel",
    `Siem Reap traffic is relaxed compared with Phnom Penh, but a few local habits help.

## Helmets
Helmets are required for riders and passengers. Every SabayRide shop lends one free — ask for a size that fits.

## Traffic
- Traffic flows on the **right**. Tuk-tuks merge slowly; give them room.
- At roundabouts, the vehicle already inside goes first.
- Use your horn lightly to signal you are overtaking.

## Fuel
Bottled petrol at roadside stalls costs a little more than at stations. A full tank on a scooter lasts most temple days.`,
    true,
    11,
  ],
  [
    "Beyond the temples: Kampong Phluk and Tonle Sap by motorbike",
    `Kampong Phluk is a stilted village 30 km south-east of Siem Reap.

## Getting there
Head out on **National Road 6** towards Roluos, then turn south. The last 8 km are dirt road — a semi-automatic or the CRF is more comfortable than a small scooter.

## Best time
Visit from **August to December**, when the water is high. Boats leave from the village jetty.

_Draft — add photos and current boat prices before publishing._`,
    false,
    3,
  ],
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);

export function buildOps(shops: OpsShop[], admin: { id: string; name: string }): OpsData {
  const r = rng(20261015);
  const now = Date.now();
  const listed = shops.filter((s) => s.status === "VERIFIED" || s.status === "SUSPENDED");

  /* motorbikes — 32 units, like the backend's seed data */
  const motorbikes: AdminMotorbike[] = [];
  let unit = 0;
  listed.forEach((shop, si) => {
    const count = [7, 6, 6, 5, 4, 4][si] ?? 4;
    for (let k = 0; k < count && motorbikes.length < 32; k++) {
      const [model, brand, type, cc, price] = MODELS[(si * 3 + k) % MODELS.length];
      unit++;
      motorbikes.push({
        id: nextId(r),
        shopId: shop.id,
        shopName: shop.name,
        plateNumber: `SR ${1 + (unit % 3)}${"ABCDE"[unit % 5]}-${String(1000 + Math.floor(r() * 8999))}`,
        unitCode: `${model.split(" ")[1]?.[0] ?? "M"}${String(k + 1).padStart(3, "0")}`,
        model,
        brand,
        type,
        engineCc: cc,
        pricePerDay: money(price + (si % 2)),
        status: r() < 0.82 ? "ACTIVE" : r() < 0.6 ? "MAINTENANCE" : "INACTIVE",
        photoUrl: MODEL_PHOTOS[model] || "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=900&auto=format&fit=crop",
        createdAt: iso(now - (40 - si * 3) * DAY - k * 3_600_000),
      });
    }
  });

  /* users */
  const users: AdminUser[] = [
    {
      id: admin.id,
      fullName: admin.name,
      phone: "+85500000001",
      email: "admin1@sabayride.demo",
      roles: ["ADMIN"],
      active: true,
      phoneVerified: true,
      createdAt: iso(now - 90 * DAY),
      lastLoginAt: iso(now - 600_000),
    },
  ];
  OWNERS.forEach((name, i) =>
    users.push({
      id: nextId(r),
      fullName: name,
      phone: `+8551290000${(i + 1) % 10}`,
      roles: ["CUSTOMER", "SHOP_OWNER"],
      active: shops[i]?.status !== "SUSPENDED",
      phoneVerified: true,
      createdAt: iso(now - (60 - i * 4) * DAY),
      lastLoginAt: iso(now - Math.floor(r() * 5) * DAY - Math.floor(r() * 20) * 3_600_000),
    }),
  );
  ["Sreypov Chhun", "Ratana Ek"].forEach((name, i) =>
    users.push({
      id: nextId(r),
      fullName: name,
      phone: `+8559780000${i + 1}`,
      roles: ["SHOP_STAFF"],
      active: true,
      phoneVerified: true,
      createdAt: iso(now - (20 - i * 5) * DAY),
      lastLoginAt: iso(now - Math.floor(r() * 3) * DAY),
    }),
  );
  CUSTOMERS.forEach((name, i) =>
    users.push({
      id: nextId(r),
      fullName: name,
      phone: `+855${i % 3 === 0 ? 77 : i % 3 === 1 ? 10 : 96}${String(900001 + i * 137).slice(0, 6)}`,
      email: i % 2 ? `${slugify(name).replace(/-/g, ".")}@mail.com` : undefined,
      roles: ["CUSTOMER"],
      active: i !== 7 && i !== 18,
      phoneVerified: i % 5 !== 4,
      createdAt: iso(now - (70 - i * 2.5) * DAY),
      lastLoginAt: r() < 0.85 ? iso(now - Math.floor(r() * 14) * DAY) : undefined,
    }),
  );
  const customers = users.filter((u) => u.roles.length === 1 && u.roles[0] === "CUSTOMER");

  /*
   * Bookings — ~72 over the last ~75 days, generated to follow the SRS rules:
   *  - §8 lifecycle: PENDING → CONFIRMED | REJECTED | EXPIRED; CONFIRMED → CANCELLED | ACTIVE; ACTIVE → COMPLETED
   *  - FR-43/47: a unit is assigned only if it is ACTIVE and free for the dates (overlap rule §6.3)
   *  - §9: commission 10% of total (incl. delivery); online = total (pay now) or commission (pay at shop);
   *        shop is paid only at handover; cancellation ≥24h before pickup is refunded in full
   */
  const bookings: AdminBooking[] = [];
  const occupied = new Map<string, [number, number][]>(); // unit id → [start, end) of PENDING/CONFIRMED/ACTIVE/COMPLETED
  const isFree = (bikeId: string, start: number, end: number) =>
    !(occupied.get(bikeId) ?? []).some(([s0, e0]) => s0 < end && e0 > start);
  const holdsUnit = (st: BookingStatus) => st === "PENDING" || st === "CONFIRMED" || st === "ACTIVE" || st === "COMPLETED";

  for (let i = 0; i < 90 && bookings.length < 72; i++) {
    const shopBikes = listed[i % listed.length];
    const bikes = motorbikes.filter((m) => m.shopId === shopBikes.id && m.status === "ACTIVE");
    if (!bikes.length) continue;
    const created = now - Math.floor(Math.pow(r(), 1.3) * 75) * DAY - Math.floor(r() * 20) * 3_600_000;
    const start = created + Math.floor(r() * 4) * DAY;
    const days = 1 + Math.floor(r() * 5);
    const end = start + days * DAY;
    const startsInFuture = start > now;
    const ended = end < now;
    const roll = r();
    let status: BookingStatus;
    if (startsInFuture) status = roll < 0.25 ? "PENDING" : roll < 0.85 ? "CONFIRMED" : "CANCELLED";
    else if (!ended) status = "ACTIVE";
    else status = roll < 0.74 ? "COMPLETED" : roll < 0.84 ? "CANCELLED" : roll < 0.92 ? "EXPIRED" : "REJECTED";

    // Pick free units (booking by model, assignment by unit — §6.4).
    const wanted = r() < 0.15 && bikes.length > 1 ? 2 : 1;
    const chosen: AdminMotorbike[] = [];
    for (let k = 0; k < bikes.length && chosen.length < wanted; k++) {
      const bike = bikes[(i + k) % bikes.length];
      if (!holdsUnit(status) || isFree(bike.id, start, end)) chosen.push(bike);
    }
    if (!chosen.length) continue; // fully booked: the customer would not have been offered this
    if (holdsUnit(status)) chosen.forEach((b) => occupied.set(b.id, [...(occupied.get(b.id) ?? []), [start, end]]));

    const items = chosen.map((bike) => {
      const ppd = Number(bike.pricePerDay);
      return { motorbikeId: bike.id, model: bike.model, plateNumber: bike.plateNumber, pricePerDay: money(ppd), lineTotal: money(ppd * days) };
    });
    const delivery = r() < 0.3;
    const subtotal = items.reduce((a, it) => a + Number(it.lineTotal), 0);
    const deliveryFee = delivery ? 3 : 0;
    const total = subtotal + deliveryFee;
    const payNow = r() < 0.55;
    const commission = Math.round(total * 10) / 100; // 10% of the total, delivery included (§12.1)
    const live = status === "CONFIRMED" || status === "ACTIVE" || status === "COMPLETED";
    const cancelled = status === "CANCELLED";
    // Charged after confirmation; a cancelled booking was charged and then refunded in full.
    const amountOnline = live || cancelled ? (payNow ? total : commission) : 0;
    const handedOver = status === "ACTIVE" || status === "COMPLETED";
    const customer = customers[Math.floor(r() * customers.length)];
    const owner = OWNERS[i % OWNERS.length];

    const history: BookingHistoryEntry[] = [{ status: "PENDING", changedBy: customer.fullName, changedAt: iso(created) }];
    const respond = created + (20 + Math.floor(r() * 80)) * 60_000;
    if (status === "EXPIRED") history.push({ status, note: "No reply within the hold period", changedAt: iso(created + (start - created < DAY ? 30 : 120) * 60_000) });
    if (status === "REJECTED") history.push({ status, changedBy: owner, note: "Unit needs repair on those dates", changedAt: iso(respond) });
    if (live || cancelled) history.push({ status: "CONFIRMED", changedBy: owner, changedAt: iso(respond) });
    if (cancelled) {
      const at = Math.max(respond + 3_600_000, Math.min(start - 2 * DAY, now - 3_600_000));
      history.push({ status, changedBy: customer.fullName, note: "Cancelled more than 24h before pickup — refunded in full", changedAt: iso(at) });
    }
    if (handedOver) history.push({ status: "ACTIVE", changedBy: owner, note: "Handover confirmed", changedAt: iso(start + 9 * 3_600_000) });
    if (status === "COMPLETED") history.push({ status, changedBy: owner, note: "Motorbike returned", changedAt: iso(end + 10 * 3_600_000) });

    bookings.push({
      id: nextId(r),
      customerName: customer.fullName,
      customerPhone: customer.phone,
      shopId: shopBikes.id,
      shopName: shopBikes.name,
      startDate: dateOnly(start),
      endDate: dateOnly(end),
      rentalDays: days,
      status,
      paymentOption: payNow ? "PAY_NOW" : "PAY_AT_SHOP",
      pickupMethod: delivery ? "DELIVERY" : "SELF_PICKUP",
      deliveryAddress: delivery ? ["Shinta Mani Angkor, Oum Khun St", "Golden Temple Hotel, Sivatha Blvd", "Jaya House, River Road"][i % 3] : undefined,
      subtotal: money(subtotal),
      deliveryFee: money(deliveryFee),
      total: money(total),
      amountOnline: money(amountOnline),
      amountCash: money(live ? total - amountOnline : 0),
      commissionAmount: money(live ? commission : 0),
      payoutAmount: money(handedOver ? total - commission : 0),
      payoutStatus: handedOver ? (r() < 0.06 ? "FAILED" : "PAID") : live ? "PENDING" : "NOT_APPLICABLE",
      items,
      history,
      createdAt: iso(created),
    });
  }
  bookings.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  // At least two payouts failed after their 3 automatic retries, so the FR-79 flag shows up.
  const handedOver = bookings.filter((b) => b.payoutStatus === "PAID" || b.payoutStatus === "FAILED");
  for (const k of [1, 6]) if (handedOver[k]) handedOver[k].payoutStatus = "FAILED";

  /* blog — the three articles SRS A11 requires before launch */
  const blog: BlogPost[] = BLOG.map(([title, content, published, daysAgo]) => ({
    id: nextId(r),
    title,
    slug: slugify(title),
    content,
    coverImageUrl: undefined,
    status: published ? "PUBLISHED" : "DRAFT",
    authorName: admin.name,
    publishedAt: published ? iso(now - (daysAgo - 1) * DAY) : undefined,
    createdAt: iso(now - daysAgo * DAY),
    updatedAt: iso(now - Math.max(0, daysAgo - 2) * DAY),
  }));

  /* audit log — derived from the generated activity */
  const audit: AuditLogEntry[] = [];
  const ip = () => `203.144.${70 + Math.floor(r() * 20)}.${Math.floor(r() * 250)}`;
  const log = (t: number, userName: string, action: AuditAction, entityName: string, entityId: string, description: string) =>
    audit.push({ id: nextId(r), userName, userId: undefined, action, entityName, entityId, description, ipAddress: ip(), createdAt: iso(t) });

  for (let d = 0; d < 30; d++) log(now - d * DAY - 8 * 3_600_000, admin.name, "LOGIN", "user", admin.id, "Signed in to the admin dashboard");
  shops.forEach((s) => {
    if (s.status !== "PENDING") log(now - 20 * DAY - Math.floor(r() * 15) * DAY, admin.name, "VERIFY", "shop", s.id, `${s.status === "REJECTED" ? "Rejected" : "Approved"} ${s.name}`);
  });
  bookings.slice(0, 40).forEach((b) => {
    log(new Date(b.createdAt).getTime(), b.customerName, "CREATE", "booking", b.id, `Booked ${b.items[0].model} at ${b.shopName}`);
    // Payout happens at handover (SRS §9.3), never in the future.
    const handover = b.history?.find((h) => h.status === "ACTIVE")?.changedAt;
    if (b.payoutStatus === "PAID" && handover && new Date(handover).getTime() <= now)
      log(new Date(handover).getTime() + 60_000, "system", "PAYOUT", "payment", b.id, `Paid $${b.payoutAmount} to ${b.shopName}`);
  });
  motorbikes.slice(0, 10).forEach((m, k) => log(now - (k + 2) * DAY, OWNERS[k % OWNERS.length], "UPDATE", "motorbike", m.id, `Set ${m.unitCode} (${m.plateNumber}) to ${m.status}`));
  log(now - 4 * DAY, OWNERS[1], "DELETE", "motorbike_photo", nextId(r), "Removed a blurry photo of Honda Click 125i");
  blog.filter((p) => p.publishedAt).forEach((p) => log(new Date(p.publishedAt!).getTime(), admin.name, "UPDATE", "blog_post", p.id, `Published "${p.title}"`));
  audit.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { bookings, motorbikes, users, audit, blog };
}

/* ------------------------------------------------------------------ reports (FR-40) */

const isRevenue = (s: BookingStatus) => s === "CONFIRMED" || s === "ACTIVE" || s === "COMPLETED";

/** Local calendar date (not UTC), so Cambodia's UTC+7 midnight stays on the right day. */
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function buildReport(ops: OpsData, period: ReportPeriod): PlatformReport {
  const now = new Date();
  const buckets: { label: string; from: number; to: number }[] = [];
  if (period === "DAILY") {
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      buckets.push({ label: ymd(d), from: d.getTime(), to: d.getTime() + DAY });
    }
  } else if (period === "WEEKLY") {
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
    for (let i = 11; i >= 0; i--) {
      const d = new Date(monday.getTime() - i * 7 * DAY);
      buckets.push({ label: ymd(d), from: d.getTime(), to: d.getTime() + 7 * DAY });
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      buckets.push({ label: ymd(d).slice(0, 7), from: d.getTime(), to: next.getTime() });
    }
  }
  const from = buckets[0].from;
  const to = buckets[buckets.length - 1].to;
  const inRange = ops.bookings.filter((b) => {
    const t = new Date(b.createdAt).getTime();
    return t >= from && t < to;
  });

  const series: ReportRow[] = buckets.map((bk) => {
    const list = inRange.filter((b) => {
      const t = new Date(b.createdAt).getTime();
      return t >= bk.from && t < bk.to;
    });
    const rev = list.filter((b) => isRevenue(b.status));
    return {
      label: bk.label,
      bookings: list.length,
      completed: list.filter((b) => b.status === "COMPLETED").length,
      cancelled: list.filter((b) => b.status === "CANCELLED").length,
      grossBookingValue: money(rev.reduce((a, b) => a + Number(b.total), 0)),
      platformCommission: money(rev.reduce((a, b) => a + Number(b.commissionAmount), 0)),
    };
  });

  const byShop = new Map<string, { shopId: string; shopName: string; completed: number; gross: number; commission: number }>();
  inRange.filter((b) => b.status === "COMPLETED").forEach((b) => {
    const row = byShop.get(b.shopId) ?? { shopId: b.shopId, shopName: b.shopName, completed: 0, gross: 0, commission: 0 };
    row.completed++;
    row.gross += Number(b.total);
    row.commission += Number(b.commissionAmount);
    byShop.set(b.shopId, row);
  });

  const rev = inRange.filter((b) => isRevenue(b.status));
  const gross = rev.reduce((a, b) => a + Number(b.total), 0);
  const commission = rev.reduce((a, b) => a + Number(b.commissionAmount), 0);
  return {
    period,
    from: ymd(new Date(from)),
    to: ymd(new Date(to - DAY)),
    totals: {
      bookings: inRange.length,
      completed: inRange.filter((b) => b.status === "COMPLETED").length,
      cancelled: inRange.filter((b) => b.status === "CANCELLED").length,
      grossBookingValue: money(gross),
      platformCommission: money(commission),
      paidToShops: money(gross - commission),
    },
    series,
    shops: [...byShop.values()]
      .sort((a, b) => b.gross - a.gross)
      .map((s) => ({
        shopId: s.shopId,
        shopName: s.shopName,
        completed: s.completed,
        grossBookingValue: money(s.gross),
        platformCommission: money(s.commission),
        received: money(s.gross - s.commission),
      })),
  };
}

/** Month-to-date numbers for the admin dashboard (SRS §14.12). */
export function monthTotals(ops: OpsData) {
  const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const month = ops.bookings.filter((b) => new Date(b.createdAt).getTime() >= start);
  const rev = month.filter((b) => isRevenue(b.status));
  const gross = rev.reduce((a, b) => a + Number(b.total), 0);
  const commission = rev.reduce((a, b) => a + Number(b.commissionAmount), 0);
  return { month, gross, commission };
}

/* ------------------------------------------------------------------ request handling */

export const NOT_HANDLED = Symbol("not handled");

export function addAudit(ops: OpsData, userName: string, action: AuditAction, entityName: string, entityId: string, description: string) {
  ops.audit.unshift({
    id: `audit-${Date.now()}-${ops.audit.length}`,
    userName,
    action,
    entityName,
    entityId,
    description,
    ipAddress: "127.0.0.1 (demo)",
    createdAt: new Date().toISOString(),
  });
}

function validatePost(body: Partial<BlogPostInput>, partial: boolean) {
  if (!partial || body.title !== undefined) {
    if (!body.title?.trim()) throw new ApiError(400, "VALIDATION_FAILED", "Title is required.", "title");
    if (body.title.length > 200) throw new ApiError(400, "VALIDATION_FAILED", "Title is too long.", "title");
  }
  if (!partial || body.slug !== undefined) {
    if (!body.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug))
      throw new ApiError(400, "VALIDATION_FAILED", "Slug may only contain a–z, 0–9 and dashes.", "slug");
  }
  if (!partial || body.content !== undefined) {
    if (!body.content?.trim()) throw new ApiError(400, "VALIDATION_FAILED", "Content is required.", "content");
  }
}

export function handleOps(
  ops: OpsData,
  admin: { id: string; name: string },
  method: string,
  path: string,
  q: URLSearchParams,
  body: unknown,
): unknown {
  let m: RegExpMatchArray | null;

  if (method === "GET" && path === "/admin/bookings") {
    const status = q.get("status");
    return page(
      ops.bookings.filter(
        (b) => (!status || b.status === status) && matches(q.get("q"), b.id, b.customerName, b.shopName, b.items[0]?.plateNumber),
      ),
      q,
    );
  }
  if ((m = path.match(/^\/admin\/bookings\/([^/]+)$/)) && method === "GET") {
    const b = ops.bookings.find((x) => x.id === m![1]);
    if (!b) throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking not found.");
    return b;
  }

  if (method === "GET" && path === "/admin/motorbikes") {
    const status = q.get("status");
    return page(
      ops.motorbikes.filter(
        (x) => (!status || x.status === status) && matches(q.get("q"), x.model, x.plateNumber, x.shopName, x.unitCode),
      ),
      q,
    );
  }

  if (method === "GET" && path === "/admin/users") {
    const role = q.get("role") as Role | null;
    const active = q.get("active");
    return page(
      ops.users.filter(
        (u) =>
          (!role || u.roles.includes(role)) &&
          (active === null || String(u.active) === active) &&
          matches(q.get("q"), u.fullName, u.phone, u.email),
      ),
      q,
    );
  }
  if ((m = path.match(/^\/admin\/users\/([^/]+)\/(suspend|reactivate)$/)) && method === "POST") {
    const u = ops.users.find((x) => x.id === m![1]);
    if (!u) throw new ApiError(404, "USER_NOT_FOUND", "User not found.");
    if (u.roles.includes("ADMIN")) throw new ApiError(409, "CANNOT_SUSPEND_ADMIN", "Administrators cannot be suspended here.");
    if (m[2] === "suspend") {
      const reason = (body as { reason?: string })?.reason?.trim();
      if (!reason) throw new ApiError(400, "VALIDATION_FAILED", "A reason is required.", "reason");
      u.active = false;
      addAudit(ops, admin.name, "UPDATE", "user", u.id, `Suspended ${u.fullName}: ${reason}`);
    } else {
      u.active = true;
      addAudit(ops, admin.name, "UPDATE", "user", u.id, `Reactivated ${u.fullName}`);
    }
    return u;
  }

  if (method === "GET" && path === "/admin/reports") {
    const period = (q.get("period") ?? "MONTHLY") as ReportPeriod;
    if (!["DAILY", "WEEKLY", "MONTHLY"].includes(period)) throw new ApiError(400, "VALIDATION_FAILED", "Unknown period.", "period");
    return buildReport(ops, period);
  }

  if (method === "GET" && path === "/admin/audit-logs") {
    const action = q.get("action");
    return page(
      ops.audit.filter((a) => (!action || a.action === action) && matches(q.get("q"), a.userName, a.description, a.entityName)),
      q,
    );
  }

  if (path === "/admin/blog/posts" && method === "GET") {
    const status = q.get("status");
    const list = ops.blog.filter((p) => !status || p.status === status).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return page(list, q);
  }
  if (path === "/admin/blog/posts" && method === "POST") {
    const b = body as BlogPostInput;
    validatePost(b, false);
    if (ops.blog.some((p) => p.slug === b.slug)) throw new ApiError(409, "SLUG_TAKEN", "Another post already uses this slug.", "slug");
    const now = new Date().toISOString();
    const post: BlogPost = { id: `post-${Date.now()}`, ...b, status: "DRAFT", authorName: admin.name, createdAt: now, updatedAt: now };
    ops.blog.unshift(post);
    addAudit(ops, admin.name, "CREATE", "blog_post", post.id, `Created draft "${post.title}"`);
    return post;
  }
  if ((m = path.match(/^\/admin\/blog\/posts\/([^/]+)(\/(publish|unpublish))?$/))) {
    const post = ops.blog.find((p) => p.id === m![1]);
    if (!post) throw new ApiError(404, "POST_NOT_FOUND", "Post not found.");
    const now = new Date().toISOString();
    if (method === "PATCH") {
      const b = body as Partial<BlogPostInput>;
      validatePost(b, true);
      if (b.slug && ops.blog.some((p) => p.slug === b.slug && p.id !== post.id))
        throw new ApiError(409, "SLUG_TAKEN", "Another post already uses this slug.", "slug");
      Object.assign(post, b, { updatedAt: now });
      addAudit(ops, admin.name, "UPDATE", "blog_post", post.id, `Edited "${post.title}"`);
      return post;
    }
    if (method === "POST" && m[3] === "publish") {
      Object.assign(post, { status: "PUBLISHED", publishedAt: post.publishedAt ?? now, updatedAt: now });
      addAudit(ops, admin.name, "UPDATE", "blog_post", post.id, `Published "${post.title}"`);
      return post;
    }
    if (method === "POST" && m[3] === "unpublish") {
      Object.assign(post, { status: "DRAFT", updatedAt: now });
      addAudit(ops, admin.name, "UPDATE", "blog_post", post.id, `Unpublished "${post.title}"`);
      return post;
    }
  }

  return NOT_HANDLED;
}
