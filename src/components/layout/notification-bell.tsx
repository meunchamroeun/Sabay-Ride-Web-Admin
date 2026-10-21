"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BellRing, CheckCircle2, TriangleAlert } from "lucide-react";
import { adminApi } from "@/lib/api/endpoints";
import { formatDate, formatUsd } from "@/lib/format";
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
 * Top-bar alerts. The SRS (§10) notifies the administrator of one event only: a payout that
 * still failed after its automatic retries (FR-79). The API has no notification feed, so the
 * list is built from GET /admin/payouts?status=FAILED and refreshed every minute.
 */
export function NotificationBell() {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const payouts = useQuery({
    queryKey: ["payouts", "FAILED", 0, 5],
    queryFn: () => adminApi.payouts("FAILED", 0, 5),
    refetchInterval: 60_000,
  });

  const total = payouts.data?.totalElements ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="relative overflow-visible" aria-label={t("notify.title")}>
          <BellRing className="size-5 stroke-[1.75]" />
          {total > 0 && (
            // Sits on the bell's top-right corner so the bell itself stays visible.
            <span className="pointer-events-none absolute -top-1 -right-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-sidebar-badge px-1 text-[10px] leading-none font-bold text-white ring-2 ring-background tabular-nums">
              {total > 9 ? "9+" : total}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
          <span className="font-heading text-sm font-semibold">{t("notify.title")}</span>
          {total > 0 && (
            <span className="rounded-full bg-sidebar-badge/15 px-2 py-0.5 text-[11px] font-semibold text-orange-600 dark:text-orange-300">
              {t("notify.count", { count: total })}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />

        <div className="max-h-96 overflow-y-auto p-1.5">
          {total === 0 && !payouts.isLoading && (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-300" />
              <p className="text-sm text-muted-foreground">{t("notify.empty")}</p>
            </div>
          )}

          {payouts.data?.content.map((p) => (
            <DropdownMenuItem key={p.paymentId} asChild className="items-start gap-3 rounded-lg p-2.5">
              <Link href="/payouts">
                <Icon tone="danger">
                  <TriangleAlert />
                </Icon>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{t("notify.payoutFailed", { amount: formatUsd(p.amount, lng) })}</span>
                  <span className="block truncate text-xs text-muted-foreground">{p.shopName}</span>
                  <span className="block text-[11px] text-muted-foreground">{formatDate(p.createdAt, lng, true)}</span>
                </span>
              </Link>
            </DropdownMenuItem>
          ))}

        </div>

        {total > 0 && (
          <>
            <DropdownMenuSeparator className="m-0" />
            <div className="p-1.5">
              <DropdownMenuItem asChild className="justify-center rounded-lg text-xs font-medium">
                <Link href="/payouts">{t("notify.allPayouts", { count: total })}</Link>
              </DropdownMenuItem>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Icon({ tone, children }: { tone: "danger" | "warning"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg [&_svg]:size-4",
        tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-amber-700 dark:text-amber-300",
      )}
    >
      {children}
    </span>
  );
}
