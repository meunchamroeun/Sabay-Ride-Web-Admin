"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { BadgeDollarSign, CalendarCheck, CircleSlash, Download, FileSpreadsheet, HandCoins, Store } from "lucide-react";
import { opsApi } from "@/lib/api/endpoints";
import type { PlatformReport, ReportPeriod } from "@/lib/api/types";
import { downloadCsv } from "@/lib/csv";
import { formatDate, formatKhr, formatNumber, formatUsd, toNumber } from "@/lib/format";
import { ApiPendingOrError } from "@/components/common/api-pending";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhenApiReady } from "@/components/common/coming-soon";

const PERIODS: ReportPeriod[] = ["DAILY", "WEEKLY", "MONTHLY"];

export default function ReportsPage() {
  return (
    <WhenApiReady feature="reports">
      <ReportsScreen />
    </WhenApiReady>
  );
}

function ReportsScreen() {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const [period, setPeriod] = useState<ReportPeriod>("MONTHLY");
  const query = useQuery({ queryKey: ["admin-report", period], queryFn: () => opsApi.report(period) });
  const r = query.data;

  const label = (raw: string) => {
    if (period === "MONTHLY") return new Intl.DateTimeFormat(lng === "km" ? "km-KH" : "en-US", { month: "short", year: "2-digit" }).format(new Date(`${raw}-01T00:00:00`));
    return new Intl.DateTimeFormat(lng === "km" ? "km-KH" : "en-US", { day: "numeric", month: "short" }).format(new Date(`${raw}T00:00:00`));
  };

  const chartData = (r?.series ?? []).map((s) => ({
    label: label(s.label),
    completed: s.completed,
    other: Math.max(0, s.bookings - s.completed - s.cancelled),
    cancelled: s.cancelled,
    commission: toNumber(s.platformCommission),
  }));
  const chartConfig = {
    completed: { label: t("reports.completed"), color: "var(--chart-1)" },
    other: { label: t("reports.otherBookings"), color: "var(--chart-5)" },
    cancelled: { label: t("reports.cancelled"), color: "var(--chart-4)" },
    commission: { label: t("dashboard.commission"), color: "var(--chart-2)" },
  } satisfies ChartConfig;

  function exportSeries(report: PlatformReport) {
    downloadCsv(
      `sabayride-report-${report.period.toLowerCase()}-${report.from}_${report.to}`,
      ["Period", "Bookings", "Completed", "Cancelled", "Gross booking value USD", "Platform commission USD"],
      report.series.map((s) => [s.label, s.bookings, s.completed, s.cancelled, s.grossBookingValue, s.platformCommission]),
    );
  }
  function exportShops(report: PlatformReport) {
    downloadCsv(
      `sabayride-shop-earnings-${report.period.toLowerCase()}-${report.from}_${report.to}`,
      ["Shop", "Completed rentals", "Gross rental value USD", "Commission USD", "Received by shop USD"],
      report.shops.map((s) => [s.shopName, s.completed, s.grossBookingValue, s.platformCommission, s.received]),
    );
  }

  const kpis = r
    ? [
        { icon: CalendarCheck, label: t("reports.bookings"), value: formatNumber(r.totals.bookings, lng) },
        { icon: CircleSlash, label: t("reports.completedCancelled"), value: `${formatNumber(r.totals.completed, lng)} / ${formatNumber(r.totals.cancelled, lng)}` },
        { icon: BadgeDollarSign, label: t("dashboard.gross"), value: formatUsd(r.totals.grossBookingValue, lng), khr: formatKhr(r.totals.grossBookingValue, lng) },
        { icon: HandCoins, label: t("dashboard.commission"), value: formatUsd(r.totals.platformCommission, lng), khr: formatKhr(r.totals.platformCommission, lng) },
      ]
    : [];

  return (
    <>
      <PageHeader
        title={t("reports.title")}
        subtitle={r ? t("reports.range", { from: formatDate(r.from, lng), to: formatDate(r.to, lng) }) : t("reports.subtitle")}
        actions={
          <>
            <Tabs value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
              <TabsList>
                {PERIODS.map((p) => (
                  <TabsTrigger key={p} value={p}>
                    {t(`reports.period.${p}`)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" disabled={!r} onClick={() => r && exportSeries(r)}>
              <Download className="size-3.5" /> {t("common.exportCsv")}
            </Button>
          </>
        }
      />

      {query.isError ? (
        <Card>
          <ApiPendingOrError error={query.error} endpoint="GET /api/v1/admin/reports?period=" requirement="FR-40" onRetry={() => query.refetch()} />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {query.isLoading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
              : kpis.map((k, i) => (
                  <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="h-full">
                      <CardHeader>
                        <CardDescription className="self-center font-medium">{k.label}</CardDescription>
                        <CardAction>
                          <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                            <k.icon className="size-4" />
                          </div>
                        </CardAction>
                      </CardHeader>
                      <CardContent>
                        <p className="font-heading text-2xl font-semibold tabular">{k.value}</p>
                        {k.khr && <p className="text-xs text-muted-foreground">{t("money.khr", { value: k.khr })}</p>}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("reports.bookingsOverTime")}</CardTitle>
              <CardDescription>{t(`reports.periodHint.${period}`)}</CardDescription>
            </CardHeader>
            <CardContent>
              {query.isLoading ? (
                <Skeleton className="h-72 w-full" />
              ) : (
                <ChartContainer config={chartConfig} className="h-72 w-full">
                  <BarChart data={chartData} margin={{ left: -16, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={12} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="completed" stackId="b" fill="var(--color-completed)" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="other" stackId="b" fill="var(--color-other)" />
                    <Bar dataKey="cancelled" stackId="b" fill="var(--color-cancelled)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="border-b py-4">
              <CardTitle className="flex items-center gap-2">
                <Store className="size-4 text-primary" /> {t("reports.shopEarnings")}
              </CardTitle>
              <CardDescription>{t("reports.shopEarningsHint")}</CardDescription>
              <CardAction>
                <Button variant="outline" size="sm" disabled={!r?.shops.length} onClick={() => r && exportShops(r)}>
                  <FileSpreadsheet className="size-3.5" /> {t("common.exportCsv")}
                </Button>
              </CardAction>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4">{t("shops.col.shop")}</TableHead>
                    <TableHead className="text-right">{t("reports.completedRentals")}</TableHead>
                    <TableHead className="text-right">{t("reports.grossRental")}</TableHead>
                    <TableHead className="text-right">{t("dashboard.commission")}</TableHead>
                    <TableHead className="pr-4 text-right">{t("reports.received")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.isLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="px-4">
                        <Skeleton className="h-24 w-full" />
                      </TableCell>
                    </TableRow>
                  )}
                  {r?.shops.map((s) => (
                    <TableRow key={s.shopId}>
                      <TableCell className="pl-4 font-medium">{s.shopName}</TableCell>
                      <TableCell className="text-right tabular">{formatNumber(s.completed, lng)}</TableCell>
                      <TableCell className="text-right tabular">{formatUsd(s.grossBookingValue, lng)}</TableCell>
                      <TableCell className="text-right tabular text-muted-foreground">−{formatUsd(s.platformCommission, lng)}</TableCell>
                      <TableCell className="pr-4 text-right font-semibold tabular">{formatUsd(s.received, lng)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {r && r.shops.length === 0 && <EmptyState />}
            </div>
          </Card>
        </>
      )}
    </>
  );
}
