"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Pie, PieChart, Cell } from "recharts";
import {
  ArrowUpRight,
  BadgeDollarSign,
  CalendarCheck,
  CheckCircle2,
  RotateCw,
  Store,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";
import { Motorbike } from "@/components/common/motorbike-icon";
import { adminApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-provider";
import { findMetric, groupDashboard, headline, type Metric, type MetricGroup } from "@/lib/dashboard";
import { formatDate, formatKhr, formatNumber, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/common/animated-number";
import { PageHeader } from "@/components/common/page-header";
import { ErrorState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

const GROUP_ICON: Record<string, React.ElementType> = {
  motorbikes: Motorbike,
  fleet: Motorbike,
  shops: Store,
  users: Users,
  bookings: CalendarCheck,
  revenue: BadgeDollarSign,
  payouts: Wallet,
};

const fade = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.05 * i, duration: 0.4, ease: "easeOut" as const },
});

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const { session } = useAuth();

  const dash = useQuery({ queryKey: ["admin-dashboard"], queryFn: adminApi.dashboard });
  const queue = useQuery({ queryKey: ["shops", "PENDING", 0, 5], queryFn: () => adminApi.shops("PENDING", 0, 5) });
  const failed = useQuery({ queryKey: ["payouts", "FAILED", 0, 1], queryFn: () => adminApi.payouts("FAILED", 0, 1) });

  const groups = groupDashboard(dash.data);
  const gross = findMetric(groups, "grossBookingValue", "gross");
  const commission = findMetric(groups, "platformCommission", "commission");
  const failedCount = findMetric(groups, "failedCount")?.value ?? failed.data?.totalElements ?? 0;

  // SRS §14.12: customers, shops (with pending), motorbikes, bookings; revenue and payouts below.
  const group = (...keys: string[]) => groups.find((g) => keys.includes(g.key));
  const pendingShops = findMetric(groups, "pending", "pendingVerification");
  const kpis: { key: string; icon: React.ElementType; metric?: Metric; note?: string }[] = [
    { key: "customers", icon: Users, metric: findMetric(groups, "customers", "totalCustomers") ?? headline(group("users")) },
    {
      key: "shops",
      icon: Store,
      metric: headline(group("shops")),
      note: pendingShops ? t("dashboard.pendingShops", { count: pendingShops.value }) : undefined,
    },
    { key: "motorbikes", icon: Motorbike, metric: headline(group("motorbikes", "fleet")) },
    { key: "bookings", icon: CalendarCheck, metric: headline(group("bookings")) },
  ];

  const fmt = (m: Metric) => (n: number) => (m.money ? formatUsd(n, lng) : formatNumber(n, lng));

  return (
    <>
      <PageHeader
        title={t("dashboard.greeting", { name: session?.user.fullName?.split(" ")[0] ?? "" })}
        subtitle={t("dashboard.subtitle")}
        actions={
          <Button variant="outline" size="sm" onClick={() => dash.refetch()} disabled={dash.isFetching}>
            <RotateCw className={cn("size-3.5", dash.isFetching && "animate-spin")} /> {t("common.refresh")}
          </Button>
        }
      />

      {dash.isError ? (
        <Card>
          <ErrorState error={dash.error} onRetry={() => dash.refetch()} />
        </Card>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {kpis.map((k, i) => (
              <motion.div key={k.key} {...fade(i)}>
                <Card className="relative h-full overflow-hidden">
                  <div className="absolute -top-8 -right-8 hidden size-28 rounded-full bg-primary/5 sm:block" />
                  <CardHeader>
                    <CardDescription className="self-center font-medium">
                      {t(`dashboard.groups.${k.key}`)}
                    </CardDescription>
                    <CardAction>
                      <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                        <k.icon className="size-4" />
                      </div>
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    {dash.isLoading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : k.metric ? (
                      <>
                        <AnimatedNumber
                          value={k.metric.value}
                          format={fmt(k.metric)}
                          className="font-heading text-2xl font-semibold tabular tracking-tight sm:text-3xl"
                        />
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {k.note ?? (k.metric.money ? t("money.khr", { value: formatKhr(k.metric.value, lng) }) : t(`dashboard.metric.${k.metric.key}`, { defaultValue: k.metric.label }))}
                        </p>
                      </>
                    ) : (
                      <span className="text-3xl font-semibold text-muted-foreground">—</span>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <RevenueCard gross={gross} commission={commission} loading={dash.isLoading} />
            <PayoutHealthCard failedCount={failedCount} loading={dash.isLoading && failed.isLoading} />
          </div>

          {/* All groups from the API, rendered structurally */}
          {groups.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {groups.map((g, i) => (
                <GroupCard key={g.key} group={g} index={i} />
              ))}
            </div>
          )}
        </>
      )}

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.reviewQueue")}</CardTitle>
            <CardDescription>{t("common.results", { count: queue.data?.totalElements ?? 0 })}</CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link href="/shops">
                  {t("dashboard.openQueue")} <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-1">
            {queue.isError && <ErrorState error={queue.error} onRetry={() => queue.refetch()} />}
            {queue.isLoading &&
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            {queue.data?.content.length === 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-success/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="size-4" /> {t("dashboard.reviewQueueEmpty")}
              </div>
            )}
            {queue.data?.content.map((s) => (
              <Link
                key={s.id}
                href={`/shops?open=${s.id}`}
                className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted"
              >
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <Store className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.city} · {formatDate(s.createdAt, lng)}
                  </p>
                </div>
                <StatusBadge status={s.status} ns="shops" />
              </Link>
            ))}
          </CardContent>
        </Card>

      </div>
    </>
  );
}

function RevenueCard({ gross, commission, loading }: { gross?: Metric; commission?: Metric; loading: boolean }) {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const g = gross?.value ?? 0;
  const c = commission?.value ?? 0;
  const shop = Math.max(0, g - c);
  const chartConfig = {
    commission: { label: t("dashboard.commission"), color: "var(--chart-2)" },
    shop: { label: t("dashboard.shopShare"), color: "var(--chart-1)" },
  } satisfies ChartConfig;
  const data = [
    { name: "commission", value: c, fill: "var(--color-commission)" },
    { name: "shop", value: shop, fill: "var(--color-shop)" },
  ];

  return (
    <motion.div {...fade(4)} className="lg:col-span-2">
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{t("dashboard.revenueSplit")}</CardTitle>
          <CardDescription>{t("dashboard.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="grid items-center gap-6 sm:grid-cols-[200px_1fr]">
          {loading ? (
            <Skeleton className="mx-auto size-44 rounded-full" />
          ) : (
            <ChartContainer config={chartConfig} className="mx-auto aspect-square w-44">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
                <Pie data={g > 0 ? data : [{ name: "shop", value: 1, fill: "var(--muted)" }]} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} strokeWidth={3} stroke="var(--card)">
                  {(g > 0 ? data : [{ fill: "var(--muted)" }]).map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          )}
          <div className="space-y-4">
            {[
              { label: t("dashboard.gross"), value: g, dot: "bg-foreground/80" },
              { label: t("dashboard.commission"), value: c, dot: "bg-chart-2" },
              { label: t("dashboard.shopShare"), value: shop, dot: "bg-chart-1" },
            ].map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-4 border-b pb-3 last:border-0">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className={cn("size-2.5 rounded-full", row.dot)} />
                  {row.label}
                </span>
                <span className="text-right">
                  <span className="block font-heading text-lg font-semibold tabular">{formatUsd(row.value, lng)}</span>
                  <span className="text-[11px] text-muted-foreground">{t("money.khr", { value: formatKhr(row.value, lng) })}</span>
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function PayoutHealthCard({ failedCount, loading }: { failedCount: number; loading: boolean }) {
  const { t } = useTranslation();
  const healthy = failedCount === 0;
  return (
    <motion.div {...fade(5)}>
      <Card
        className={cn(
          "relative h-full overflow-hidden",
          !healthy && "border-destructive/40 bg-destructive/[0.03]",
        )}
      >
        <CardHeader>
          <CardTitle>{t("dashboard.payoutHealth")}</CardTitle>
          <CardDescription>{t("dashboard.payoutHealthHint")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <>
              <div
                className={cn(
                  "grid size-14 place-items-center rounded-2xl",
                  healthy ? "bg-success/15 text-emerald-600 dark:text-emerald-300" : "bg-destructive/15 text-destructive",
                )}
              >
                {healthy ? <CheckCircle2 className="size-7" /> : <TriangleAlert className="size-7" />}
              </div>
              <p className="text-sm font-medium">
                {healthy ? t("dashboard.payoutHealthy") : t("dashboard.payoutNeedsAttention", { count: failedCount })}
              </p>
              <Button asChild size="sm" variant={healthy ? "outline" : "destructive"}>
                <Link href="/payouts">
                  {t("nav.payouts")} <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function GroupCard({ group, index }: { group: MetricGroup; index: number }) {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const Icon = GROUP_ICON[group.key] ?? BadgeDollarSign;
  const max = Math.max(1, ...group.metrics.filter((m) => !m.money).map((m) => m.value));
  return (
    <motion.div {...fade(6 + index)}>
      <Card className="h-full">
        <CardHeader className="flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          <CardTitle className="text-base">
            {t(`dashboard.groups.${group.key}`, { defaultValue: group.key })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {group.metrics.map((m) => (
            <div key={m.key} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-muted-foreground">{t(`dashboard.metric.${m.key}`, { defaultValue: m.label })}</span>
                <span className="font-medium tabular">{m.money ? formatUsd(m.value, lng) : formatNumber(m.value, lng)}</span>
              </div>
              {!m.money && (
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-primary/70"
                    initial={{ width: 0 }}
                    animate={{ width: `${(m.value / max) * 100}%` }}
                    transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
                  />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}
