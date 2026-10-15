"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Ban, CheckCircle2, ImageOff, Loader2, MapPin, Phone, RotateCcw, Star, XCircle } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { adminApi, publicApi } from "@/lib/api/endpoints";
import type { AdminShop } from "@/lib/api/types";
import { formatDate, shortId } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/common/status-badge";
import { ErrorState } from "@/components/common/states";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type ReasonAction = "reject" | "suspend";

export function ShopDetailSheet({
  shopId,
  onOpenChange,
}: {
  shopId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const qc = useQueryClient();
  const [reasonFor, setReasonFor] = useState<ReasonAction | null>(null);
  const [reason, setReason] = useState("");
  const [confirmVerify, setConfirmVerify] = useState(false);

  const shop = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => adminApi.shop(shopId!),
    enabled: !!shopId,
  });
  const photos = useQuery({
    queryKey: ["shop-photos", shopId],
    queryFn: () => publicApi.shopPhotos(shopId!),
    enabled: !!shopId,
  });
  const reviews = useQuery({
    queryKey: ["shop-reviews", shopId],
    queryFn: () => publicApi.shopReviews(shopId!, 0, 5),
    enabled: !!shopId,
  });

  const onDone = (msg: string) => (updated: AdminShop) => {
    qc.setQueryData(["shop", updated.id], updated);
    qc.invalidateQueries({ queryKey: ["shops"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    toast.success(msg);
  };
  const onError = (e: unknown) => toast.error(e instanceof ApiError ? `${e.message} (${e.code})` : String(e));

  const verify = useMutation({ mutationFn: adminApi.verify, onSuccess: onDone(t("shops.verified")), onError });
  const reactivate = useMutation({
    mutationFn: adminApi.reactivate,
    onSuccess: onDone(t("shops.reactivated")),
    onError,
  });
  const withReason = useMutation({
    mutationFn: ({ action, id, reason }: { action: ReasonAction; id: string; reason: string }) =>
      action === "reject" ? adminApi.reject(id, reason) : adminApi.suspend(id, reason),
    onSuccess: (s, v) => {
      onDone(v.action === "reject" ? t("shops.rejected") : t("shops.suspended"))(s);
      setReasonFor(null);
      setReason("");
    },
    onError,
  });

  const s = shop.data;
  const busy = verify.isPending || reactivate.isPending || withReason.isPending;

  return (
    <Sheet open={!!shopId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b p-5">
          <SheetDescription>{t("shops.detail")}</SheetDescription>
          {s ? (
            <div className="flex items-start justify-between gap-3">
              <SheetTitle className="font-heading text-xl">{s.name}</SheetTitle>
              <StatusBadge status={s.status} ns="shops" />
            </div>
          ) : (
            <SheetTitle>
              <Skeleton className="h-6 w-40" />
            </SheetTitle>
          )}
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-11rem)]">
          {shop.isError ? (
            <ErrorState error={shop.error} onRetry={() => shop.refetch()} />
          ) : !s ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="space-y-6 p-5">
              {/* Photos */}
              <section>
                <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {t("shops.photos")}
                </h3>
                {photos.isLoading ? (
                  <Skeleton className="h-28 w-full" />
                ) : photos.data?.length ? (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.data.slice(0, 6).map((p, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={p.id}
                        src={p.imageUrl ?? p.url}
                        alt=""
                        className={cn(
                          "aspect-square w-full rounded-xl bg-muted object-cover",
                          i === 0 && "col-span-2 row-span-2",
                        )}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                    <ImageOff className="size-4" /> {t("shops.noPhotos")}
                  </div>
                )}
              </section>

              {/* Facts */}
              <section className="grid gap-3 text-sm">
                <Fact icon={Phone} label={t("shops.contact")} value={s.phone} />
                <Fact icon={MapPin} label={t("shops.address")} value={[s.address, s.city].filter(Boolean).join(", ")} />
                <div className="grid grid-cols-2 gap-3">
                  <Mini label={t("shops.col.applied")} value={formatDate(s.createdAt, lng)} />
                  <Mini label={t("shops.verifiedAt")} value={formatDate(s.verifiedAt, lng, true)} />
                  <Mini label={t("shops.col.cancellations")} value={String(s.cancellationCount ?? 0)} />
                  <Mini label={t("shops.col.visible")} value={s.visibleInSearch ? t("common.yes") : t("common.no")} />
                </div>
                {s.rejectionReason && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
                    <p className="text-xs font-medium text-destructive">{t("shops.rejectionReason")}</p>
                    <p className="mt-1">{s.rejectionReason}</p>
                  </div>
                )}
              </section>

              <Separator />
              <PayoutForm key={`${s.id}:${s.paymentSetupComplete}:${s.payoutSharePercent}`} shop={s} />
              <Separator />

              {/* Reviews */}
              <section>
                <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {t("shops.reviews")}
                </h3>
                {reviews.data?.content.length ? (
                  <ul className="space-y-2">
                    {reviews.data.content.map((r) => (
                      <li key={r.id} className="rounded-xl bg-muted/50 p-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">{r.customerName}</span>
                          <span className="flex items-center gap-0.5 text-amber-500">
                            <Star className="size-3 fill-current" /> {r.rating}
                          </span>
                        </div>
                        {r.comment && <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("common.empty")}</p>
                )}
              </section>
              <p className="font-mono text-[11px] text-muted-foreground">ID {shortId(s.id)}</p>
            </div>
          )}
        </ScrollArea>

        {/* Actions depend on the shop's lifecycle */}
        {s && (
          <div className="flex flex-wrap gap-2 border-t bg-background p-4">
            {(s.status === "PENDING" || s.status === "REJECTED") && (
              <Button onClick={() => setConfirmVerify(true)} disabled={busy} className="flex-1">
                <CheckCircle2 /> {t("shops.verify")}
              </Button>
            )}
            {s.status === "PENDING" && (
              <Button variant="outline" onClick={() => setReasonFor("reject")} disabled={busy} className="flex-1">
                <XCircle /> {t("shops.reject")}
              </Button>
            )}
            {s.status === "VERIFIED" && (
              <Button variant="destructive" onClick={() => setReasonFor("suspend")} disabled={busy} className="flex-1">
                <Ban /> {t("shops.suspend")}
              </Button>
            )}
            {s.status === "SUSPENDED" && (
              <Button onClick={() => reactivate.mutate(s.id)} disabled={busy} className="flex-1">
                {reactivate.isPending ? <Loader2 className="animate-spin" /> : <RotateCcw />} {t("shops.reactivate")}
              </Button>
            )}
          </div>
        )}
      </SheetContent>

      {/* Approve confirmation */}
      <AlertDialog open={confirmVerify} onOpenChange={setConfirmVerify}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("shops.verify")}</AlertDialogTitle>
            <AlertDialogDescription>{t("shops.verifyConfirm", { name: s?.name })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => s && verify.mutate(s.id)}>{t("common.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject / suspend need a reason the owner can read */}
      <Dialog open={!!reasonFor} onOpenChange={(o) => !o && setReasonFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reasonFor === "reject"
                ? t("shops.rejectTitle", { name: s?.name })
                : t("shops.suspendTitle", { name: s?.name })}
            </DialogTitle>
            {reasonFor === "suspend" && <DialogDescription>{t("shops.suspendHint")}</DialogDescription>}
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">{t("common.reason")}</Label>
            <Textarea
              id="reason"
              rows={4}
              maxLength={255}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("common.reasonPlaceholder")}
            />
            <p className="text-right text-[11px] text-muted-foreground tabular">{reason.length}/255</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonFor(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={!reason.trim() || withReason.isPending}
              onClick={() => s && reasonFor && withReason.mutate({ action: reasonFor, id: s.id, reason: reason.trim() })}
            >
              {withReason.isPending && <Loader2 className="animate-spin" />}
              {reasonFor === "reject" ? t("shops.reject") : t("shops.suspend")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}

function PayoutForm({ shop }: { shop: AdminShop }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [complete, setComplete] = useState(shop.paymentSetupComplete);
  const [share, setShare] = useState(shop.payoutSharePercent != null ? String(shop.payoutSharePercent) : "90.00");

  const shareNum = Number(share);
  const invalid = share.trim() === "" || Number.isNaN(shareNum) || shareNum < 0 || shareNum > 100;
  const dirty = complete !== shop.paymentSetupComplete || String(shop.payoutSharePercent ?? "") !== share;

  const save = useMutation({
    mutationFn: () => adminApi.payout(shop.id, { paymentSetupComplete: complete, payoutSharePercent: shareNum }),
    onSuccess: (updated) => {
      qc.setQueryData(["shop", updated.id], updated);
      qc.invalidateQueries({ queryKey: ["shops"] });
      toast.success(t("shops.payoutUpdated"));
    },
    onError: (e) => toast.error(e instanceof ApiError ? `${e.message} (${e.code})` : String(e)),
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("shops.payoutSetup")}</h3>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px]",
            shop.payoutEnabled ? "bg-success/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground",
          )}
        >
          {t("shops.payoutEnabled")}: {shop.payoutEnabled ? t("common.yes") : t("common.no")}
        </span>
      </div>
      <label className="flex items-start justify-between gap-4 rounded-xl border p-3">
        <span>
          <span className="block text-sm font-medium">{t("shops.paymentSetupComplete")}</span>
          <span className="block text-xs text-muted-foreground">{t("shops.paymentSetupHint")}</span>
        </span>
        <Switch checked={complete} onCheckedChange={setComplete} />
      </label>
      <div className="space-y-1.5">
        <Label htmlFor="share">{t("shops.sharePercent")}</Label>
        <Input
          id="share"
          inputMode="decimal"
          value={share}
          onChange={(e) => setShare(e.target.value)}
          aria-invalid={invalid}
          className="tabular"
        />
        <p className="text-xs text-muted-foreground">{t("shops.sharePercentHint")}</p>
      </div>
      <Button onClick={() => save.mutate()} disabled={!dirty || invalid || save.isPending} size="sm">
        {save.isPending && <Loader2 className="animate-spin" />} {t("common.save")}
      </Button>
    </section>
  );
}

function Fact({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-words">{value || "—"}</p>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}
