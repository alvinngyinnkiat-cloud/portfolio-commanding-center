import { coerceNumber } from "./coerce-number";

export function formatSgd(
  value: number | null | undefined,
  decimals = 2
): string {
  const n = coerceNumber(value);
  return `S$${n.toLocaleString("en-SG", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatUsd(
  value: number | null | undefined,
  decimals = 2
): string {
  const n = coerceNumber(value);
  return `US$${n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatPercent(
  value: number | null | undefined,
  decimals = 2
): string {
  const n = coerceNumber(value);
  return `${n.toLocaleString("en-SG", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}

import { parseIsoDateString, parseLocalDate } from "./date";

export function formatDate(dateStr: string): string {
  const iso = parseIsoDateString(dateStr);
  if (!iso) return dateStr;
  const d = parseLocalDate(iso);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-SG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Display crypto trade dates (DD MMM YYYY); storage remains YYYY-MM-DD. */
export function formatCryptoTradeDate(dateStr: string | undefined | null): string {
  const iso = parseIsoDateString(dateStr ?? "");
  if (!iso || iso === "1970-01-01") {
    return "Date missing";
  }
  return formatDate(iso);
}

export function formatDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) {
    return isoStr;
  }
  return d.toLocaleString("en-SG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatSingaporeDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) {
    return isoStr;
  }
  const formatted = d.toLocaleString("en-SG", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${formatted} SGT`;
}
