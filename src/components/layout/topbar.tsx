"use client";

import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { config } from "@/config/env";
import { useAuth } from "@/lib/auth/auth-provider";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { ThemeToggle } from "@/components/common/theme-toggle";
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
  const prod = config.apiEnv === "production";

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-md sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-1 h-5!" />
      <span
        title={config.apiBaseUrl}
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
        {t(`app.env.${config.apiEnv}`)}
      </span>

      <div className="ml-auto flex items-center gap-1.5">
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
