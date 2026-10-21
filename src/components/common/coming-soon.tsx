"use client";

import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { FEATURE_ENDPOINTS, isApiReady, type PendingFeature } from "@/config/api-features";
import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";

/** Full-page "Coming soon" for a screen whose API endpoints do not exist yet. */
export function ComingSoon({ feature }: { feature: PendingFeature }) {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t(`nav.${feature}`)} subtitle={t(`soon.what.${feature}`)} />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Card className="items-center gap-4 px-6 py-14 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-sidebar-badge/15 text-orange-600 dark:text-orange-300">
            <Clock className="size-6" />
          </div>
          <div className="max-w-md space-y-1.5">
            <span className="inline-flex rounded-full bg-sidebar-badge/15 px-2.5 py-0.5 text-xs font-semibold text-orange-700 dark:text-orange-300">
              {t("soon.badge")}
            </span>
            <h2 className="font-heading text-lg font-semibold">{t("soon.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("soon.body")}</p>
          </div>
          <div className="w-full max-w-md rounded-xl border bg-muted/40 p-3 text-left">
            <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              {t("soon.needs")}
            </p>
            <ul className="space-y-1">
              {FEATURE_ENDPOINTS[feature].map((e) => (
                <li key={e} className="font-mono text-[11.5px] break-all">
                  {e}
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </motion.div>
    </>
  );
}

/** Renders the screen once its API is ready, otherwise "Coming soon". */
export function WhenApiReady({ feature, children }: { feature: PendingFeature; children: React.ReactNode }) {
  return isApiReady(feature) ? <>{children}</> : <ComingSoon feature={feature} />;
}
