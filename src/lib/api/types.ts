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
