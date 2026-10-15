import { config } from "@/config/env";
import type { Money } from "./api/types";

const intlLocale = (lng: string) => (lng === "km" ? "km-KH" : "en-US");

export function toNumber(m: Money | null | undefined): number {
  if (m === null || m === undefined || m === "") return 0;
  return typeof m === "number" ? m : Number(m);
}

/** Money is displayed in USD; the API sends exact decimals, we only format. */
export function formatUsd(m: Money | null | undefined, lng = "en") {
  return new Intl.NumberFormat(intlLocale(lng), { style: "currency", currency: "USD" }).format(toNumber(m));
}

export function formatKhr(m: Money | null | undefined, lng = "en") {
  return new Intl.NumberFormat(intlLocale(lng), { maximumFractionDigits: 0 }).format(
    Math.round(toNumber(m) * config.khrPerUsd),
  );
}

export function formatNumber(n: number, lng = "en") {
  return new Intl.NumberFormat(intlLocale(lng)).format(n);
}

export function formatDate(iso: string | undefined, lng = "en", withTime = false) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(intlLocale(lng), {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
    timeZone: "Asia/Phnom_Penh",
  }).format(new Date(iso));
}

export const shortId = (id?: string) => (id ? id.slice(0, 8).toUpperCase() : "—");

export function initials(name?: string) {
  if (!name) return "SR";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function humanize(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}
