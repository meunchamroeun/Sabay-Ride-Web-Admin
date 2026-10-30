"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Bell,
  BellRing,
  CalendarCheck,
  CheckCheck,
  CheckCircle2,
  ExternalLink,
  Store,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { adminApi, notificationsApi, opsApi } from "@/lib/api/endpoints";
import type { AppNotification } from "@/lib/api/types";
import { formatDate, formatUsd } from "@/lib/format";
import { isPayoutEvent, isUnread, notificationDate, notificationHref, notificationText } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface UnifiedNotification {
  id: string;
  source: "in_app" | "shop" | "payout" | "booking";
  title: string;
  body?: string;
  date?: string;
  href: string;
  tone: "info" | "warning" | "danger" | "success";
  unread: boolean;
  raw?: AppNotification;
}

type FilterTab = "ALL" | "SHOPS" | "PAYOUTS" | "BOOKINGS" | "SYSTEM";

/**
 * Top-bar central notifications hub.
 * Gathers:
 * 1. Backend In-app notifications (/api/v1/notifications)
 * 2. Pending Shop verifications (/api/v1/admin/shops?status=PENDING)
 * 3. Failed payouts alerts (/api/v1/admin/payouts?status=FAILED)
 * 4. Pending booking confirmations (/api/v1/admin/bookings?status=PENDING)
 */
