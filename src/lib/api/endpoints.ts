import { api } from "./client";
import { tokenStore } from "./token-store";
import type {
  AdminDashboard,
  AdminShop,
  AuthTokens,
  Page,
  PaymentStatus,
  PayoutRow,
  Photo,
  Profile,
  Review,
  ShopStatus,
} from "./types";

/* Authentication — open endpoints */
export const authApi = {
  async login(identifier: string, password: string) {
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
    if (s) {
      await api<void>("/auth/logout", { method: "POST", auth: false, body: { refreshToken: s.refreshToken } }).catch(
        () => undefined,
      );
    }
  },
  forgot: (phone: string) => api<void>("/auth/password/forgot", { method: "POST", auth: false, body: { phone } }),
};

/* Profile — App and Dashboard */
export const profileApi = {
  me: () => api<Profile>("/users/me"),
  update: (body: Partial<Pick<Profile, "fullName" | "preferredLanguage">>) =>
    api<Profile>("/users/me", { method: "PATCH", body }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api<void>("/users/me/password", { method: "POST", body: { currentPassword, newPassword } }),
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
  payout: (id: string, body: { paymentSetupComplete: boolean; payoutSharePercent?: number }) =>
    api<AdminShop>(`/admin/shops/${id}/payout`, { method: "PATCH", body }),

  payouts: (status: PaymentStatus | undefined, page = 0, size = 20) =>
    api<Page<PayoutRow>>("/admin/payouts", { query: { status, page, size } }),
  retryPayout: (paymentId: string) => api<PayoutRow>(`/admin/payouts/${paymentId}/retry`, { method: "POST" }),

  reviews: (page = 0, size = 20) => api<Page<Review>>("/admin/reviews", { query: { page, size } }),
};

/* Public — used by the shop detail panel */
export const publicApi = {
  shopPhotos: (shopId: string) => api<Photo[]>(`/shops/${shopId}/photos`, { auth: false }),
  shopReviews: (shopId: string, page = 0, size = 5) =>
    api<Page<Review>>(`/shops/${shopId}/reviews`, { auth: false, query: { page, size } }),
};
