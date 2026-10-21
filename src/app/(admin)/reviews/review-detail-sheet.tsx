"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { CalendarClock, Hash, Store, UserRound } from "lucide-react";
import type { Review } from "@/lib/api/types";
import { formatDate, initials, shortId } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/** Full review, read-only (FR-38: administrators view reviews; nobody can edit or hide them). */
export function ReviewDetailSheet({ review, onClose }: { review: Review | null; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const r = review;

  return (
    <Sheet open={!!r} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b p-5">
          <SheetDescription>{t("reviews.detail")}</SheetDescription>
          <SheetTitle className="flex items-center gap-3 font-heading text-xl">
            <Avatar className="size-11">
              <AvatarFallback className="bg-accent text-sm text-accent-foreground">{initials(r?.customerName)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 break-words">{r?.customerName}</span>
          </SheetTitle>
        </SheetHeader>

        {r && (
          <div className="flex-1 space-y-6 overflow-y-auto p-5">
            <div className="flex items-center gap-3">
              <Stars rating={r.rating} className="size-6" />
              <span className="font-heading text-lg font-semibold tabular">{r.rating}/5</span>
            </div>

            <blockquote
              className={cn(
                "rounded-xl border-l-4 border-amber-400 bg-muted/50 p-4 text-[15px] leading-relaxed whitespace-pre-wrap",
                !r.comment && "text-muted-foreground italic",
              )}
            >
              {r.comment || t("reviews.noComment")}
            </blockquote>

            <dl className="grid gap-3 text-sm">
              <Fact icon={Store} label={t("reviews.col.shop")} value={r.shopName} />
              <Fact icon={UserRound} label={t("reviews.col.customer")} value={r.customerName} />
              <Fact icon={CalendarClock} label={t("reviews.col.date")} value={formatDate(r.createdAt, lng, true)} />
              <Fact icon={Hash} label={t("reviews.booking")} value={`#${shortId(r.bookingId)}`} mono />
            </dl>

            <p className="text-xs text-muted-foreground">{t("reviews.readOnly")}</p>
          </div>
        )}

        {r && (
          <div className="border-t p-4">
            <Button asChild variant="outline" className="w-full">
              <Link href={`/shops?open=${r.shopId}`} onClick={onClose}>
                <Store /> {t("reviews.viewShop")}
              </Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className="flex shrink-0 gap-0.5 text-amber-400" role="img" aria-label={`${rating}/5`}>
      {Array.from({ length: 5 }).map((_, k) => (
        <svg key={k} viewBox="0 0 24 24" className={cn("size-3.5", k < rating ? "fill-current" : "fill-current opacity-20", className)}>
          <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
        </svg>
      ))}
    </span>
  );
}

function Fact({ icon: Icon, label, value, mono }: { icon: React.ElementType; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className={cn("break-words", mono && "font-mono text-xs")}>{value}</dd>
      </div>
    </div>
  );
}
