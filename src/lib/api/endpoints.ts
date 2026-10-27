import { api } from "./client";
import { DEMO_USER, isDemoCredentials, resetDemo } from "./demo";
import { tokenStore } from "./token-store";
import type { AdminBooking, AdminDashboard, AdminMotorbike, AdminUser, AuditAction, AuditLogEntry, BlogPost, BlogPostInput, BlogStatus, BookingStatus, MotorbikeStatus, PlatformReport, ReportPeriod, Role, AdminShop, AuthTokens, Page, PaymentStatus, PayoutRow, Photo, Profile, Review, ShopStatus, NotificationPage } from "./types";

/* Authentication — open endpoints */
export const authApi = {
  async login(identifier: string, password: string) {
    if (isDemoCredentials(identifier, password)) {
      tokenStore.setDemo(DEMO_USER);
      return null;
    }
    const tokens = await api<AuthTokens>("/auth/login", {
      method: "POST",
      auth: false,
      body: { identifier, password },
    });
    tokenStore.setFromTokens(tokens);
    return tokens;
  },
  async logout() {
    const s = tokenStore.get();
    tokenStore.clear();
    if (s?.demo) {
      resetDemo();
      return;
    }
    if (s) {
      await api<void>("/auth/logout", { method: "POST", auth: false, body: { refreshToken: s.refreshToken } }).catch(
        () => undefined,
      );
    }
  },
  forgot: (phone: string) => api<void>("/auth/password/forgot", { method: "POST", auth: false, body: { phone } }),
  /** Sets a new password with the 6-digit Telegram code. Returns no tokens: sign in again afterwards. */
  resetPassword: (phone: string, code: string, newPassword: string) =>
    api<void>("/auth/password/reset", { method: "POST", auth: false, body: { phone, code, newPassword } }),
};

/* Profile — App and Dashboard */
/** In-app notifications for the signed-in user (FR-16). The admin receives "payout failed" (SRS §10). */
export const notificationsApi = {
  list: (page = 0, size = 10) => api<NotificationPage>("/notifications", { query: { page, size } }),
  markRead: (id: string) => api<{ unreadCount: number }>(`/notifications/${id}/read`, { method: "POST" }),
  markAllRead: () => api<{ unreadCount: number }>("/notifications/read-all", { method: "POST" }),
};

export const profileApi = {
  me: () => api<Profile>("/users/me"),
  update: (body: Partial<Pick<Profile, "fullName" | "preferredLanguage">>) =>
    api<Profile>("/users/me", { method: "PATCH", body }),
  /**
   * Revokes every session and returns a fresh token pair (see API docs), so store it to keep
   * this device signed in. The demo admin returns nothing and keeps its session.
   */
  async changePassword(currentPassword: string, newPassword: string) {
    const tokens = await api<AuthTokens | undefined>("/users/me/password", {
      method: "POST",
      body: { currentPassword, newPassword },
    });
    if (tokens?.accessToken) tokenStore.setFromTokens(tokens, tokenStore.get()?.user);
  },
};

/* Admin — Dashboard only */
export const adminApi = {
  dashboard: () => api<AdminDashboard>("/admin/dashboard"),

  shops: (status: ShopStatus, page = 0, size = 20) =>
    api<Page<AdminShop>>("/admin/shops", { query: { status, page, size } }),
  shop: (id: string) => api<AdminShop>(`/admin/shops/${id}`),
  verify: (id: string) => api<AdminShop>(`/admin/shops/${id}/verify`, { method: "POST" }),
  reject: (id: string, reason: string) =>
    api<AdminShop>(`/admin/shops/${id}/reject`, { method: "POST", body: { reason } }),
  suspend: (id: string, reason: string) =>
    api<AdminShop>(`/admin/shops/${id}/suspend`, { method: "POST", body: { reason } }),
  reactivate: (id: string) => api<AdminShop>(`/admin/shops/${id}/reactivate`, { method: "POST" }),
  updateShopPayout: (id: string, body: { paymentSetupComplete: boolean; payoutSharePercent?: number }) =>
    api<AdminShop>(`/admin/shops/${id}/payout`, { method: "PATCH", body }),

  payouts: (status: PaymentStatus | undefined, page = 0, size = 20) =>
    api<Page<PayoutRow>>("/admin/payouts", { query: { status, page, size } }),
  retryPayout: (id: string) => api<PayoutRow>(`/admin/payouts/${id}/retry`, { method: "POST" }),

  reviews: (page = 0, size = 20) => api<Page<Review>>("/admin/reviews", { query: { page, size } }),
};

