"use client";

import { AlertTriangle, Inbox, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";

export function EmptyState({ title, icon }: { title?: string; icon?: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
        {icon ?? <Inbox className="size-5" />}
      </div>
      <p className="text-sm text-muted-foreground">{title ?? t("common.empty")}</p>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  const message =
    error instanceof ApiError
      ? error.status === 403
        ? t("common.forbidden")
        : `${error.message || t("common.error")} (${error.code})`
      : error instanceof Error
        ? error.message
        : "";
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" />
      </div>
      <div>
        <p className="text-sm font-medium">{t("common.error")}</p>
        {message && <p className="mt-1 max-w-md text-xs text-muted-foreground">{message}</p>}
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RotateCw className="size-3.5" /> {t("common.retry")}
        </Button>
      )}
    </div>
  );
}
