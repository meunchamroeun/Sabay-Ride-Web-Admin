"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ChevronRight, MessageSquareReply, Star, Store } from "lucide-react";
import type { Review } from "@/lib/api/types";
import { adminApi } from "@/lib/api/endpoints";
import { formatDate, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/page-header";
import { Pager } from "@/components/common/pager";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReviewDetailSheet, Stars } from "./review-detail-sheet";

const PAGE_SIZE = 12;

export default function ReviewsPage() {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<Review | null>(null);
  const query = useQuery({
    queryKey: ["reviews", page, PAGE_SIZE],
    queryFn: () => adminApi.reviews(page, PAGE_SIZE),
    refetchInterval: 3_000,
  });

  const list = query.data?.content ?? [];
  const avg = list.length ? list.reduce((a, r) => a + r.rating, 0) / list.length : 0;

  return (
    <>
      <PageHeader
        title={t("reviews.title")}
        subtitle={t("reviews.subtitle")}
        actions={
          list.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2">
              <Star className="size-4 fill-amber-400 text-amber-400" />
              <span className="font-heading text-lg font-semibold tabular">{avg.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">{t("reviews.average")}</span>
            </div>
          )
        }
      />

      {query.isError ? (
        <Card>
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {query.isLoading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
            {list.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <button
                  type="button"
                  onClick={() => setOpen(r)}
                  aria-label={`${t("reviews.open")}: ${r.customerName}`}
                  className="group flex h-full w-full flex-col gap-3 rounded-xl border bg-card p-5 text-left shadow-xs transition-[border-color,box-shadow,translate] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="size-10 shrink-0">
                      {(r.customerAvatarUrl || r.avatarUrl || r.photoUrl) && (
                        <AvatarImage src={r.customerAvatarUrl || r.avatarUrl || r.photoUrl} alt={r.customerName} className="object-cover" />
                      )}
                      <AvatarFallback className="bg-accent text-xs text-accent-foreground">{initials(r.customerName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-medium break-words" title={r.customerName}>
                        {r.customerName}
                      </p>
                      <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground" title={r.shopName}>
                        <Store className="mt-px size-3.5 shrink-0" />
                        <span className="line-clamp-2 break-words">{r.shopName}</span>
                      </p>
                    </div>
                    <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground/50 transition-[translate,color] group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                  <p className={cn("line-clamp-3 flex-1 text-sm leading-relaxed", !r.comment && "text-muted-foreground italic")}>
                    {r.comment || t("reviews.noComment")}
                  </p>
                  {r.shopReply && (
                    <p className="flex items-start gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
                      <MessageSquareReply className="mt-px size-3.5 shrink-0" />
                      <span className="line-clamp-2">{r.shopReply}</span>
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2 border-t pt-3">
                    <Stars rating={r.rating} />
                    <span className="text-[11px] text-muted-foreground">{formatDate(r.createdAt, i18n.language)}</span>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
          {query.data && list.length === 0 && (
            <Card>
              <EmptyState />
            </Card>
          )}
          <ReviewDetailSheet review={open} onClose={() => setOpen(null)} />
          {query.data && query.data.totalElements > PAGE_SIZE && (
            <Card className="py-0">
              <Pager page={page} size={PAGE_SIZE} total={query.data.totalElements} onChange={setPage} />
            </Card>
          )}
        </>
      )}
    </>
  );
}
