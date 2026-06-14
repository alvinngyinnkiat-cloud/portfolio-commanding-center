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

import { parseLocalDate } from "./date";

export function formatDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString("en-SG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