/* Public — used by the shop detail panel and motorbike detail panel */
export const publicApi = {
  shopPhotos: (shopId: string) => api<Photo[]>(`/shops/${shopId}/photos`, { auth: false }),
  motorbikePhotos: (motorbikeId: string) => api<Photo[]>(`/motorbikes/${motorbikeId}/photos`, { auth: false }),
  shopReviews: (shopId: string, page = 0, size = 5) =>
    api<Page<Review>>(`/shops/${shopId}/reviews`, { auth: false, query: { page, size } }),
};

/*
 * Admin screens with live backend endpoints: bookings, motorbikes, users, and blog.
 * Reports and audit logs show "waiting for the API" until their endpoints are added.
 */
export const opsApi = {
  bookings: async (q: { status?: BookingStatus; q?: string; page?: number; size?: number }) => {
    const res = await api<Page<AdminBooking>>("/admin/bookings", { query: { size: 20, ...q } });
    if (res?.content) {
      res.content = res.content.map((b) => ({
        ...b,
        items: b.items ?? [],
      }));
    }
    return res;
  },
  booking: async (id: string): Promise<AdminBooking> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await api<any>(`/admin/bookings/${id}`);
    if (raw && typeof raw === "object" && "booking" in raw && raw.booking) {
      return {
        ...raw.booking,
        ...raw,
        items: raw.items ?? [],
        history: raw.history ?? [],
      };
    }
    return {
      ...raw,
      items: raw?.items ?? [],
      history: raw?.history ?? [],
    };
  },

  motorbikes: async (q: { status?: MotorbikeStatus; q?: string; page?: number; size?: number }) => {
    const res = await api<Page<AdminMotorbike>>("/admin/motorbikes", { query: { size: 20, ...q } });
    if (res?.content) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res.content = res.content.map((m: any) => ({
        ...m,
        photoUrl: m.photoUrl || m.primaryPhotoUrl || m.imageUrl || undefined,
      }));
    }
    return res;
  },

  users: (q: { role?: Role; active?: boolean; q?: string; page?: number; size?: number }) =>
    api<Page<AdminUser>>("/admin/users", { query: { size: 20, ...q } }),
  suspendUser: (id: string, reason: string) =>
    api<AdminUser>(`/admin/users/${id}/suspend`, { method: "POST", body: { reason } }),
  reactivateUser: (id: string) => api<AdminUser>(`/admin/users/${id}/reactivate`, { method: "POST" }),

  report: (period: ReportPeriod, from?: string, to?: string) =>
    api<PlatformReport>("/admin/reports", { query: { period, from, to } }),

  auditLogs: (q: { action?: AuditAction; q?: string; page?: number; size?: number }) =>
    api<Page<AuditLogEntry>>("/admin/audit-logs", { query: { size: 25, ...q } }),

  blogPosts: (q: { status?: BlogStatus; page?: number; size?: number }) =>
    api<Page<BlogPost>>("/admin/blog/posts", { query: { size: 20, ...q } }),
  createPost: (body: BlogPostInput) => api<BlogPost>("/admin/blog/posts", { method: "POST", body }),
  updatePost: (id: string, body: Partial<BlogPostInput>) =>
    api<BlogPost>(`/admin/blog/posts/${id}`, { method: "PATCH", body }),
  publishPost: (id: string) => api<BlogPost>(`/admin/blog/posts/${id}/publish`, { method: "POST" }),
  unpublishPost: (id: string) => api<BlogPost>(`/admin/blog/posts/${id}/unpublish`, { method: "POST" }),
};
