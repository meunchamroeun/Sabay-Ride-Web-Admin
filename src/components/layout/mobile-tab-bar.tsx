"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { CalendarCheck, LayoutGrid, Menu, Store, Wallet } from "lucide-react";
import { adminApi } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

const TABS = [
  { href: "/", key: "home", icon: LayoutGrid },
  { href: "/shops", key: "shops", icon: Store, badge: "shops" as const },
  { href: "/bookings", key: "bookings", icon: CalendarCheck },
  { href: "/payouts", key: "payouts", icon: Wallet, badge: "payouts" as const },
];

/**
 * App-style bottom navigation for phones (PWA). Main destinations stay one tap away; "More"
 * opens the full menu drawer. Hidden from tablet width up, where the sidebar takes over.
 */
export function MobileTabBar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { setOpenMobile, openMobile } = useSidebar();
  const pending = useQuery({ queryKey: ["shops", "PENDING", 0, 1], queryFn: () => adminApi.shops("PENDING", 0, 1) });
  const failed = useQuery({ queryKey: ["payouts", "FAILED", 0, 1], queryFn: () => adminApi.payouts("FAILED", 0, 1) });
  const counts = { shops: pending.data?.totalElements ?? 0, payouts: failed.data?.totalElements ?? 0 };

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const onMainTab = TABS.some((tab) => active(tab.href));

  return (
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
            onClick={() => setOpenMobile(true)}
            aria-expanded={openMobile}
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
  );
}
