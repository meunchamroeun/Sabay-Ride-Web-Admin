"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/lib/auth/auth-provider";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session, ready, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!session) router.replace("/login");
    else if (!isAdmin) router.replace("/login?forbidden=1");
  }, [ready, session, isAdmin, router]);

  if (!ready || !session || !isAdmin) {
    return (
      <div className="flex min-h-screen">
        <Skeleton className="hidden h-screen w-64 rounded-none md:block" />
        <div className="flex-1 space-y-4 p-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <Topbar />
        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full flex-1 space-y-6 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:p-6 md:pb-6"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </SidebarInset>
      <MobileTabBar />
    </SidebarProvider>
  );
}
