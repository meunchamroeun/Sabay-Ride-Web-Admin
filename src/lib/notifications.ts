import type { AppNotification } from "@/lib/api/types";

/**
 * GET /notifications does not publish its item schema, so read the usual field names and fall
 * back gracefully: unknown types still show their title/body, and a missing read flag counts as
 * unread only when there is no readAt either.
 */
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

export function isUnread(n: AppNotification): boolean {
  if (typeof n.read === "boolean") return !n.read;
  if (typeof n.isRead === "boolean") return !n.isRead;
  return !n.readAt;
}

export function notificationText(n: AppNotification): { title?: string; body?: string } {
  return {
    title: str(n.title) ?? str(n.subject),
    body: str(n.body) ?? str(n.message) ?? str(n.content) ?? str(n.text),
  };
}

export function notificationDate(n: AppNotification): string | undefined {
  return str(n.createdAt) ?? str(n.sentAt) ?? str(n.timestamp);
}

/** Admin page an event belongs to, from its type or ID. */
export function notificationHref(n: AppNotification): string | undefined {
  if (n.bookingId) return `/bookings?open=${n.bookingId}`;
  if (n.shopId) return `/shops?open=${n.shopId}`;
  const type = `${n.type ?? n.event ?? ""}`.toUpperCase();
  if (type.includes("PAYOUT") || type.includes("PAYMENT")) return "/payouts";
  if (type.includes("SHOP")) return "/shops";
  if (type.includes("BOOKING")) return "/bookings";
  if (type.includes("REVIEW")) return "/reviews";
  if (type.includes("MOTORBIKE")) return "/motorbikes";
  if (type.includes("USER")) return "/users";
  return undefined;
}

export const isPayoutEvent = (n: AppNotification) => notificationHref(n) === "/payouts";
