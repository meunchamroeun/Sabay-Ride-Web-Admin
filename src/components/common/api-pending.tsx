"use client";

import { Hourglass } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/lib/api/client";
import { ErrorState } from "./states";

/**
 * True when the backend does not have this endpoint yet. The API answers unknown paths with
 * 404 `NOT_FOUND` ("No such endpoint."); a 404 for a missing record has its own code (e.g.
 * BOOKING_NOT_FOUND) and is shown as a normal error.
 */
export const isMissingEndpoint = (e: unknown) =>
  e instanceof ApiError &&
  ((e.status === 404 && ["NOT_FOUND", "HTTP_404", "DEMO_NOT_AVAILABLE"].includes(e.code)) || e.status === 405 || e.status === 501);

/**
 * Error view for the SRS screens whose API is still being built: a missing endpoint shows a calm
 * "waiting for the backend" note (with the path and requirement), anything else the normal error.
 */
export function ApiPendingOrError({
  error,
  endpoint,
  requirement,
  onRetry,
}: {
  error: unknown;
  endpoint: string;
  requirement: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  // endpoint/requirement are kept for developers (React DevTools, data attributes), not shown.
  if (!isMissingEndpoint(error)) return <ErrorState error={error} onRetry={onRetry} />;
  return (
    <div
      data-endpoint={endpoint}
      data-requirement={requirement}
      className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center"
    >
      <div className="grid size-12 place-items-center rounded-2xl bg-warning/15 text-amber-600 dark:text-amber-300">
        <Hourglass className="size-5" />
      </div>
      <div className="max-w-md space-y-1">
        <p className="text-sm font-medium">{t("pending.title")}</p>
        <p className="text-xs text-muted-foreground">{t("pending.body")}</p>
      </div>
    </div>
  );
}
