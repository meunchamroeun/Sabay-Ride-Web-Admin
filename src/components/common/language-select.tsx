"use client";

import { Check, ChevronDown, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { setLocale } from "@/i18n";
import type { Locale } from "@/config/env";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LABELS: Record<Locale, string> = { km: "ខ្មែរ", en: "English" };

/** Compact dropdown language picker (login screen top bar). */
export function LanguageSelect() {
  const { i18n, t } = useTranslation();
  const current = (i18n.language as Locale) ?? "km";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("common.language")}
        className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Languages className="size-3.5" />
        {LABELS[current]}
        <ChevronDown className="size-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-32">
        {(Object.keys(LABELS) as Locale[]).map((l) => (
          <DropdownMenuItem key={l} onClick={() => setLocale(l)}>
            {LABELS[l]}
            {l === current && <Check className="ml-auto size-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
