"use client";

import { useTranslation } from "react-i18next";
import { BadgeCheck, Ban, Calendar, Clock, Loader2, Mail, Phone, RotateCcw, Shield, User } from "lucide-react";
import type { AdminUser } from "@/lib/api/types";
import { formatDate, initials, shortId } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function UserDetailSheet({
  user,
  onClose,
  onSuspend,
  onReactivate,
  isReactivating,
}: {
  user: AdminUser | null;
  onClose: () => void;
  onSuspend: (user: AdminUser) => void;
  onReactivate: (userId: string) => void;
  isReactivating?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const isAdmin = user?.roles.includes("ADMIN");

  return (
    <Sheet open={!!user} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b p-5">
          <SheetDescription>{t("users.detail")}</SheetDescription>
          {user && (
            <div className="flex items-start justify-between gap-3">
              <SheetTitle className="font-heading text-lg font-bold">
                {user.fullName}
              </SheetTitle>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                  user.active
                    ? "bg-success/15 text-emerald-700 ring-success/40 dark:text-emerald-300"
                    : "bg-destructive/10 text-destructive ring-destructive/30",
                )}
              >
                <span className="size-1.5 rounded-full bg-current" />
                {user.active ? t("users.active") : t("users.suspendedTab")}
              </span>
            </div>
          )}
        </SheetHeader>

        {user && (
          <ScrollArea className="h-[calc(100vh-6.5rem)]">
            <div className="space-y-6 p-5 text-sm">
              {/* Profile Card */}
              <div className="flex items-center gap-4 rounded-2xl border bg-muted/30 p-4">
                <Avatar className="size-14 border-2 border-background shadow-xs">
                  <AvatarFallback className="bg-primary/10 text-base font-semibold text-primary">
                    {initials(user.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-semibold text-base">{user.fullName}</p>
                    {user.phoneVerified && (
                      <BadgeCheck className="size-4 shrink-0 text-primary" aria-label={t("users.verified")} />
                    )}
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">ID #{shortId(user.id)}</p>
                </div>
              </div>

              {/* Roles */}
              <section className="space-y-2.5">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <Shield className="size-3.5" /> {t("users.rolesTitle")}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {user.roles.map((r) => (
                    <Badge
                      key={r}
                      variant={r === "ADMIN" ? "default" : "secondary"}
                      className="px-2.5 py-1 text-xs font-medium"
                    >
                      {t(`users.role.${r}`)}
                    </Badge>
                  ))}
                </div>
              </section>

              <Separator />

              {/* Contact info */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {t("shops.contact")}
                </h3>
                <div className="grid gap-2.5">
                  <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                      <Phone className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground">{t("shops.phone", { defaultValue: "Phone" })}</p>
                      <p className="font-medium font-mono text-xs">{user.phone}</p>
                    </div>
                    {user.phoneVerified && (
                      <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {t("users.verified")}
                      </span>
                    )}
                  </div>

                  {user.email ? (
                    <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
                      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                        <Mail className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground">{t("common.email", { defaultValue: "Email" })}</p>
                        <p className="truncate font-medium text-xs">{user.email}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

              {/* Suspension Reason if suspended */}
              {!user.active && user.suspensionReason && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 text-sm">
                  <p className="text-xs font-semibold text-destructive">{t("shops.rejectionReason")}</p>
                  <p className="mt-1 text-xs leading-relaxed">{user.suspensionReason}</p>
                </div>
              )}

              <Separator />

              {/* Timestamps */}
              <section className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5" /> {t("users.joined")}
                  </span>
                  <span>{formatDate(user.createdAt, lng, true)}</span>
                </div>
                {user.lastLoginAt && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3.5" /> {t("users.lastSeen")}
                    </span>
                    <span>{formatDate(user.lastLoginAt, lng, true)}</span>
                  </div>
                )}
                <p className="font-mono text-[11px] pt-1">ID {user.id}</p>
              </section>

              {/* Account Actions */}
              {!isAdmin && (
                <div className="pt-2">
                  {user.active ? (
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => {
                        onClose();
                        onSuspend(user);
                      }}
                    >
                      <Ban className="size-4 mr-1.5" /> {t("shops.suspend")}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full border-success/40 text-emerald-700 hover:bg-success/10 hover:text-emerald-800 dark:text-emerald-300"
                      disabled={isReactivating}
                      onClick={() => onReactivate(user.id)}
                    >
                      {isReactivating ? (
                        <Loader2 className="size-4 mr-1.5 animate-spin" />
                      ) : (
                        <RotateCcw className="size-4 mr-1.5" />
                      )}
                      {t("shops.reactivate")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
