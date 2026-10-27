"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Info, Search } from "lucide-react";
import { Motorbike } from "@/components/common/motorbike-icon";
import { opsApi } from "@/lib/api/endpoints";
import type { AdminMotorbike, MotorbikeStatus } from "@/lib/api/types";
import { formatDate, formatUsd } from "@/lib/format";
import { useDebounced } from "@/hooks/use-debounced";
import { ApiPendingOrError } from "@/components/common/api-pending";
import { PageHeader } from "@/components/common/page-header";
import { Pager } from "@/components/common/pager";
import { EmptyState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhenApiReady } from "@/components/common/coming-soon";
import { MotorbikeDetailSheet } from "./motorbike-detail-sheet";

const PAGE_SIZE = 20;
const STATUSES: MotorbikeStatus[] = ["ACTIVE", "MAINTENANCE", "INACTIVE"];
type Filter = MotorbikeStatus | "ALL";

export default function MotorbikesPage() {
  return (
    <WhenApiReady feature="motorbikes">
      <Suspense fallback={null}>
        <MotorbikesScreen />
      </Suspense>
    </WhenApiReady>
  );
}

function MotorbikesScreen() {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const [filter, setFilter] = useState<Filter>("ALL");
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const search = useDebounced(q);
  const status = filter === "ALL" ? undefined : filter;

  const openParam = useSearchParams().get("open");
  const [selected, setSelected] = useState<AdminMotorbike | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["admin-motorbikes", status ?? "ALL", search, page, PAGE_SIZE],
    queryFn: () => opsApi.motorbikes({ status, q: search || undefined, page, size: PAGE_SIZE }),
  });

  const activeMotorbike =
    selected ??
    (openParam && openParam !== dismissed
      ? query.data?.content.find((m) => m.id === openParam) ?? null
      : null);

  const closeModal = () => {
    setSelected(null);
    if (openParam) setDismissed(openParam);
  };

  return (
    <>
      <PageHeader
        title={t("motorbikes.title")}
        subtitle={t("motorbikes.subtitle")}
      />

      <div className="flex items-start gap-2 rounded-xl border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        {t("motorbikes.availabilityNote")}
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={filter}
            onValueChange={(v) => {
              setFilter(v as Filter);
              setPage(0);
            }}
          >
            <TabsList>
              <TabsTrigger value="ALL">{t("common.all")}</TabsTrigger>
              {STATUSES.map((s) => (
                <TabsTrigger key={s} value={s}>
                  {t(`motorbikes.status.${s}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative sm:w-72">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder={t("motorbikes.searchPlaceholder")}
              className="pl-9"
            />
          </div>
        </div>

        {query.isError ? (
          <ApiPendingOrError error={query.error} endpoint="GET /api/v1/admin/motorbikes" requirement="FR-38" onRetry={() => query.refetch()} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">{t("motorbikes.col.motorbike")}</TableHead>
                  <TableHead>{t("motorbikes.col.plate")}</TableHead>
                  <TableHead>{t("motorbikes.col.shop")}</TableHead>
                  <TableHead>{t("motorbikes.col.type")}</TableHead>
                  <TableHead>{t("motorbikes.col.status")}</TableHead>
                  <TableHead className="text-right">{t("motorbikes.col.price")}</TableHead>
                  <TableHead className="pr-4 text-right">{t("motorbikes.col.added")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7} className="px-4">
                        <Skeleton className="h-9 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {query.data?.content.map((m, i) => (
                  <motion.tr
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => setSelected(m)}
                    className="cursor-pointer border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                          <Motorbike className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{m.model}</p>
                          <p className="text-xs text-muted-foreground">
                            {m.brand} · {t("motorbikes.unit")} {m.unitCode}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{m.plateNumber}</TableCell>
                    <TableCell className="max-w-44 truncate text-muted-foreground">{m.shopName}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                      {m.type} · {m.engineCc}cc
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={m.status} ns="motorbikes" />
                    </TableCell>
                    <TableCell className="text-right font-medium tabular">
                      {formatUsd(m.pricePerDay, lng)}
                      <span className="text-[11px] font-normal text-muted-foreground"> /{t("bookings.day")}</span>
                    </TableCell>
                    <TableCell className="pr-4 text-right text-xs text-muted-foreground">{formatDate(m.createdAt, lng)}</TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
            {query.data?.content.length === 0 && <EmptyState />}
          </div>
        )}
        {query.data && query.data.totalElements > PAGE_SIZE && (
          <Pager page={page} size={PAGE_SIZE} total={query.data.totalElements} onChange={setPage} />
        )}
      </Card>

      <MotorbikeDetailSheet motorbike={activeMotorbike} onClose={closeModal} />
    </>
  );
}
