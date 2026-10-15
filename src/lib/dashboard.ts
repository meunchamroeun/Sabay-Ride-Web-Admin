import { humanize, toNumber } from "./format";
import type { AdminDashboard } from "./api/types";

export interface Metric {
  key: string;
  label: string;
  value: number;
  money: boolean;
}
export interface MetricGroup {
  key: string;
  metrics: Metric[];
}

const MONEY = /(value|commission|revenue|amount|earn|gross|share|paid(?!Count)|usd)/i;
const NOT_MONEY = /(count|percent|rate)$/i;

// The API sends money as a decimal string such as "14.40"; counts arrive as integers.
function isMoneyKey(key: string, raw: unknown) {
  if (NOT_MONEY.test(key)) return false;
  return MONEY.test(key) || (typeof raw === "string" && /^-?\d+\.\d{2}$/.test(raw));
}

function asNumber(raw: unknown): number | null {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string" && raw.trim() !== "" && !Number.isNaN(Number(raw))) return toNumber(raw);
  return null;
}

/**
 * The admin dashboard schema is not published (springdoc name collision), so we read it
 * structurally: every top-level object becomes a group of numeric metrics.
 */
export function groupDashboard(data: AdminDashboard | undefined): MetricGroup[] {
  if (!data) return [];
  const groups: MetricGroup[] = [];
  const loose: Metric[] = [];

  for (const [gKey, gVal] of Object.entries(data)) {
    if (gVal && typeof gVal === "object" && !Array.isArray(gVal)) {
      const metrics: Metric[] = [];
      for (const [k, v] of Object.entries(gVal as Record<string, unknown>)) {
        const n = asNumber(v);
        if (n !== null) metrics.push({ key: k, label: humanize(k), value: n, money: isMoneyKey(k, v) });
      }
      if (metrics.length) groups.push({ key: gKey, metrics });
    } else {
      const n = asNumber(gVal);
      if (n !== null) loose.push({ key: gKey, label: humanize(gKey), value: n, money: isMoneyKey(gKey, gVal) });
    }
  }
  if (loose.length) groups.unshift({ key: "general", metrics: loose });
  return groups;
}

export function findMetric(groups: MetricGroup[], ...keys: string[]): Metric | undefined {
  const wanted = keys.map((k) => k.toLowerCase());
  for (const g of groups) for (const m of g.metrics) if (wanted.includes(m.key.toLowerCase())) return m;
  return undefined;
}

/** Best "headline" number for a group: an explicit total, else the first metric. */
export function headline(group: MetricGroup | undefined): Metric | undefined {
  if (!group) return undefined;
  return group.metrics.find((m) => /^total/i.test(m.key)) ?? group.metrics[0];
}
