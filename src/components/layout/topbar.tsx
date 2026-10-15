"use client";

import Link from "next/link";
import { FlaskConical, LogOut, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { API_ENVIRONMENTS } from "@/config/env";
import { useApiEnv } from "@/lib/api/api-env";
import { useAuth } from "@/lib/auth/auth-provider";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { BrandMark } from "@/components/common/brand";
import { NotificationBell } from "./notification-bell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function Topbar() {
  const { t } = useTranslation();
  const { session, logout } = useAuth();
  const user = session?.user;
  const apiEnv = useApiEnv();
  const prod = apiEnv === "production";

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/80 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-md sm:px-4 [@supports(padding:env(safe-area-inset-top))]:h-[calc(3.5rem+env(safe-area-inset-top))]">
      {/* Phones: app-style header with the logo; the menu lives in the bottom bar's "More". */}
      <Link href="/" className="flex items-center gap-2 md:hidden">
        <BrandMark className="size-8 rounded-lg" />
        <span className="font-heading text-[15px] font-semibold">{t("app.name")}</span>
      </Link>
      <SidebarTrigger className="-ml-1 hidden md:inline-flex" />
      <Separator orientation="vertical" className="mx-1 hidden h-5! md:block" />
      {session?.demo ? (
        <span className="hidden items-center gap-1.5 rounded-full bg-chart-3/15 px-2.5 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-chart-3/30 ring-inset sm:inline-flex dark:text-violet-300">
          <FlaskConical className="size-3" />
          {t("app.env.demo")}
        </span>
      ) : (
      <span
        title={API_ENVIRONMENTS[apiEnv]}
        className={cn(
          "hidden items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset sm:inline-flex",
          prod
            ? "bg-destructive/10 text-destructive ring-destructive/30"
            : "bg-warning/15 text-amber-700 ring-warning/40 dark:text-amber-300",
        )}
      >
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
        {t(`app.env.${apiEnv}`)}
      </span>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        <NotificationBell />
        <LanguageSwitcher />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                {initials(user?.fullName)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="grid">
              <span className="truncate">{user?.fullName}</span>
              <span className="truncate text-xs font-normal text-muted-foreground">{user?.phone}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <UserRound /> {t("nav.profile")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => logout()}>
              <LogOut /> {t("common.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
