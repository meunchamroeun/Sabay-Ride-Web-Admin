"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, Calendar, DollarSign, Gauge, Hash, ImageOff, Layers, Store } from "lucide-react";
import { Motorbike } from "@/components/common/motorbike-icon";
import type { AdminMotorbike } from "@/lib/api/types";
import { formatDate, formatKhr, formatUsd, shortId } from "@/lib/format";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function MotorbikeDetailSheet({
  motorbike,
  onClose,
}: {
  motorbike: AdminMotorbike | null;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;

  return (
    <Sheet open={!!motorbike} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b p-5">
          <SheetDescription>{t("motorbikes.detail")}</SheetDescription>
          {motorbike && (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="truncate font-heading text-lg font-bold">
                  {motorbike.model}
                </SheetTitle>
                <p className="font-mono text-xs text-muted-foreground">
                  {motorbike.brand} · {t("motorbikes.unit")} {motorbike.unitCode}
                </p>
              </div>
              <StatusBadge status={motorbike.status} ns="motorbikes" />
            </div>
          )}
        </SheetHeader>

        {motorbike && (
          <ScrollArea className="h-[calc(100vh-6.5rem)]">
            <div className="space-y-6 p-5 text-sm">
              {/* Photo or Image banner */}
              <div className="overflow-hidden rounded-2xl border bg-muted/30">
                {motorbike.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={motorbike.photoUrl}
                    alt={motorbike.model}
                    className="h-56 w-full object-cover transition-transform hover:scale-105"
                  />
                ) : (
                  <div className="flex h-44 flex-col items-center justify-center gap-2 text-muted-foreground/60">
                    <div className="grid size-12 place-items-center rounded-2xl bg-muted">
                      <ImageOff className="size-6" />
                    </div>
                    <span className="text-xs">{t("motorbikes.noPhoto")}</span>
                  </div>
                )}
              </div>

              {/* Price card */}
              <div className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-2xs">
                <div>
                  <span className="text-xs text-muted-foreground">{t("motorbikes.pricing")}</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-heading text-2xl font-bold tabular">
                      {formatUsd(motorbike.pricePerDay, lng)}
                    </span>
                    <span className="text-xs text-muted-foreground">/{t("bookings.day")}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground font-mono">
                    {t("money.khr", { value: formatKhr(motorbike.pricePerDay, lng) })}
                  </span>
                </div>
              </div>

              {/* Specifications */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {t("motorbikes.specifications")}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <SpecBox
                    icon={Hash}
                    label={t("motorbikes.col.plate")}
                    value={motorbike.plateNumber}
                    mono
                  />
                  <SpecBox
                    icon={Gauge}
                    label={t("motorbikes.engine")}
                    value={`${motorbike.engineCc} cc`}
                  />
                  <SpecBox
                    icon={Layers}
                    label={t("motorbikes.col.type")}
                    value={motorbike.type}
                  />
                  <SpecBox
                    icon={DollarSign}
                    label={t("motorbikes.unit")}
                    value={motorbike.unitCode}
                    mono
                  />
                </div>
              </section>

              <Separator />

              {/* Shop association */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {t("motorbikes.col.shop")}
                </h3>
                <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 p-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Store className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{motorbike.shopName}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        #{shortId(motorbike.shopId)}
                      </p>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/shops?open=${motorbike.shopId}`}>
                      {t("reviews.viewShop")} <ArrowUpRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </section>

              <Separator />

              {/* Metadata */}
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5" /> {t("motorbikes.col.added")}
                  </span>
                  <span>{formatDate(motorbike.createdAt, lng, true)}</span>
                </div>
                <p className="font-mono text-[11px]">ID {motorbike.id}</p>
              </div>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SpecBox({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="truncate">{label}</span>
      </div>
      <p className={`mt-1 font-medium truncate ${mono ? "font-mono text-xs" : "text-sm"}`}>
        {value}
      </p>
    </div>
  );
}