export function NotificationBell() {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<FilterTab>("ALL");

  // In-app notifications
  const feed = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(0, 20),
    refetchInterval: 3_000,
  });

  // Pending Shops
  const pendingShops = useQuery({
    queryKey: ["shops", "PENDING", 0, 10],
    queryFn: () => adminApi.shops("PENDING", 0, 10),
    refetchInterval: 3_000,
  });

  // Failed Payouts
  const failedPayouts = useQuery({
    queryKey: ["payouts", "FAILED", 0, 10],
    queryFn: () => adminApi.payouts("FAILED", 0, 10),
    refetchInterval: 3_000,
  });

  // Pending Bookings
  const pendingBookings = useQuery({
    queryKey: ["admin-bookings", "PENDING", 0, 10],
    queryFn: () => opsApi.bookings({ status: "PENDING", page: 0, size: 10 }),
    refetchInterval: 3_000,
  });

  // Build unified items
  const inAppItems = useMemo<UnifiedNotification[]>(() => {
    return (feed.data?.content ?? []).map((n) => {
      const { title, body } = notificationText(n);
      return {
        id: `inapp-${n.id}`,
        source: "in_app",
        title: title ?? body ?? t("notify.untitled"),
        body: title && body ? body : undefined,
        date: notificationDate(n),
        href: notificationHref(n) ?? "/notifications",
        tone: isPayoutEvent(n) ? "danger" : "info",
        unread: isUnread(n),
        raw: n,
      };
    });
  }, [feed.data?.content, t]);

  const shopItems = useMemo<UnifiedNotification[]>(() => {
    return (pendingShops.data?.content ?? []).map((s) => ({
      id: `shop-${s.id}`,
      source: "shop",
      title: t("notify.shopPending"),
      body: `${s.name} (${s.city}) · ${s.phone}`,
      date: s.createdAt,
      href: `/shops?open=${s.id}`,
      tone: "warning",
      unread: true,
    }));
  }, [pendingShops.data?.content, t]);

  const payoutItems = useMemo<UnifiedNotification[]>(() => {
    return (failedPayouts.data?.content ?? []).map((p) => ({
      id: `payout-${p.paymentId}`,
      source: "payout",
      title: t("notify.payoutFailed", { amount: formatUsd(p.amount, lng) }),
      body: `${p.shopName} · ${p.failureReason || t("payouts.status.FAILED")}`,
      date: p.createdAt,
      href: "/payouts",
      tone: "danger",
      unread: true,
    }));
  }, [failedPayouts.data?.content, lng, t]);

  const bookingItems = useMemo<UnifiedNotification[]>(() => {
    return (pendingBookings.data?.content ?? []).map((b) => ({
      id: `booking-${b.id}`,
      source: "booking",
      title: t("notify.bookingPending"),
      body: `${b.customerName} · ${b.bookedModel || b.items?.[0]?.model || "Motorbike"} (${b.shopName})`,
      date: b.createdAt,
      href: `/bookings?open=${b.id}`,
      tone: "info",
      unread: true,
    }));
  }, [pendingBookings.data?.content, t]);

  const allItems = useMemo(() => {
    return [...shopItems, ...payoutItems, ...bookingItems, ...inAppItems].sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });
  }, [shopItems, payoutItems, bookingItems, inAppItems]);

  const filteredItems = useMemo(() => {
    if (tab === "SHOPS") return allItems.filter((i) => i.source === "shop");
    if (tab === "PAYOUTS") return allItems.filter((i) => i.source === "payout");
    if (tab === "BOOKINGS") return allItems.filter((i) => i.source === "booking");
    if (tab === "SYSTEM") return allItems.filter((i) => i.source === "in_app");
    return allItems;
  }, [allItems, tab]);

  // Totals for badge
  const unreadInApp = feed.data?.unreadCount ?? inAppItems.filter((i) => i.unread).length;
  const pendingShopCount = pendingShops.data?.totalElements ?? 0;
  const failedPayoutCount = failedPayouts.data?.totalElements ?? 0;
  const pendingBookingCount = pendingBookings.data?.totalElements ?? 0;

  const totalBadge = unreadInApp + pendingShopCount + failedPayoutCount + pendingBookingCount;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["shops", "PENDING"] });
    qc.invalidateQueries({ queryKey: ["payouts", "FAILED"] });
    qc.invalidateQueries({ queryKey: ["admin-bookings", "PENDING"] });
  };

  const markRead = useMutation({ mutationFn: notificationsApi.markRead, onSettled: refresh });
  const markAll = useMutation({ mutationFn: notificationsApi.markAllRead, onSettled: refresh });

  function open(item: UnifiedNotification) {
    if (item.source === "in_app" && item.raw && isUnread(item.raw)) {
      markRead.mutate(item.raw.id);
    }
    if (item.href) router.push(item.href);
  }

  const empty = allItems.length === 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="relative overflow-visible" aria-label={t("notify.title")}>
          <BellRing className="size-5 stroke-[1.75]" />
          {totalBadge > 0 && (
            <span className="pointer-events-none absolute -top-1 -right-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-sidebar-badge px-1 text-[10px] leading-none font-bold text-white ring-2 ring-background tabular-nums animate-in zoom-in-50">
              {totalBadge > 99 ? "99+" : totalBadge}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-88 sm:w-96 p-0 shadow-lg">
        <DropdownMenuLabel className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="font-heading text-sm font-semibold">{t("notify.title")}</span>
            {totalBadge > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary tabular-nums">
                {totalBadge}
              </span>
            )}
          </div>
          {unreadInApp > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                markAll.mutate();
              }}
              disabled={markAll.isPending}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
            >
              <CheckCheck className="size-3.5" /> {t("notify.markAll")}
            </button>
          )}
        </DropdownMenuLabel>

        {/* Quick Filter Tabs */}
        {allItems.length > 0 && (
          <div className="flex items-center gap-1 border-b px-2 py-1.5 bg-muted/10 overflow-x-auto">
            <TabChip
              active={tab === "ALL"}
              onClick={() => setTab("ALL")}
              label={t("notify.filterAll")}
              count={allItems.length}
            />
            {shopItems.length > 0 && (
              <TabChip
                active={tab === "SHOPS"}
                onClick={() => setTab("SHOPS")}
                label={t("notify.filterShops")}
                count={shopItems.length}
                tone="warning"
              />
            )}
            {payoutItems.length > 0 && (
              <TabChip
                active={tab === "PAYOUTS"}
                onClick={() => setTab("PAYOUTS")}
                label={t("notify.filterPayouts")}
                count={payoutItems.length}
                tone="danger"
              />
            )}
            {bookingItems.length > 0 && (
              <TabChip
                active={tab === "BOOKINGS"}
                onClick={() => setTab("BOOKINGS")}
                label={t("notify.filterBookings")}
                count={bookingItems.length}
                tone="info"
              />
            )}
            {inAppItems.length > 0 && (
              <TabChip
                active={tab === "SYSTEM"}
                onClick={() => setTab("SYSTEM")}
                label={t("notify.filterSystem")}
                count={inAppItems.length}
              />
            )}
          </div>
        )}

        <div className="max-h-96 overflow-y-auto divide-y divide-border/40 p-1">
          {empty && (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <CheckCircle2 className="size-7 text-emerald-600 dark:text-emerald-300" />
              <p className="text-sm font-medium">{t("notify.empty")}</p>
              <p className="text-xs text-muted-foreground">All pending requests and alerts are resolved.</p>
            </div>
          )}

          {filteredItems.map((n) => (
            <DropdownMenuItem
              key={n.id}
              onSelect={() => open(n)}
              className={cn(
                "items-start gap-3 rounded-xl p-3 cursor-pointer transition-colors hover:bg-muted/70",
                n.unread && "bg-primary/[0.04] font-medium"
              )}
            >
              <NotificationIcon source={n.source} tone={n.tone} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className={cn("text-xs leading-snug line-clamp-1", n.unread ? "font-semibold" : "font-medium")}>
                    {n.title}
                  </span>
                  {n.unread && (
                    <span className="size-2 shrink-0 rounded-full bg-sidebar-badge" aria-label={t("notify.unread")} />
                  )}
                </div>
                {n.body && (
                  <span className="line-clamp-2 mt-0.5 block text-xs text-muted-foreground leading-normal break-words">
                    {n.body}
                  </span>
                )}
                {n.date && (
                  <span className="mt-1 block text-[10px] text-muted-foreground/80 tabular-nums">
                    {formatDate(n.date, lng, true)}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </div>

        {/* View all notifications footer */}
        <DropdownMenuSeparator className="m-0" />
        <div className="p-2 bg-muted/20">
          <DropdownMenuItem
            asChild
            className="w-full justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-primary hover:bg-primary/10 cursor-pointer"
          >
            <Link href="/notifications">
              {t("notify.viewAll")} <ArrowRight className="size-3.5" />
            </Link>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TabChip({
  active,
  onClick,
  label,
  count,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone?: "danger" | "warning" | "info";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-2xs"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-1 text-[10px] tabular-nums",
          active
            ? "bg-primary-foreground/20 text-primary-foreground"
            : tone === "danger"
            ? "bg-destructive/15 text-destructive"
            : tone === "warning"
            ? "bg-warning/20 text-amber-700 dark:text-amber-300"
            : "bg-muted text-muted-foreground"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function NotificationIcon({
  source,
  tone,
}: {
  source: UnifiedNotification["source"];
  tone: UnifiedNotification["tone"];
}) {
  const Icon =
    source === "shop"
      ? Store
      : source === "payout"
      ? TriangleAlert
      : source === "booking"
      ? CalendarCheck
      : Bell;

  return (
    <span
      className={cn(
        "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg [&_svg]:size-4",
        tone === "danger"
          ? "bg-destructive/10 text-destructive"
          : tone === "warning"
          ? "bg-warning/20 text-amber-600 dark:text-amber-400"
          : "bg-primary/10 text-primary"
      )}
    >
      <Icon />
    </span>
  );
}
