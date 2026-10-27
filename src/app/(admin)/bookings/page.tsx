"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { RotateCw, Search, Truck } from "lucide-react";
import { Motorbike } from "@/components/common/motorbike-icon";
import { opsApi, publicApi } from "@/lib/api/endpoints";
import { BOOKING_STATUSES, type BookingStatus } from "@/lib/api/types";
import { formatDate, formatKhr, formatUsd, initials, shortId } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDebounced } from "@/hooks/use-debounced";
import { ApiPendingOrError } from "@/components/common/api-pending";
import { PageHeader } from "@/components/common/page-header";
import { Pager } from "@/components/common/pager";
import { EmptyState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { BookingDetailSheet } from "./booking-detail-sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhenApiReady } from "@/components/common/coming-soon";

const PAGE_SIZE = 20;
type Filter = BookingStatus | "ALL";

function BookingMotorbikeThumbnail({ motorbikeId, photoUrl }: { motorbikeId?: string; photoUrl?: string }) {
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
        alt=""
        onError={() => setErr(true)}
        className="size-10 shrink-0 rounded-lg object-cover ring-1 ring-border/50 bg-muted"
        loading="lazy"
      />
    );
  }

  return (
    <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
      <Motorbike className="size-5" />
    </div>
  );
}

export default function BookingsPage() {
  return (
    <WhenApiReady feature="bookings">
      <Suspense fallback={null}>
        <BookingsScreen />
      </Suspense>
    </WhenApiReady>
  );
}

function BookingsScreen() {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const [filter, setFilter] = useState<Filter>("ALL");
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const search = useDebounced(q);
  const openParam = useSearchParams().get("open");
  const [selected, setSelected] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const openId = selected ?? (openParam && openParam !== dismissed ? openParam : null);
  const setOpenId = (id: string | null) => {
    setSelected(id);
    if (!id) setDismissed(openParam);
  };
  const status = filter === "ALL" ? undefined : filter;

  const query = useQuery({
    queryKey: ["admin-bookings", status ?? "ALL", search, page, PAGE_SIZE],
    queryFn: () => opsApi.bookings({ status, q: search || undefined, page, size: PAGE_SIZE }),
    refetchInterval: 8_000,
  });

  return (
    <>
      <PageHeader
        title={t("bookings.title")}
        subtitle={t("bookings.subtitle")}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <RotateCw className={cn("size-3.5", query.isFetching && "animate-spin")} />
            {t("common.refresh")}
          </Button>
        }
      />

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-col gap-3 border-b p-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            value={filter}
            onValueChange={(v) => {
              setFilter(v as Filter);
              setPage(0);
            }}
            className="min-w-0"
          >
            <TabsList>
              <TabsTrigger value="ALL">{t("common.all")}</TabsTrigger>
              {BOOKING_STATUSES.map((s) => (
                <TabsTrigger key={s} value={s}>
                  {t(`bookings.status.${s}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative lg:w-72">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder={t("bookings.searchPlaceholder")}
              className="pl-9"
            />
          </div>
        </div>

        {query.isError ? (
          <ApiPendingOrError error={query.error} endpoint="GET /api/v1/admin/bookings" requirement="FR-38" onRetry={() => query.refetch()} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">{t("bookings.col.booking")}</TableHead>
                  <TableHead>{t("bookings.col.customer")}</TableHead>
                  <TableHead>{t("bookings.col.shop")}</TableHead>
                  <TableHead>{t("bookings.col.dates")}</TableHead>
                  <TableHead>{t("bookings.col.status")}</TableHead>
                  <TableHead className="pr-4 text-right">{t("bookings.col.total")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6} className="px-4">
                        <Skeleton className="h-9 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {query.data?.content.map((b, i) => (
                  <motion.tr
                    key={b.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => setOpenId(b.id)}
                    className="cursor-pointer border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <BookingMotorbikeThumbnail
                          motorbikeId={b.items?.[0]?.motorbikeId}
                          photoUrl={b.photoUrl || b.imageUrl || b.items?.[0]?.photoUrl}
                        />
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-medium">#{shortId(b.id)}</p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                            {b.bookedModel || b.items?.[0]?.model || "—"}
                            {Boolean(b.items && b.items.length > 1) && ` +${b.items.length - 1}`}
                            {b.pickupMethod === "DELIVERY" && <Truck className="ml-1 size-3" />}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-40 truncate">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6 shrink-0">
                          {b.customerAvatarUrl && <AvatarImage src={b.customerAvatarUrl} className="object-cover" />}
                          <AvatarFallback className="text-[10px] bg-accent text-accent-foreground">
                            {initials(b.customerName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{b.customerName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-44 truncate text-muted-foreground">{b.shopName}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                      {formatDate(b.startDate, lng)} → {formatDate(b.endDate, lng)}
                      <span className="block">{t("bookings.days", { count: b.rentalDays })}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={b.status} ns="bookings" />
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <span className="block font-medium tabular">{formatUsd(b.total, lng)}</span>
                      <span className="text-[11px] text-muted-foreground">{t("money.khr", { value: formatKhr(b.total, lng) })}</span>
                    </TableCell>
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

      <BookingDetailSheet bookingId={openId} onOpenChange={(o) => !o && setOpenId(null)} />
    </>
  );
}
