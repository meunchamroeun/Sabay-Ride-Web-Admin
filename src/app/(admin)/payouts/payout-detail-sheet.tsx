"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, Calendar, CalendarCheck, RotateCw, ShieldAlert, Store, Wallet } from "lucide-react";
import type { PayoutRow } from "@/lib/api/types";
import { formatDate, formatKhr, formatUsd, shortId } from "@/lib/format";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function PayoutDetailSheet({
  payout,
  onClose,
  onRetry,
  isRetrying,
}: {
  payout: PayoutRow | null;
  onClose: () => void;
  onRetry: (paymentId: string) => void;
  isRetrying?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;

  return (
    <Sheet open={!!payout} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b p-5">
          <SheetDescription>{t("payouts.detail")}</SheetDescription>
          {payout && (
            <div className="flex items-start justify-between gap-3">
              <div>
                <SheetTitle className="font-mono text-lg font-bold">
                  #{shortId(payout.paymentId)}
                </SheetTitle>
                <p className="font-mono text-[11px] text-muted-foreground">ID {payout.paymentId}</p>
              </div>
              <StatusBadge status={payout.status} ns="payouts" />
            </div>
          )}
        </SheetHeader>

        {payout && (
          <ScrollArea className="h-[calc(100vh-6.5rem)]">
            <div className="space-y-6 p-5 text-sm">
              {/* Amount Card */}
              <div className="rounded-2xl border bg-muted/30 p-5 text-center">
                <span className="text-xs text-muted-foreground">{t("payouts.col.amount")}</span>
                <p className="font-heading text-3xl font-bold tabular mt-1">
                  {formatUsd(payout.amount, lng)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("money.khr", { value: formatKhr(payout.amount, lng) })}
                </p>
              </div>

              {/* Failure reason callout if failed */}
              {payout.failureReason && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                  <div className="flex items-center gap-2 text-destructive font-semibold text-xs">
                    <ShieldAlert className="size-4 shrink-0" />
                    <span>{t("payouts.col.reason")}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-destructive/90 leading-relaxed font-mono break-words">
                    {payout.failureReason}
                  </p>
                </div>
              )}

              {/* Payment Details */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {t("payouts.breakdown")}
                </h3>
                <div className="space-y-2.5">
                  {/* Shop */}
                  <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                        <Store className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground">{t("payouts.col.shop")}</p>
                        <p className="truncate font-medium">{payout.shopName}</p>
                      </div>
                    </div>
                  </div>

                  {/* Linked Booking */}
                  <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                        <CalendarCheck className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground">{t("payouts.linkedBooking")}</p>
                        <p className="font-mono text-xs font-medium">#{shortId(payout.bookingId)}</p>
                      </div>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/bookings?open=${payout.bookingId}`}>
                        {t("payouts.viewBooking")} <ArrowUpRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>

                  {/* Attempts */}
                  <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3">
                    <div className="flex items-center gap-3">
                      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                        <RotateCw className="size-4" />
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">{t("payouts.col.attempts")}</p>
                        <p className="font-medium text-xs tabular">{payout.attempts} / 3</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Timestamps */}
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5" /> {t("payouts.col.created")}
                  </span>
                  <span>{formatDate(payout.createdAt, lng, true)}</span>
                </div>
                <p className="font-mono text-[11px]">Booking ID {payout.bookingId}</p>
              </div>

              {/* Retry Action */}
              {payout.status === "FAILED" && (
                <div className="pt-2">
                  <Button
                    variant="default"
                    className="w-full"
                    disabled={isRetrying}
                    onClick={() => onRetry(payout.paymentId)}
                  >
                    <RotateCw className={`size-4 mr-1.5 ${isRetrying ? "animate-spin" : ""}`} />
                    {t("payouts.retryPayout")}
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
