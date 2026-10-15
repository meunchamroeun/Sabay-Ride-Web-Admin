"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { adminApi } from "@/lib/api/endpoints";
import { formatDate, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/page-header";
import { Pager } from "@/components/common/pager";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 12;

export default function ReviewsPage() {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(0);
  const query = useQuery({ queryKey: ["reviews", page, PAGE_SIZE], queryFn: () => adminApi.reviews(page, PAGE_SIZE) });

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
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-accent text-xs text-accent-foreground">
                          {initials(r.customerName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.customerName}</p>
                        <p className="truncate text-xs text-muted-foreground">→ {r.shopName}</p>
                      </div>
                      <div className="flex shrink-0 gap-0.5 text-amber-400">
                        {Array.from({ length: 5 }).map((_, k) => (
                          <Star key={k} className={cn("size-3.5", k < r.rating ? "fill-current" : "opacity-25")} />
                        ))}
                      </div>
                    </div>
                    <p className={cn("flex-1 text-sm", !r.comment && "text-muted-foreground italic")}>
                      {r.comment || t("reviews.noComment")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{formatDate(r.createdAt, i18n.language)}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          {query.data && list.length === 0 && (
            <Card>
              <EmptyState />
            </Card>
          )}
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
