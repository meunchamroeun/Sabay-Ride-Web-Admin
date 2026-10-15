"use client";

import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  // shops
  PENDING: "bg-warning/15 text-amber-700 ring-warning/40 dark:text-amber-300",
  VERIFIED: "bg-success/15 text-emerald-700 ring-success/40 dark:text-emerald-300",
  REJECTED: "bg-destructive/10 text-destructive ring-destructive/30",
  SUSPENDED: "bg-muted text-muted-foreground ring-border",
  // payments
  PAID: "bg-success/15 text-emerald-700 ring-success/40 dark:text-emerald-300",
  FAILED: "bg-destructive/10 text-destructive ring-destructive/30",
  EXPIRED: "bg-muted text-muted-foreground ring-border",
  REFUNDED: "bg-chart-3/15 text-sky-700 ring-chart-3/30 dark:text-sky-300",
};

export function StatusBadge({ status, ns }: { status: string; ns: "shops" | "payouts" }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        TONE[status] ?? "bg-muted text-muted-foreground ring-border",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {t(`${ns}.status.${status}`, { defaultValue: status })}
    </span>
  );
}
