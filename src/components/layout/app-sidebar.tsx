"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  BellRing,
  BookOpenText,
  ExternalLink,
  LayoutDashboard,
  LifeBuoy,
  MessageSquareQuote,
  Store,
  UserRound,
  Wallet,
} from "lucide-react";
import { adminApi } from "@/lib/api/endpoints";
import { swaggerUrlFor } from "@/config/env";
import { useApiEnv } from "@/lib/api/api-env";
import { BrandMark } from "@/components/common/brand";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

type Item = { href: string; key: string; icon: React.ElementType; badge?: number; soon?: boolean };

export function AppSidebar() {
  const pathname = usePathname();
  const apiEnv = useApiEnv();
  const { t } = useTranslation();

  // Small counters that tell the admin where work is waiting.
  const pending = useQuery({ queryKey: ["shops", "PENDING", 0], queryFn: () => adminApi.shops("PENDING", 0, 1) });
  const failed = useQuery({ queryKey: ["payouts", "FAILED", 0], queryFn: () => adminApi.payouts("FAILED", 0, 1) });

  const groups: { label: string; items: Item[] }[] = [
    { label: t("nav.overview"), items: [{ href: "/", key: "dashboard", icon: LayoutDashboard }] },
    {
      label: t("nav.operations"),
      items: [
        { href: "/shops", key: "shops", icon: Store, badge: pending.data?.totalElements },
        { href: "/payouts", key: "payouts", icon: Wallet, badge: failed.data?.totalElements },
        { href: "/reviews", key: "reviews", icon: MessageSquareQuote },
      ],
    },
    {
      label: t("nav.content"),
      items: [
        { href: "/blog", key: "blog", icon: BookOpenText, soon: true },
        { href: "/assistance", key: "assistance", icon: LifeBuoy, soon: true },
        { href: "/notifications", key: "notifications", icon: BellRing, soon: true },
      ],
    },
    { label: t("nav.account"), items: [{ href: "/profile", key: "profile", icon: UserRound }] },
  ];

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2.5 px-1 py-1.5">
          <BrandMark className="size-8 shrink-0" />
          <div className="grid leading-tight group-data-[collapsible=icon]:hidden">
            <span className="font-heading text-[15px] font-semibold tracking-tight">{t("app.name")}</span>
            <span className="text-[11px] text-sidebar-foreground/60">{t("app.tagline")}</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel className="text-sidebar-foreground/50">{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={t(`nav.${item.key}`)}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{t(`nav.${item.key}`)}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.soon ? (
                      <SidebarMenuBadge className="rounded-full bg-sidebar-accent px-1.5 text-[10px] text-sidebar-foreground/60">
                        {t("nav.soon")}
                      </SidebarMenuBadge>
                    ) : item.badge ? (
                      <SidebarMenuBadge className="rounded-full bg-sidebar-primary px-1.5 text-[10px] font-semibold text-sidebar-primary-foreground">
                        {item.badge}
                      </SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={t("nav.apiDocs")}>
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
