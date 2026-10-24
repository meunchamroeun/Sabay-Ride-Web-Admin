"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Bell, BellRing, CheckCheck, CheckCircle2, TriangleAlert } from "lucide-react";
import { adminApi, notificationsApi } from "@/lib/api/endpoints";
import type { AppNotification } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
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

/**
 * Top-bar notifications from GET /notifications (FR-16). The SRS (§10) sends the administrator
 * one event, "payout failed". The failed-payout count from /admin/payouts stays underneath as
 * the FR-79 flag, so a failure is never missed even if no notification was sent for it.
 */
export function NotificationBell() {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const router = useRouter();
  const qc = useQueryClient();

  const feed = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(0, 10),
    refetchInterval: 60_000,
  });
  const failed = useQuery({
    queryKey: ["payouts", "FAILED", 0, 1],
    queryFn: () => adminApi.payouts("FAILED", 0, 1),
    refetchInterval: 60_000,
  });

  const items = feed.data?.content ?? [];
  const unread = feed.data?.unreadCount ?? items.filter(isUnread).length;
  const failedTotal = failed.data?.totalElements ?? 0;
  // Without the feed (older API), fall back to the failed-payout flag for the badge.
  const badge = feed.isError ? failedTotal : unread;

  const refresh = () => qc.invalidateQueries({ queryKey: ["notifications"] });
  const markRead = useMutation({ mutationFn: notificationsApi.markRead, onSettled: refresh });
  const markAll = useMutation({ mutationFn: notificationsApi.markAllRead, onSettled: refresh });

  function open(n: AppNotification) {
    if (isUnread(n)) markRead.mutate(n.id);
    const href = notificationHref(n);
    if (href) router.push(href);
  }

  const empty = !feed.isLoading && items.length === 0 && failedTotal === 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="relative overflow-visible" aria-label={t("notify.title")}>
          <BellRing className="size-5 stroke-[1.75]" />
          {badge > 0 && (
            // Sits on the bell's top-right corner so the bell itself stays visible.
            <span className="pointer-events-none absolute -top-1 -right-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-sidebar-badge px-1 text-[10px] leading-none font-bold text-white ring-2 ring-background tabular-nums">
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between gap-2 px-4 py-3">
          <span className="font-heading text-sm font-semibold">{t("notify.title")}</span>
          {unread > 0 && (
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
        <DropdownMenuSeparator className="m-0" />

        <div className="max-h-96 overflow-y-auto p-1.5">
          {empty && (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-300" />
              <p className="text-sm text-muted-foreground">{t("notify.empty")}</p>
            </div>
          )}

          {items.map((n) => {
            const { title, body } = notificationText(n);
            const unseen = isUnread(n);
            const date = notificationDate(n);
            return (
              <DropdownMenuItem
                key={n.id}
                onSelect={() => open(n)}
                className={cn("items-start gap-3 rounded-lg p-2.5", unseen && "bg-primary/[0.04]")}
              >
                <Icon tone={isPayoutEvent(n) ? "danger" : "info"}>{isPayoutEvent(n) ? <TriangleAlert /> : <Bell />}</Icon>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm", unseen ? "font-semibold" : "font-medium")}>
                    {title ?? body ?? t("notify.untitled")}
                  </span>
                  {title && body && <span className="line-clamp-2 block text-xs text-muted-foreground">{body}</span>}
                  {date && <span className="block text-[11px] text-muted-foreground">{formatDate(date, lng, true)}</span>}
                </span>
                {unseen && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-sidebar-badge" aria-label={t("notify.unread")} />}
              </DropdownMenuItem>
            );
          })}
        </div>

        {failedTotal > 0 && (
          <>
            <DropdownMenuSeparator className="m-0" />
            <div className="p-1.5">
              <DropdownMenuItem asChild className="gap-2 rounded-lg text-xs font-medium text-destructive">
                <Link href="/payouts">
                  <TriangleAlert className="size-3.5" /> {t("notify.allPayouts", { count: failedTotal })}
                </Link>
              </DropdownMenuItem>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Icon({ tone, children }: { tone: "danger" | "info"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg [&_svg]:size-4",
        tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
      )}
    >
      {children}
    </span>
  );
}
