"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { BadgeCheck, Download, LogIn, Pencil, Plus, Search, Trash2, Wallet } from "lucide-react";
import { opsApi } from "@/lib/api/endpoints";
import { AUDIT_ACTIONS, type AuditAction } from "@/lib/api/types";
import { downloadCsv } from "@/lib/csv";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDebounced } from "@/hooks/use-debounced";
import { ApiPendingOrError } from "@/components/common/api-pending";
import { PageHeader } from "@/components/common/page-header";
import { Pager } from "@/components/common/pager";
import { EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PAGE_SIZE = 25;

const ACTION_STYLE: Record<AuditAction, { icon: React.ElementType; tone: string }> = {
  CREATE: { icon: Plus, tone: "bg-success/15 text-emerald-700 dark:text-emerald-300" },
  UPDATE: { icon: Pencil, tone: "bg-chart-5/15 text-sky-700 dark:text-sky-300" },
  DELETE: { icon: Trash2, tone: "bg-destructive/10 text-destructive" },
  LOGIN: { icon: LogIn, tone: "bg-muted text-muted-foreground" },
  VERIFY: { icon: BadgeCheck, tone: "bg-chart-3/15 text-violet-700 dark:text-violet-300" },
  PAYOUT: { icon: Wallet, tone: "bg-warning/15 text-amber-700 dark:text-amber-300" },
};

export default function AuditPage() {
  const { t, i18n } = useTranslation();
  const [action, setAction] = useState<AuditAction | "ALL">("ALL");
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const search = useDebounced(q);

  const query = useQuery({
    queryKey: ["admin-audit", action, search, page, PAGE_SIZE],
    queryFn: () => opsApi.auditLogs({ action: action === "ALL" ? undefined : action, q: search || undefined, page, size: PAGE_SIZE }),
  });

  function exportCsv() {
    downloadCsv(
      `sabayride-audit-${new Date().toISOString().slice(0, 10)}`,
      ["Time", "User", "Action", "Entity", "Entity ID", "Description", "IP address"],
      (query.data?.content ?? []).map((a) => [a.createdAt, a.userName, a.action, a.entityName, a.entityId, a.description, a.ipAddress]),
    );
  }

  return (
    <>
      <PageHeader
        title={t("audit.title")}
        subtitle={t("audit.subtitle")}
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!query.data?.content.length}>
            <Download className="size-3.5" /> {t("common.exportCsv")}
          </Button>
        }
      />

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-col gap-3 border-b p-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            value={action}
            onValueChange={(v) => {
              setAction(v as AuditAction | "ALL");
              setPage(0);
            }}
          >
            <TabsList className="h-auto flex-wrap justify-start">
              <TabsTrigger value="ALL">{t("common.all")}</TabsTrigger>
              {AUDIT_ACTIONS.map((a) => (
                <TabsTrigger key={a} value={a}>
                  {t(`audit.action.${a}`)}
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
              placeholder={t("audit.searchPlaceholder")}
              className="pl-9"
            />
          </div>
        </div>

        {query.isError ? (
          <ApiPendingOrError error={query.error} endpoint="GET /api/v1/admin/audit-logs" requirement="FR-41 · NFR-19" onRetry={() => query.refetch()} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">{t("audit.col.time")}</TableHead>
                  <TableHead>{t("audit.col.action")}</TableHead>
                  <TableHead>{t("audit.col.user")}</TableHead>
                  <TableHead>{t("audit.col.description")}</TableHead>
                  <TableHead className="pr-4">{t("audit.col.ip")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading &&
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5} className="px-4">
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {query.data?.content.map((a, i) => {
                  const style = ACTION_STYLE[a.action];
                  return (
                    <motion.tr
                      key={a.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.015 }}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <TableCell className="pl-4 text-xs whitespace-nowrap text-muted-foreground">{formatDate(a.createdAt, i18n.language, true)}</TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", style.tone)}>
                          <style.icon className="size-3" />
                          {t(`audit.action.${a.action}`)}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-36 truncate">{a.userName}</TableCell>
                      <TableCell className="max-w-md">
                        <p className="truncate">{a.description}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {a.entityName} · {a.entityId.slice(0, 8)}
                        </p>
                      </TableCell>
                      <TableCell className="pr-4 font-mono text-xs text-muted-foreground">{a.ipAddress}</TableCell>
                    </motion.tr>
                  );
                })}
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
