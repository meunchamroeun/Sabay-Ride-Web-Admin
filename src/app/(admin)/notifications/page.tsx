"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  CheckCheck,
  CheckCircle2,
  ExternalLink,
  RotateCw,
  Search,
  Store,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { adminApi, notificationsApi, opsApi } from "@/lib/api/endpoints";
import type { AppNotification } from "@/lib/api/types";
import { formatDate, formatUsd } from "@/lib/format";
import { isPayoutEvent, isUnread, notificationDate, notificationHref, notificationText } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

type TabType = "ALL" | "SHOPS" | "PAYOUTS" | "BOOKINGS" | "SYSTEM";

export default function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabType>("ALL");
  const [q, setQ] = useState("");

  // Queries
  const feed = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(0, 50),
    refetchInterval: 3_000,
  });

  const pendingShops = useQuery({
    queryKey: ["shops", "PENDING", 0, 50],
    queryFn: () => adminApi.shops("PENDING", 0, 50),
    refetchInterval: 3_000,
  });

  const failedPayouts = useQuery({
    queryKey: ["payouts", "FAILED", 0, 50],
    queryFn: () => adminApi.payouts("FAILED", 0, 50),
    refetchInterval: 3_000,
  });

  const pendingBookings = useQuery({
    queryKey: ["admin-bookings", "PENDING", 0, 50],
    queryFn: () => opsApi.bookings({ status: "PENDING", page: 0, size: 50 }),
    refetchInterval: 3_000,
  });

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["shops", "PENDING"] });
    qc.invalidateQueries({ queryKey: ["payouts", "FAILED"] });
    qc.invalidateQueries({ queryKey: ["admin-bookings", "PENDING"] });
  };

  const markRead = useMutation({ mutationFn: notificationsApi.markRead, onSettled: refreshAll });
  const markAll = useMutation({ mutationFn: notificationsApi.markAllRead, onSettled: refreshAll });

  // Map to unified notifications
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
      body: `${s.name} (${s.city}) · Contact: ${s.phone}`,
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

  const filtered = useMemo(() => {
    let list = allItems;
    if (tab === "SHOPS") list = list.filter((i) => i.source === "shop");
    else if (tab === "PAYOUTS") list = list.filter((i) => i.source === "payout");
    else if (tab === "BOOKINGS") list = list.filter((i) => i.source === "booking");
    else if (tab === "SYSTEM") list = list.filter((i) => i.source === "in_app");

    if (q.trim()) {
      const query = q.toLowerCase().trim();
      list = list.filter((i) => i.title.toLowerCase().includes(query) || i.body?.toLowerCase().includes(query));
    }
    return list;
  }, [allItems, tab, q]);

  const unreadInApp = feed.data?.unreadCount ?? inAppItems.filter((i) => i.unread).length;
  const isFetching = feed.isFetching || pendingShops.isFetching || failedPayouts.isFetching || pendingBookings.isFetching;

  function onItemClick(item: UnifiedNotification) {
    if (item.source === "in_app" && item.raw && isUnread(item.raw)) {
      markRead.mutate(item.raw.id);
    }
    if (item.href) router.push(item.href);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("notify.title")}
        subtitle="Real-time alert center for all platform activity, requests from the mobile app, and system events."
        actions={
          <div className="flex items-center gap-2">
            {unreadInApp > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
              >
                <CheckCheck className="size-3.5" />
                {t("notify.markAll")}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={refreshAll} disabled={isFetching}>
              <RotateCw className={cn("size-3.5", isFetching && "animate-spin")} />
              {t("common.refresh")}
            </Button>
          </div>
        }
      />

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabType)}>
            <TabsList>
              <TabsTrigger value="ALL" className="gap-1.5">
                {t("notify.filterAll")}
                {allItems.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">
                    {allItems.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="SHOPS" className="gap-1.5">
                <Store className="size-3.5" />
                {t("notify.filterShops")}
                {shopItems.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-warning/20 text-amber-700 dark:text-amber-300">
                    {shopItems.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="PAYOUTS" className="gap-1.5">
                <Wallet className="size-3.5" />
                {t("notify.filterPayouts")}
                {payoutItems.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-destructive/15 text-destructive">
                    {payoutItems.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="BOOKINGS" className="gap-1.5">
                <CalendarCheck className="size-3.5" />
                {t("notify.filterBookings")}
                {bookingItems.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary">
                    {bookingItems.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="SYSTEM" className="gap-1.5">
                <Bell className="size-3.5" />
                {t("notify.filterSystem")}
                {inAppItems.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">
                    {inAppItems.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative sm:w-64">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("common.search")}
              className="pl-9"
            />
          </div>
        </div>

        <div className="divide-y">
          {filtered.length === 0 ? (
            <div className="p-8">
              <EmptyState title={t("notify.empty")} />
            </div>
          ) : (
            filtered.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                onClick={() => onItemClick(item)}
                className={cn(
                  "flex items-start gap-4 p-4 transition-colors hover:bg-muted/50 cursor-pointer",
                  item.unread && "bg-primary/[0.02]"
                )}
              >
                <div
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-xl",
                    item.tone === "danger"
                      ? "bg-destructive/10 text-destructive"
                      : item.tone === "warning"
                      ? "bg-warning/20 text-amber-600 dark:text-amber-400"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  {item.source === "shop" ? (
                    <Store className="size-5" />
                  ) : item.source === "payout" ? (
                    <TriangleAlert className="size-5" />
                  ) : item.source === "booking" ? (
                    <CalendarCheck className="size-5" />
                  ) : (
                    <Bell className="size-5" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-sm", item.unread ? "font-semibold" : "font-medium")}>
                        {item.title}
                      </p>
                      {item.unread && (
                        <span className="size-2 rounded-full bg-sidebar-badge shrink-0" />
                      )}
                    </div>
                    {item.date && (
                      <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                        {formatDate(item.date, lng, true)}
                      </span>
                    )}
                  </div>

                  {item.body && (
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed break-words">
                      {item.body}
                    </p>
                  )}
                </div>

                <div className="shrink-0 self-center">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-primary">
                    <span>{t("common.view")}</span>
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
