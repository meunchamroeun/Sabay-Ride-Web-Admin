"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { CheckCircle2, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { adminApi } from "@/lib/api/endpoints";
import type { PaymentStatus, PayoutRow } from "@/lib/api/types";
import { formatDate, formatKhr, formatUsd, shortId } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/page-header";
import { Pager } from "@/components/common/pager";
import { EmptyState, ErrorState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PayoutDetailSheet } from "./payout-detail-sheet";

const FILTERS: (PaymentStatus | "ALL")[] = ["FAILED", "PENDING", "PAID", "ALL"];
const PAGE_SIZE = 20;

export default function PayoutsPage() {
  return (
    <Suspense fallback={null}>
      <PayoutsScreen />
    </Suspense>
  );
}

function PayoutsScreen() {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const [filter, setFilter] = useState<PaymentStatus | "ALL">("FAILED");
  const [page, setPage] = useState(0);
  const status = filter === "ALL" ? undefined : filter;

  const openParam = useSearchParams().get("open");
  const [selectedPayout, setSelectedPayout] = useState<PayoutRow | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["payouts", status ?? "ALL", page, PAGE_SIZE],
    queryFn: () => adminApi.payouts(status, page, PAGE_SIZE),
  });

  const retry = useMutation({
    mutationFn: (paymentId: string) => adminApi.retryPayout(paymentId),
    onSuccess: () => {
      toast.success(t("payouts.retried"));
      query.refetch();
    },
    onError: (e) => toast.error(e instanceof ApiError ? `${e.message} (${e.code})` : String(e)),
  });

  const activePayout =
    selectedPayout ??
    (openParam && openParam !== dismissed
      ? query.data?.content.find((p) => p.paymentId === openParam) ?? null
      : null);

  const closeDetail = () => {
    setSelectedPayout(null);
    if (openParam) setDismissed(openParam);
  };

  return (
    <>
      <PageHeader
        title={t("payouts.title")}
        subtitle={t("payouts.subtitle")}
        actions={
          <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
            <RotateCw className={query.isFetching ? "size-3.5 animate-spin" : "size-3.5"} /> {t("common.refresh")}
          </Button>
        }
      />

      <Card className="gap-0 overflow-hidden py-0">
        <div className="border-b p-3">
          <Tabs
            value={filter}
            onValueChange={(v) => {
              setFilter(v as PaymentStatus | "ALL");
              setPage(0);
            }}
          >
            <TabsList>
              {FILTERS.map((f) => (
                <TabsTrigger key={f} value={f}>
                  {f === "ALL" ? t("payouts.all") : t(`payouts.status.${f}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">{t("payouts.col.shop")}</TableHead>
                  <TableHead>{t("payouts.col.booking")}</TableHead>
                  <TableHead className="text-right">{t("payouts.col.amount")}</TableHead>
                  <TableHead>{t("payouts.col.status")}</TableHead>
                  <TableHead className="text-center">{t("payouts.col.attempts")}</TableHead>
                  <TableHead>{t("payouts.col.reason")}</TableHead>
                  <TableHead>{t("payouts.col.created")}</TableHead>
                  <TableHead className="pr-4 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8} className="px-4">
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {query.data?.content.map((p, i) => (
                  <motion.tr
                    key={p.paymentId}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.025 }}
                    onClick={() => setSelectedPayout(p)}
                    className="cursor-pointer border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="pl-4 font-medium">{p.shopName}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">#{shortId(p.bookingId)}</TableCell>
                    <TableCell className="text-right">
                      <span className="block font-medium tabular">{formatUsd(p.amount, lng)}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {t("money.khr", { value: formatKhr(p.amount, lng) })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} ns="payouts" />
                    </TableCell>
                    <TableCell className="text-center tabular">{p.attempts}</TableCell>
                    <TableCell className="max-w-56">
                      {p.failureReason ? (
                        <Tooltip>
                          <TooltipTrigger className="block max-w-56 truncate text-left text-xs text-destructive">
                            {p.failureReason}
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">{p.failureReason}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                      {formatDate(p.createdAt, lng, true)}
                    </TableCell>
                    <TableCell className="pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                      {p.status === "FAILED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={retry.isPending}
                          onClick={() => retry.mutate(p.paymentId)}
                        >
                          <RotateCw className={cn("mr-1 size-3", retry.isPending && "animate-spin")} />
                          {t("common.retry", { defaultValue: "Retry" })}
                        </Button>
                      )}
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
            {query.data?.content.length === 0 &&
              (filter === "FAILED" ? (
                <EmptyState
                  title={t("payouts.healthy")}
                  icon={<CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-300" />}
                />
              ) : (
                <EmptyState />
              ))}
          </div>
        )}
        {query.data && query.data.totalElements > PAGE_SIZE && (
          <Pager page={page} size={PAGE_SIZE} total={query.data.totalElements} onChange={setPage} />
        )}
      </Card>

      <PayoutDetailSheet
        payout={activePayout}
        onClose={closeDetail}
        onRetry={(id) => retry.mutate(id)}
        isRetrying={retry.isPending}
      />
    </>
  );
}
