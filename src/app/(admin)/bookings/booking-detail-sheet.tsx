"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CalendarRange, MapPin, Phone, QrCode, Store, UserRound } from "lucide-react";
import { Motorbike } from "@/components/common/motorbike-icon";
import { opsApi, publicApi } from "@/lib/api/endpoints";
import { formatDate, formatKhr, formatUsd, shortId } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ApiPendingOrError } from "@/components/common/api-pending";
import { StatusBadge } from "@/components/common/status-badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

function MotorbikeItemPhoto({
  motorbikeId,
  photoUrl,
  model,
  onZoom,
}: {
  motorbikeId?: string;
  photoUrl?: string;
  model: string;
  onZoom: (url: string) => void;
}) {
  const [err, setErr] = useState(false);
  const photos = useQuery({
    queryKey: ["motorbike-photos", motorbikeId],
    queryFn: () => publicApi.motorbikePhotos(motorbikeId!),
    enabled: !photoUrl && !!motorbikeId,
    staleTime: 5 * 60 * 1000,
  });

  const src = photoUrl || photos.data?.[0]?.imageUrl || photos.data?.[0]?.url;

  if (src && !err) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={model}
        onError={() => setErr(true)}
        onClick={() => onZoom(src)}
        className="size-11 shrink-0 cursor-zoom-in rounded-lg object-cover ring-1 ring-border/50 bg-muted hover:opacity-90 transition-opacity"
        loading="lazy"
      />
    );
  }

  return (
    <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
      <Motorbike className="size-5" />
    </div>
  );
}

