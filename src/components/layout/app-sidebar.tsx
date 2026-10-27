"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  BookOpenText,
  CalendarCheck,
  ChartColumn,
  ChevronDown,
  ExternalLink,
  LayoutGrid,
  MessageSquareQuote,
  ScrollText,
  Store,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { Motorbike } from "@/components/common/motorbike-icon";
import { adminApi } from "@/lib/api/endpoints";
import { isApiReady } from "@/config/api-features";
import { swaggerUrlFor } from "@/config/env";
import { useApiEnv } from "@/lib/api/api-env";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/common/brand";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

type Item = { href: string; key: string; icon: React.ElementType; badge?: number; soon?: boolean };
type Group = { key: string; label?: string; items: Item[] };

const badgeText = (n: number) => (n > 9 ? "9+" : String(n));

export function AppSidebar() {
  const pathname = usePathname();
  const apiEnv = useApiEnv();
  const { t } = useTranslation();
  const { isMobile, setOpenMobile } = useSidebar();
  // In the mobile drawer, close it once a page is chosen.
  const closeDrawer = () => isMobile && setOpenMobile(false);

  // Counters that tell the admin where work is waiting.
  const pending = useQuery({ queryKey: ["shops", "PENDING", 0, 1], queryFn: () => adminApi.shops("PENDING", 0, 1), refetchInterval: 3_000 });
  const failed = useQuery({ queryKey: ["payouts", "FAILED", 0, 1], queryFn: () => adminApi.payouts("FAILED", 0, 1), refetchInterval: 3_000 });

  const groups: Group[] = [
    { key: "top", items: [{ href: "/", key: "dashboard", icon: LayoutGrid }] },
    {
      key: "operations",
      label: t("nav.operations"),
      items: [
        { href: "/shops", key: "shops", icon: Store, badge: pending.data?.totalElements },
        { href: "/bookings", key: "bookings", icon: CalendarCheck, soon: !isApiReady("bookings") },
        { href: "/motorbikes", key: "motorbikes", icon: Motorbike, soon: !isApiReady("motorbikes") },
        { href: "/payouts", key: "payouts", icon: Wallet, badge: failed.data?.totalElements },
        { href: "/reviews", key: "reviews", icon: MessageSquareQuote },
      ],
    },
    { key: "people", label: t("nav.people"), items: [{ href: "/users", key: "users", icon: Users, soon: !isApiReady("users") }] },
    {
      key: "insights",
      label: t("nav.insights"),
      items: [
        { href: "/reports", key: "reports", icon: ChartColumn, soon: !isApiReady("reports") },
        { href: "/audit", key: "audit", icon: ScrollText, soon: !isApiReady("audit") },
      ],
    },
    {
      key: "content",
      label: t("nav.content"),
      items: [
        { href: "/blog", key: "blog", icon: BookOpenText, soon: !isApiReady("blog") },
      ],
    },
    { key: "account", label: t("nav.account"), items: [{ href: "/profile", key: "profile", icon: UserRound }] },
  ];

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const menu = (items: Item[]) => (
    <SidebarMenu className="gap-1">
      {items.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={t(`nav.${item.key}`)}>
            <Link href={item.href} onClick={closeDrawer}>
              <item.icon />
              <span>{t(`nav.${item.key}`)}</span>
            </Link>
          </SidebarMenuButton>

          {/* Expanded: pill at the end of the row */}
          {item.soon ? (
            <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-sidebar-hover px-2 py-0.5 text-[10px] font-medium text-sidebar-foreground/55 group-data-[collapsible=icon]:hidden">
              {t("nav.soon")}
            </span>
          ) : item.badge ? (
            <>
              <span className="pointer-events-none absolute top-1/2 right-2 grid h-6 min-w-6 -translate-y-1/2 place-items-center rounded-full bg-sidebar-badge px-1.5 text-xs font-bold text-white tabular-nums group-data-[collapsible=icon]:hidden">
                {badgeText(item.badge)}
              </span>
              {/* Collapsed: small badge on the icon's top-right corner */}
              <span className="pointer-events-none absolute -top-1 right-0.5 hidden h-[18px] min-w-[18px] place-items-center rounded-full bg-sidebar-badge px-1 text-[10px] font-bold text-white tabular-nums ring-2 ring-sidebar group-data-[collapsible=icon]:grid">
                {badgeText(item.badge)}
              </span>
            </>
          ) : null}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-r border-sidebar-border">
      <SidebarHeader className="px-3 pt-4">
        <Link href="/" className="flex items-center gap-2.5 px-1 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <BrandMark className="size-9 shrink-0 rounded-xl" />
          <div className="grid leading-tight group-data-[collapsible=icon]:hidden">
            <span className="font-heading text-[15px] font-semibold tracking-tight">{t("app.name")}</span>
            <span className="text-[11px] text-sidebar-foreground/50">{t("app.tagline")}</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-1.5 pt-2">
        {groups.map((g) =>
          g.label ? (
            <Collapsible key={g.key} defaultOpen className="group/collapsible">
              <SidebarGroup className="py-1">
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="w-full cursor-pointer hover:text-sidebar-foreground/70">
                    {g.label}
                    <ChevronDown className="ml-auto size-4 transition-transform duration-200 group-data-[state=closed]/collapsible:-rotate-90" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                {/* Kept mounted so a closed section still shows its icons when the sidebar is collapsed. */}
                <CollapsibleContent forceMount className="data-[state=closed]:hidden group-data-[collapsible=icon]:block!">
                  <SidebarGroupContent>{menu(g.items)}</SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          ) : (
            <SidebarGroup key={g.key} className="py-1">
              <SidebarGroupContent>{menu(g.items)}</SidebarGroupContent>
            </SidebarGroup>
          ),
        )}
      </SidebarContent>

      <SidebarFooter className={cn("border-t border-sidebar-border px-3 py-3")}>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={t("nav.apiDocs")} className="text-sidebar-foreground/70">
              <a href={swaggerUrlFor(apiEnv)} target="_blank" rel="noreferrer">
                <ExternalLink />
                <span>{t("nav.apiDocs")}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
