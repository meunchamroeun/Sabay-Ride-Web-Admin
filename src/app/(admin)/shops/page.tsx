"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Check, EyeOff, Eye, Search, Store } from "lucide-react";
import { adminApi } from "@/lib/api/endpoints";
import type { ShopStatus } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { Pager } from "@/components/common/pager";
import { EmptyState, ErrorState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { ShopDetailSheet } from "./shop-detail-sheet";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STATUSES: ShopStatus[] = ["PENDING", "VERIFIED", "SUSPENDED", "REJECTED"];
const PAGE_SIZE = 20;

export default function ShopsPage() {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState<ShopStatus>("PENDING");
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  // Deep link from the dashboard queue: /shops?open=<id>. Admin pages render client-side only
  // (the layout waits for the session), so reading the URL in the initializer is safe.
  const [openId, setOpenId] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get("open"),
  );

  const query = useQuery({
    queryKey: ["shops", status, page],
    queryFn: () => adminApi.shops(status, page, PAGE_SIZE),
  });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = query.data?.content ?? [];
    return term
      ? list.filter((s) => [s.name, s.city, s.phone, s.address].some((v) => v?.toLowerCase().includes(term)))
      : list;
  }, [query.data, q]);

  return (
    <>
      <PageHeader title={t("shops.title")} subtitle={t("shops.subtitle")} />

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={status}
            onValueChange={(v) => {
              setStatus(v as ShopStatus);
              setPage(0);
            }}
          >
            <TabsList className="flex-wrap">
              {STATUSES.map((s) => (
                <TabsTrigger key={s} value={s}>
                  {t(`shops.status.${s}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative sm:w-64">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("common.search")} className="pl-9" />
          </div>
        </div>

        {query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">{t("shops.col.shop")}</TableHead>
                  <TableHead>{t("shops.col.status")}</TableHead>
                  <TableHead>{t("shops.col.payout")}</TableHead>
                  <TableHead>{t("shops.col.visible")}</TableHead>
                  <TableHead className="text-right">{t("shops.col.cancellations")}</TableHead>
                  <TableHead className="pr-4 text-right">{t("shops.col.applied")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6} className="px-4">
                        <Skeleton className="h-9 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {rows.map((s, i) => (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.025 }}
                    onClick={() => setOpenId(s.id)}
                    className="cursor-pointer border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                          <Store className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{s.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {s.city} · {s.phone}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} ns="shops" />
                    </TableCell>
                    <TableCell>
                      {s.paymentSetupComplete ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-300">
                          <Check className="size-3.5" />
                          {s.payoutSharePercent != null ? `${s.payoutSharePercent}%` : t("common.yes")}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{t("common.no")}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {s.visibleInSearch ? (
                        <Eye className="size-4 text-emerald-600 dark:text-emerald-300" />
                      ) : (
                        <EyeOff className="size-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular">{s.cancellationCount ?? 0}</TableCell>
                    <TableCell className="pr-4 text-right text-xs text-muted-foreground">
                      {formatDate(s.createdAt, i18n.language)}
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
            {query.data && rows.length === 0 && (
              <EmptyState title={t("shops.emptyStatus", { status: t(`shops.status.${status}`) })} />
            )}
          </div>
        )}
        {query.data && query.data.totalElements > PAGE_SIZE && (
          <Pager page={page} size={PAGE_SIZE} total={query.data.totalElements} onChange={setPage} />
        )}
      </Card>

      <ShopDetailSheet shopId={openId} onOpenChange={(o) => !o && setOpenId(null)} />
    </>
  );
}
