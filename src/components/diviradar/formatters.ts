import type { SortDirection, Stock } from "@/components/diviradar/types";

export function money(value: number, fraction = 0) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: fraction, minimumFractionDigits: fraction }).format(value || 0);
}

export function pct(value: number) {
  return `${(value || 0).toFixed(1)}%`;
}

export function dateText(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function dateTimeText(value?: string | null) {
  if (!value) return "ยังไม่มีข้อมูล";
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date(value));
}

export function displayDividend(stock: Stock) {
  const withDates = stock.dividends
    .filter((dividend) => Boolean(dividend.xdDate))
    .map((dividend) => ({ dividend, time: new Date(String(dividend.xdDate)).getTime() }))
    .filter((item) => Number.isFinite(item.time));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = withDates
    .filter((item) => item.time >= today.getTime())
    .sort((a, b) => a.time - b.time)[0];
  const latest = withDates.sort((a, b) => b.time - a.time)[0];
  return next?.dividend || latest?.dividend || null;
}

export function sortIcon(active: boolean, direction: SortDirection) {
  return active ? (direction === "asc" ? "↑" : "↓") : "↕";
}
