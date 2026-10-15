"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useTranslation } from "react-i18next";
import { Hammer } from "lucide-react";
import { PageHeader } from "./page-header";
import { Card, CardContent } from "@/components/ui/card";

gsap.registerPlugin(useGSAP);

/** Placeholder for modules the backend has not shipped yet (reviews moderation, blog, assistance…). */
export function ComingSoon({ titleKey, bodyKey }: { titleKey: string; bodyKey: string }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(".cs-item", { y: 20, opacity: 0, stagger: 0.1, duration: 0.6, ease: "power3.out" });
      gsap.to(".cs-icon", { rotate: -18, yoyo: true, repeat: -1, duration: 0.5, ease: "power1.inOut", transformOrigin: "80% 80%" });
    },
    { scope: ref },
  );

  return (
    <>
      <PageHeader title={t(titleKey)} />
      <Card ref={ref} className="bg-grid relative overflow-hidden">
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="cs-item grid size-16 place-items-center rounded-2xl bg-accent text-accent-foreground">
            <Hammer className="cs-icon size-7" />
          </div>
          <h2 className="cs-item font-heading text-xl font-semibold">{t("common.comingSoon")}</h2>
          <p className="cs-item max-w-md text-sm text-muted-foreground">{t(bodyKey)}</p>
          <p className="cs-item max-w-md text-xs text-muted-foreground">{t("common.comingSoonBody")}</p>
        </CardContent>
      </Card>
    </>
  );
}
