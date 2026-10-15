"use client";

import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { setLocale } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Locale } from "@/config/env";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "km", label: "ខ្មែរ" },
  { value: "en", label: "EN" },
];

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const current = i18n.language as Locale;

  return (
    <div
      role="radiogroup"
      aria-label={t("common.language")}
      className={cn("relative inline-flex items-center rounded-full border bg-muted/60 p-0.5 text-xs", className)}
    >
      {OPTIONS.map((o) => {
        const active = current === o.value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => setLocale(o.value)}
            className={cn(
              "relative z-10 rounded-full px-3 py-1 font-medium transition-colors",
              active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="lang-pill"
                className="absolute inset-0 -z-10 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
