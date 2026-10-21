"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  BookOpenText,
  CalendarCheck,
  ChartColumn,
  ExternalLink,
  LayoutGrid,
  Menu,
  MessageSquareQuote,
  ScrollText,
  Store,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { Motorbike } from "@/components/common/motorbike-icon";
import { adminApi } from "@/lib/api/endpoints";
import { swaggerUrlFor } from "@/config/env";
import { useApiEnv } from "@/lib/api/api-env";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const TABS = [
  { href: "/", key: "home", icon: LayoutGrid },
  { href: "/shops", key: "shops", icon: Store, badge: "shops" as const },
  { href: "/bookings", key: "bookings", icon: CalendarCheck },
  { href: "/payouts", key: "payouts", icon: Wallet, badge: "payouts" as const },
];

// The remaining pages, shown in the "More" sheet that slides up from the bottom.
const MORE = [
  { href: "/motorbikes", key: "motorbikes", icon: Motorbike },
  { href: "/reviews", key: "reviews", icon: MessageSquareQuote },
  { href: "/users", key: "users", icon: Users },
  { href: "/reports", key: "reports", icon: ChartColumn },
  { href: "/audit", key: "audit", icon: ScrollText },
  { href: "/blog", key: "blog", icon: BookOpenText },
  { href: "/profile", key: "profile", icon: UserRound },
];

const tileLink = "flex flex-col items-center gap-1.5 rounded-2xl p-1.5 text-center text-[11px] leading-tight font-medium text-muted-foreground active:scale-95";
const tileIcon = "grid size-12 place-items-center rounded-2xl bg-muted text-foreground/80 [&_svg]:size-5 [&_svg]:stroke-[1.75]";

/**
 * App-style bottom navigation for phones (PWA). Main destinations stay one tap away; "More"
 * opens a bottom sheet with the remaining pages. Hidden from tablet width up, where the sidebar takes over.
 */
export function MobileTabBar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const apiEnv = useApiEnv();
  const [moreOpen, setMoreOpen] = useState(false);
  const pending = useQuery({ queryKey: ["shops", "PENDING", 0, 1], queryFn: () => adminApi.shops("PENDING", 0, 1) });
  const failed = useQuery({ queryKey: ["payouts", "FAILED", 0, 1], queryFn: () => adminApi.payouts("FAILED", 0, 1) });
  const counts = { shops: pending.data?.totalElements ?? 0, payouts: failed.data?.totalElements ?? 0 };

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const onMainTab = TABS.some((tab) => active(tab.href));

  return (
    <>
    <nav
      aria-label={t("nav.mainMenu")}
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
        {TABS.map((tab) => {
          const isActive = active(tab.href);
          const count = tab.badge ? counts[tab.badge] : 0;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className="flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors active:scale-95"
              >
                <span className="relative grid h-7 w-14 place-items-center">
                  {isActive && (
                    <motion.span
                      layoutId="tab-pill"
                      className="absolute inset-0 rounded-full bg-sidebar-accent"
                      transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    />
                  )}
                  <tab.icon className={cn("relative size-5 stroke-[1.75]", isActive && "text-sidebar-accent-foreground")} />
                  {count > 0 && (
                    <span className="absolute -top-1 right-2 grid h-4 min-w-4 place-items-center rounded-full bg-sidebar-badge px-1 text-[10px] leading-none font-bold text-white ring-2 ring-background tabular-nums">
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </span>
                <span className={cn("max-w-full truncate px-1", isActive && "font-semibold text-sidebar-accent-foreground")}>
                  {t(`nav.short.${tab.key}`)}
                </span>
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            className="flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground active:scale-95"
          >
            <span className={cn("grid h-7 w-14 place-items-center rounded-full", !onMainTab && "bg-sidebar-accent")}>
              <Menu className={cn("size-5 stroke-[1.75]", !onMainTab && "text-sidebar-accent-foreground")} />
            </span>
            <span className={cn(!onMainTab && "font-semibold text-sidebar-accent-foreground")}>{t("nav.short.more")}</span>
          </button>
        </li>
      </ul>
    </nav>

    <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
      <SheetContent side="bottom" className="gap-0 rounded-t-3xl pb-[calc(1rem+env(safe-area-inset-bottom))] md:hidden">
        <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-muted-foreground/25" />
        <SheetHeader className="px-5 pt-3 pb-2">
          <SheetTitle className="font-heading text-base">{t("nav.short.more")}</SheetTitle>
          <SheetDescription className="sr-only">{t("nav.mainMenu")}</SheetDescription>
        </SheetHeader>
        <ul className="grid grid-cols-4 gap-x-2 gap-y-3 px-4 pb-2">
          {MORE.map((item) => {
            const isActive = active(item.href);
            return (
              <li key={item.href}>
                <Link href={item.href} onClick={() => setMoreOpen(false)} aria-current={isActive ? "page" : undefined} className={tileLink}>
                  <span className={cn(tileIcon, isActive && "bg-sidebar-accent text-sidebar-accent-foreground")}>
                    <item.icon />
                  </span>
                  <span className={cn("line-clamp-2", isActive && "font-semibold text-sidebar-accent-foreground")}>{t(`nav.${item.key}`)}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <a href={swaggerUrlFor(apiEnv)} target="_blank" rel="noreferrer" className={tileLink}>
              <span className={tileIcon}>
                <ExternalLink />
              </span>
              <span className="line-clamp-2">{t("nav.apiDocs")}</span>
            </a>
          </li>
        </ul>
      </SheetContent>
    </Sheet>
    </>
  );
}
