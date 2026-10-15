"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { BadgeCheck, Ban, Loader2, RotateCcw, Search } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { opsApi } from "@/lib/api/endpoints";
import type { AdminUser, Role } from "@/lib/api/types";
import { formatDate, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDebounced } from "@/hooks/use-debounced";
import { ApiPendingOrError } from "@/components/common/api-pending";
import { PageHeader } from "@/components/common/page-header";
import { Pager } from "@/components/common/pager";
import { EmptyState } from "@/components/common/states";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RequiredMark } from "@/components/common/required-mark";

const PAGE_SIZE = 20;
const ROLES: Role[] = ["CUSTOMER", "SHOP_OWNER", "SHOP_STAFF", "ADMIN"];
type ActiveFilter = "all" | "active" | "suspended";

export default function UsersPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [role, setRole] = useState<Role | "ALL">("ALL");
  const [active, setActive] = useState<ActiveFilter>("all");
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const search = useDebounced(q);
  const [suspending, setSuspending] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState("");

  const query = useQuery({
    queryKey: ["admin-users", role, active, search, page, PAGE_SIZE],
    queryFn: () =>
      opsApi.users({
        role: role === "ALL" ? undefined : role,
        active: active === "all" ? undefined : active === "active",
        q: search || undefined,
        page,
        size: PAGE_SIZE,
      }),
  });

  const onError = (e: unknown) => toast.error(e instanceof ApiError ? `${e.message} (${e.code})` : String(e));
  const suspend = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => opsApi.suspendUser(id, reason),
    onSuccess: (u) => {
      toast.success(t("users.suspended", { name: u.fullName }));
      setSuspending(null);
      setReason("");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError,
  });
  const reactivate = useMutation({
    mutationFn: opsApi.reactivateUser,
    onSuccess: (u) => {
      toast.success(t("users.reactivated", { name: u.fullName }));
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError,
  });

  return (
    <>
      <PageHeader title={t("users.title")} subtitle={t("users.subtitle")} />

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-col gap-3 border-b p-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            value={active}
            onValueChange={(v) => {
              setActive(v as ActiveFilter);
              setPage(0);
            }}
          >
            <TabsList>
              <TabsTrigger value="all">{t("common.all")}</TabsTrigger>
              <TabsTrigger value="active">{t("users.active")}</TabsTrigger>
              <TabsTrigger value="suspended">{t("users.suspendedTab")}</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={role}
              onValueChange={(v) => {
                setRole(v as Role | "ALL");
                setPage(0);
              }}
            >
              <SelectTrigger className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("users.allRoles")}</SelectItem>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`users.role.${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative sm:w-64">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(0);
                }}
                placeholder={t("users.searchPlaceholder")}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {query.isError ? (
          <ApiPendingOrError error={query.error} endpoint="GET /api/v1/admin/users" requirement="FR-37" onRetry={() => query.refetch()} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">{t("users.col.user")}</TableHead>
                  <TableHead>{t("users.col.roles")}</TableHead>
                  <TableHead>{t("users.col.status")}</TableHead>
                  <TableHead>{t("users.col.joined")}</TableHead>
                  <TableHead>{t("users.col.lastLogin")}</TableHead>
                  <TableHead className="pr-4" />
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
                {query.data?.content.map((u, i) => {
                  const isAdmin = u.roles.includes("ADMIN");
                  return (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9">
                            <AvatarFallback className={cn("text-xs", isAdmin ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground")}>
                              {initials(u.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="flex items-center gap-1 truncate font-medium">
                              {u.fullName}
                              {u.phoneVerified && <BadgeCheck className="size-3.5 text-primary" aria-label={t("users.verified")} />}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {u.phone}
                              {u.email && ` · ${u.email}`}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) => (
                            <Badge key={r} variant={r === "ADMIN" ? "default" : "secondary"} className="text-[10px]">
                              {t(`users.role.${r}`)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                            u.active
                              ? "bg-success/15 text-emerald-700 ring-success/40 dark:text-emerald-300"
                              : "bg-destructive/10 text-destructive ring-destructive/30",
                          )}
                        >
                          <span className="size-1.5 rounded-full bg-current" />
                          {u.active ? t("users.active") : t("users.suspendedTab")}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(u.createdAt, i18n.language)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(u.lastLoginAt, i18n.language, true)}</TableCell>
                      <TableCell className="pr-4 text-right">
                        {isAdmin ? null : u.active ? (
                          <Button size="sm" variant="outline" onClick={() => setSuspending(u)}>
                            <Ban /> {t("shops.suspend")}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={reactivate.isPending && reactivate.variables === u.id}
                            onClick={() => reactivate.mutate(u.id)}
                          >
                            {reactivate.isPending && reactivate.variables === u.id ? <Loader2 className="animate-spin" /> : <RotateCcw />}
                            {t("shops.reactivate")}
                          </Button>
                        )}
                      </TableCell>
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

      <Dialog open={!!suspending} onOpenChange={(o) => !o && setSuspending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("users.suspendTitle", { name: suspending?.fullName })}</DialogTitle>
            <DialogDescription>{t("users.suspendHint")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="user-reason">
              {t("common.reason")} <RequiredMark />
            </Label>
            <Textarea id="user-reason" rows={3} maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspending(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={!reason.trim() || suspend.isPending}
              onClick={() => suspending && suspend.mutate({ id: suspending.id, reason: reason.trim() })}
            >
              {suspend.isPending && <Loader2 className="animate-spin" />} {t("shops.suspend")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
