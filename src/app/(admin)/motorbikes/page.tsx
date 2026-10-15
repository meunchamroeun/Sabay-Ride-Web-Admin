"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Bike, Download, Info, Search } from "lucide-react";
import { opsApi } from "@/lib/api/endpoints";
import type { MotorbikeStatus } from "@/lib/api/types";
import { downloadCsv } from "@/lib/csv";
import { formatDate, formatUsd } from "@/lib/format";
import { useDebounced } from "@/hooks/use-debounced";
import { ApiPendingOrError } from "@/components/common/api-pending";
import { PageHeader } from "@/components/common/page-header";
import { Pager } from "@/components/common/pager";
import { EmptyState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PAGE_SIZE = 20;
const STATUSES: MotorbikeStatus[] = ["ACTIVE", "MAINTENANCE", "INACTIVE"];
type Filter = MotorbikeStatus | "ALL";

export default function MotorbikesPage() {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const [filter, setFilter] = useState<Filter>("ALL");
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const search = useDebounced(q);
  const status = filter === "ALL" ? undefined : filter;

  const query = useQuery({
    queryKey: ["admin-motorbikes", status ?? "ALL", search, page, PAGE_SIZE],
    queryFn: () => opsApi.motorbikes({ status, q: search || undefined, page, size: PAGE_SIZE }),
  });

  function exportCsv() {
    downloadCsv(
      `sabayride-motorbikes-${new Date().toISOString().slice(0, 10)}`,
      ["Shop", "Unit", "Plate", "Model", "Brand", "Type", "CC", "Price/day USD", "Status", "Added"],
      (query.data?.content ?? []).map((m) => [m.shopName, m.unitCode, m.plateNumber, m.model, m.brand, m.type, m.engineCc, m.pricePerDay, m.status, m.createdAt]),
    );
  }

  return (
    <>
      <PageHeader
        title={t("motorbikes.title")}
        subtitle={t("motorbikes.subtitle")}
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!query.data?.content.length}>
            <Download className="size-3.5" /> {t("common.exportCsv")}
          </Button>
        }
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
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                          <Bike className="size-4" />
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
    </>
  );
}