/** Booking detail: items, the money split (SRS §9) and the status history (FR-50). */
export function BookingDetailSheet({ bookingId, onOpenChange }: { bookingId: string | null; onOpenChange: (o: boolean) => void }) {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const q = useQuery({ queryKey: ["admin-booking", bookingId], queryFn: () => opsApi.booking(bookingId!), enabled: !!bookingId });
  const b = q.data;

  const qr = useQuery({
    queryKey: ["booking-qr", bookingId],
    queryFn: () => publicApi.bookingPaymentQr(bookingId!),
    enabled: !!bookingId && b?.paymentOption === "PAY_NOW",
  });

  return (
    <Sheet open={!!bookingId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b p-5">
          <SheetDescription>{t("bookings.detail")}</SheetDescription>
          {b ? (
            <div className="flex items-start justify-between gap-3">
              <SheetTitle className="font-mono text-lg">#{shortId(b.id)}</SheetTitle>
              <StatusBadge status={b.status} ns="bookings" />
            </div>
          ) : (
            <SheetTitle>
              <Skeleton className="h-6 w-32" />
            </SheetTitle>
          )}
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-6.5rem)]">
          {q.isError ? (
            <ApiPendingOrError error={q.error} endpoint="GET /api/v1/admin/bookings/{id}" requirement="FR-38" />
          ) : !b ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <div className="space-y-6 p-5 text-sm">
              <section className="grid gap-3">
                <Fact icon={UserRound} label={t("bookings.col.customer")} value={b.customerName} />
                {b.customerPhone && <Fact icon={Phone} label={t("shops.contact")} value={b.customerPhone} />}
                <Fact icon={Store} label={t("bookings.col.shop")} value={b.shopName} />
                <Fact
                  icon={CalendarRange}
                  label={t("bookings.col.dates")}
                  value={`${formatDate(b.startDate, lng)} → ${formatDate(b.endDate, lng)} · ${t("bookings.days", { count: b.rentalDays })}`}
                />
                <Fact
                  icon={MapPin}
                  label={t("bookings.pickup")}
                  value={b.pickupMethod === "DELIVERY" ? `${t("bookings.delivery")}: ${b.deliveryAddress ?? "—"}` : t("bookings.selfPickup")}
                />
              </section>

              {b.rejectionReason && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <p className="text-xs font-medium text-destructive">{t("shops.rejectionReason")}</p>
                  <p className="mt-1">{b.rejectionReason}</p>
                </div>
              )}

              <section>
                <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("bookings.items")}</h3>
                <ul className="space-y-2">
                  {b.items && b.items.length > 0 ? (
                    b.items.map((it) => (
                      <li key={it.motorbikeId || it.plateNumber || it.model} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                        <MotorbikeItemPhoto
                          motorbikeId={it.motorbikeId}
                          photoUrl={it.photoUrl || it.imageUrl}
                          model={it.model}
                          onZoom={setPreviewPhoto}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{it.model}</p>
                          <p className="text-xs text-muted-foreground">
                            {it.plateNumber} · {formatUsd(it.pricePerDay, lng)} / {t("bookings.day")}
                          </p>
                        </div>
                        <span className="font-medium tabular">{formatUsd(it.lineTotal, lng)}</span>
                      </li>
                    ))
                  ) : (
                    <li className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                      <MotorbikeItemPhoto
                        motorbikeId={b.items?.[0]?.motorbikeId}
                        photoUrl={b.photoUrl || b.imageUrl}
                        model={b.bookedModel || "—"}
                        onZoom={setPreviewPhoto}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{b.bookedModel || "—"}</p>
                      </div>
                      <span className="font-medium tabular">{formatUsd(b.total, lng)}</span>
                    </li>
                  )}
                </ul>
              </section>

              <section className="rounded-xl border p-4">
                <h3 className="mb-3 text-sm font-semibold">{t("bookings.money")}</h3>
                <Row label={t("bookings.subtotal")} value={formatUsd(b.subtotal, lng)} />
                <Row label={t("bookings.deliveryFee")} value={formatUsd(b.deliveryFee, lng)} />
                <Row label={t("bookings.col.total")} value={formatUsd(b.total, lng)} strong khr={formatKhr(b.total, lng)} />
                <Separator className="my-3" />
                <Row label={t("bookings.paymentOption")} value={t(`bookings.payment.${b.paymentOption}`)} />
                <Row label={t("bookings.paidOnline")} value={formatUsd(b.amountOnline, lng)} />
                <Row label={t("bookings.cashAtShop")} value={formatUsd(b.amountCash, lng)} />
                <Row label={t("dashboard.commission")} value={formatUsd(b.commissionAmount, lng)} />
                <Row label={t("bookings.payoutToShop")} value={formatUsd(b.payoutAmount, lng)} />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted-foreground">{t("bookings.payoutStatus")}</span>
                  <StatusBadge status={b.payoutStatus} ns="payouts" />
                </div>

                {qr.data?.qrImageBase64 && (
                  <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <QrCode className="size-4" /> KHQR Payment Code
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        qr.data.qrImageBase64.startsWith("data:")
                          ? qr.data.qrImageBase64
                          : `data:image/png;base64,${qr.data.qrImageBase64}`
                      }
                      alt="KHQR"
                      onClick={() =>
                        setPreviewPhoto(
                          qr.data!.qrImageBase64!.startsWith("data:")
                            ? qr.data!.qrImageBase64!
                            : `data:image/png;base64,${qr.data!.qrImageBase64}`
                        )
                      }
                      className="size-44 cursor-zoom-in rounded-lg bg-white p-2 shadow-xs ring-1 ring-border/50 transition-opacity hover:opacity-95"
                    />
                    {qr.data.transactionRef && (
                      <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                        Ref: {qr.data.transactionRef}
                      </p>
                    )}
                  </div>
                )}
              </section>

              {b.history && b.history.length > 0 && (
                <section>
                  <h3 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("bookings.history")}</h3>
                  <ol className="relative space-y-4 border-l pl-5">
                    {b.history.map((h, i) => (
                      <li key={i} className="relative">
                        <span
                          className={cn(
                            "absolute top-1 -left-[25px] size-2.5 rounded-full ring-4 ring-background",
                            i === b.history!.length - 1 ? "bg-primary" : "bg-muted-foreground/40",
                          )}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={h.status} ns="bookings" />
                          <span className="text-xs text-muted-foreground">{formatDate(h.changedAt, lng, true)}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {h.changedBy ?? t("bookings.system")}
                          {h.note && ` — ${h.note}`}
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
              <p className="font-mono text-[11px] text-muted-foreground">ID {b.id}</p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>

      {/* Photo Lightbox Dialog */}
      <Dialog open={!!previewPhoto} onOpenChange={(o) => !o && setPreviewPhoto(null)}>
        <DialogContent className="max-w-2xl p-2 bg-background/95 backdrop-blur-md">
          {previewPhoto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewPhoto}
              alt="Preview"
              className="max-h-[80vh] w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}

function Fact({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-words">{value}</p>
      </div>
    </div>
  );
}

function Row({ label, value, strong, khr }: { label: string; value: string; strong?: boolean; khr?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-right tabular", strong && "text-base font-semibold")}>
        {value}
        {khr && <span className="block text-[11px] font-normal text-muted-foreground">{t("money.khr", { value: khr })}</span>}
      </span>
    </div>
  );
}
