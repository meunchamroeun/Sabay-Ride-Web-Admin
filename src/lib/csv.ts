/**
 * CSV export (SRS FR-40). Excel opens the file directly; the UTF-8 byte-order mark makes it read
 * Khmer text correctly instead of showing mojibake.
 */
export type CsvValue = string | number | boolean | null | undefined;

const escape = (v: CsvValue) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(headers: string[], rows: CsvValue[][]) {
  return [headers, ...rows].map((r) => r.map(escape).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, headers: string[], rows: CsvValue[][]) {
  const blob = new Blob(["﻿" + toCsv(headers, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
