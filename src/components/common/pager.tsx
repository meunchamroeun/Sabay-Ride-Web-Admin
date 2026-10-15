"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function Pager({
  page,
  size,
  total,
  onChange,
}: {
  page: number;
  size: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const { t } = useTranslation();
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="flex items-center justify-between gap-2 border-t px-4 py-3 text-xs text-muted-foreground">
      <span>{t("common.results", { count: total })}</span>
      <div className="flex items-center gap-2">
        <span className="tabular">{t("common.pageOf", { page: page + 1, total: pages })}</span>
        <Button
          variant="outline"
          size="icon"
          className="size-7"
          disabled={page === 0}
          onClick={() => onChange(page - 1)}
          aria-label={t("common.previous")}
        >
          <ChevronLeft className="size-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-7"
          disabled={page + 1 >= pages}
          onClick={() => onChange(page + 1)}
          aria-label={t("common.next")}
        >
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
