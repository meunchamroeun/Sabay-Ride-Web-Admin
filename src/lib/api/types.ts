// Types mirror the OpenAPI spec at /v3/api-docs. Money arrives as a string or number
// (the API documents strings such as "14.40"), so treat it as `Money` and never do float math on it.

export type Money = string | number;

export type Role = "CUSTOMER" | "SHOP_OWNER" | "SHOP_STAFF" | "ADMIN";

export interface AuthUser {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  roles: Role[];
  phoneVerified: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
}

export interface Profile {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  hasDrivingLicence?: boolean;
  phoneVerified: boolean;
  emailVerified: boolean;
  preferredLanguage?: "en" | "km";
  roles: Role[];
  telegramLinked: boolean;
  createdAt: string;
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
}

export type ShopStatus = "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";

export interface AdminShop {
  id: string;
  ownerId: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  status: ShopStatus;
  rejectionReason?: string;
  verifiedById?: string;
  verifiedAt?: string;
  paymentSetupComplete: boolean;
  payoutEnabled: boolean;
  payoutSharePercent?: Money;
  visibleInSearch: boolean;
  cancellationCount: number;
  createdAt: string;
}

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "REFUNDED";

export interface PayoutRow {
  paymentId: string;
  bookingId: string;
  shopName: string;
  amount: Money;
  status: PaymentStatus;
  attempts: number;
  failureReason?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  shopId: string;
  shopName: string;
  customerName: string;
  rating: number;
  comment?: string;
  createdAt: string;
  /** The shop owner's answer (FR-27); the owner may change it, the review itself is fixed. */
  shopReply?: string;
  shopRepliedAt?: string;
}

/**
 * GET /notifications item (FR-16). The item schema is not published (springdoc name collision
 * on PageResponse), so every field is optional and read defensively in src/lib/notifications.ts.
 */
export interface AppNotification {
  id: string;
  type?: string;
  title?: string;
  body?: string;
  message?: string;
  read?: boolean;
  readAt?: string | null;
  createdAt?: string;
  [key: string]: unknown;
}

/** GET /notifications: a normal page plus the unread total, so the badge and list come together. */
export interface NotificationPage extends Page<AppNotification> {
  unreadCount: number;
}

export interface Photo {
  id: string;
  url?: string;
  imageUrl?: string;
  isPrimary?: boolean;
  primary?: boolean;
  sortOrder?: number;
}

/**
 * GET /admin/dashboard. The spec's schema name collides with the shop dashboard, so the
 * exact shape is not published. The description promises: shops, users, bookings,
 * revenue split (grossBookingValue / platformCommission) and payout health (failedCount).
 * The dashboard UI renders whatever groups arrive, using these keys when present.
 */
export type AdminDashboard = Record<string, unknown>;

export interface ApiErrorBody {
  code?: string;
  message?: string;
  field?: string;
  timestamp?: string;
}

/* ---------------------------------------------------------------------------------------------
 * Admin screens from SRS §14.4 / §14.8 that the API does not expose yet. Shapes follow the SRS
 * data dictionary (§16) and the endpoint proposals in api-doc.md §10. The demo admin serves them
 * today; with a real account the screens show "waiting for the API" until the endpoints exist.
 * ------------------------------------------------------------------------------------------- */

export type BookingStatus = "PENDING" | "CONFIRMED" | "REJECTED" | "EXPIRED" | "CANCELLED" | "ACTIVE" | "COMPLETED";
export const BOOKING_STATUSES: BookingStatus[] = [
  "PENDING", "CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED", "REJECTED", "EXPIRED",
];

export interface BookingItem {
  motorbikeId: string;
  model: string;
  plateNumber: string;
  pricePerDay: Money;
  lineTotal: Money;
  swappedFrom?: string;
}

export interface BookingHistoryEntry {
  status: BookingStatus;
  changedBy?: string;
  note?: string;
  changedAt: string;
}

export interface AdminBooking {
  id: string;
  customerName: string;
  customerPhone?: string;
  shopId: string;
  shopName: string;
  startDate: string;
  endDate: string;
  rentalDays: number;
  status: BookingStatus;
  paymentOption: "PAY_NOW" | "PAY_AT_SHOP";
  pickupMethod: "SELF_PICKUP" | "DELIVERY";
  deliveryAddress?: string;
  subtotal: Money;
  deliveryFee: Money;
  total: Money;
  amountOnline: Money;
  amountCash: Money;
  commissionAmount: Money;
  payoutAmount: Money;
  payoutStatus: "PENDING" | "PAID" | "FAILED" | "NOT_APPLICABLE";
  items: BookingItem[];
  history?: BookingHistoryEntry[];
  createdAt: string;
}

export type MotorbikeStatus = "ACTIVE" | "MAINTENANCE" | "INACTIVE";

export interface AdminMotorbike {
  id: string;
  shopId: string;
  shopName: string;
  plateNumber: string;
  unitCode: string;
  model: string;
  brand: string;
  type: string;
  engineCc: number;
  pricePerDay: Money;
  status: MotorbikeStatus;
  photoUrl?: string;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  roles: Role[];
  active: boolean;
  phoneVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "VERIFY" | "PAYOUT";
export const AUDIT_ACTIONS: AuditAction[] = ["CREATE", "UPDATE", "DELETE", "LOGIN", "VERIFY", "PAYOUT"];

export interface AuditLogEntry {
  id: string;
  userName: string;
  userId?: string;
  action: AuditAction;
  entityName: string;
  entityId: string;
  description: string;
  ipAddress: string;
  createdAt: string;
}

export type BlogStatus = "DRAFT" | "PUBLISHED";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  coverImageUrl?: string;
  status: BlogStatus;
  authorName: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type BlogPostInput = Pick<BlogPost, "title" | "slug" | "content" | "coverImageUrl">;

export type ReportPeriod = "DAILY" | "WEEKLY" | "MONTHLY";

export interface ReportRow {
  label: string;
  bookings: number;
  completed: number;
  cancelled: number;
  grossBookingValue: Money;
  platformCommission: Money;
}

export interface ShopReportRow {
  shopId: string;
  shopName: string;
  completed: number;
  grossBookingValue: Money;
  platformCommission: Money;
  received: Money;
}

export interface PlatformReport {
  period: ReportPeriod;
  from: string;
  to: string;
  totals: {
    bookings: number;
    completed: number;
    cancelled: number;
    grossBookingValue: Money;
    platformCommission: Money;
    paidToShops: Money;
  };
  series: ReportRow[];
  shops: ShopReportRow[];
}
