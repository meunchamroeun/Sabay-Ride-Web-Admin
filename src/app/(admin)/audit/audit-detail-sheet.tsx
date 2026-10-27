"use client";

import { useTranslation } from "react-i18next";
import { BadgeCheck, Calendar, FileText, Globe, Layers, LogIn, Pencil, Plus, Shield, Trash2, User, Wallet } from "lucide-react";
import type { AuditAction, AuditLogEntry } from "@/lib/api/types";
import { formatDate, shortId } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const ACTION_STYLE: Record<AuditAction, { icon: React.ElementType; tone: string }> = {
  CREATE: { icon: Plus, tone: "bg-success/15 text-emerald-700 ring-success/40 dark:text-emerald-300" },
  UPDATE: { icon: Pencil, tone: "bg-chart-5/15 text-sky-700 ring-sky-500/40 dark:text-sky-300" },
  DELETE: { icon: Trash2, tone: "bg-destructive/10 text-destructive ring-destructive/30" },
  LOGIN: { icon: LogIn, tone: "bg-muted text-muted-foreground ring-border" },
  VERIFY: { icon: BadgeCheck, tone: "bg-chart-3/15 text-violet-700 ring-violet-500/40 dark:text-violet-300" },
  PAYOUT: { icon: Wallet, tone: "bg-warning/15 text-amber-700 ring-amber-500/40 dark:text-amber-300" },
};

export function AuditDetailSheet({
  entry,
  onClose,
}: {
  entry: AuditLogEntry | null;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const style = entry ? ACTION_STYLE[entry.action] : null;
  const ActionIcon = style?.icon ?? FileText;

  return (
    <Sheet open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b p-5">
          <SheetDescription>{t("audit.detail")}</SheetDescription>
          {entry && (
            <div className="flex items-start justify-between gap-3">
              <div>
                <SheetTitle className="font-heading text-lg font-bold">
                  {t(`audit.action.${entry.action}`)}
                </SheetTitle>
                <p className="font-mono text-xs text-muted-foreground">ID #{shortId(entry.id)}</p>
              </div>
              {style && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                    style.tone
                  )}
                >
                  <ActionIcon className="size-3.5" />
                  {t(`audit.action.${entry.action}`)}
                </span>
              )}
            </div>
          )}
        </SheetHeader>

        {entry && (
          <ScrollArea className="h-[calc(100vh-6.5rem)]">
            <div className="space-y-6 p-5 text-sm">
              {/* Event Description */}
              <div className="rounded-2xl border bg-muted/30 p-4">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {t("audit.col.description")}
                </span>
                <p className="mt-2 text-sm leading-relaxed font-medium">
                  {entry.description}
                </p>
              </div>

              {/* Event details */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {t("audit.eventDetails")}
                </h3>
                <div className="grid gap-2.5">
                  {/* User */}
                  <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                      <User className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground">{t("audit.col.user")}</p>
                      <p className="font-medium truncate">{entry.userName}</p>
                      {entry.userId && (
                        <p className="font-mono text-[10px] text-muted-foreground">ID: {entry.userId}</p>
                      )}
                    </div>
                  </div>

                  {/* IP Address */}
                  <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                      <Globe className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground">{t("audit.col.ip")}</p>
                      <p className="font-mono text-xs font-medium">{entry.ipAddress}</p>
                    </div>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Target Entity */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {t("audit.targetEntity")}
                </h3>
                <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <Layers className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground">{entry.entityName}</p>
                    <p className="font-mono text-xs font-medium">{entry.entityId}</p>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Timestamp */}
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5" /> {t("audit.col.time")}
                  </span>
                  <span>{formatDate(entry.createdAt, lng, true)}</span>
                </div>
                <p className="font-mono text-[11px]">Entry ID {entry.id}</p>
              </div>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
