import type {
  DailySnapshot,
  SnapshotChartSeries,
  SnapshotType,
} from "@/core/domain/types";
import type { PortfolioMetrics, PortfolioInputs } from "@/core/domain/types";
import {
  toLocalDateString,
  addLocalDays,
  addLocalMonths,
} from "@/shared/lib/date";
import { buildPortfolioBreakdown } from "./portfolio";
import { ALLOCATION_COLORS } from "./allocation";

export const SNAPSHOT_CHART_SERIES: Array<{
  key: SnapshotChartSeries;
  label: string;
  color: string;
}> = [
  { key: "ownPortfolio", label: "Portfolio", color: "#0ea5e9" },
  {
    key: "usStocksEtfSgd",
    label: "US Stocks",
    color: ALLOCATION_COLORS.usStocks,
  },
  {
    key: "sgStocksSgd",
    label: "SG Stocks",
    color: ALLOCATION_COLORS.sgStocks,
  },
  { key: "cryptoSgd", label: "Crypto", color: ALLOCATION_COLORS.crypto },
  {
    key: "cashSgd",
    label: "Personal Cash",
    color: ALLOCATION_COLORS.cash,
  },
];

export interface CreateDailySnapshotOptions {
  date?: string;
  createdAt?: string;
  snapshotType: SnapshotType;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && !Number.isNaN(value) ? value : fallback;
}

function normalizeSnapshotType(raw: unknown): SnapshotType {
  return raw === "automatic" ? "automatic" : "manual";
}

function normalizeCreatedAt(
  raw: Partial<DailySnapshot> & { date: string }
): string {
  if (typeof raw.createdAt === "string" && raw.createdAt.length > 0) {
    return raw.createdAt;
  }
  return `${raw.date}T00:00:00.000Z`;
}

function derivePersonalCashSgd(
  raw: Partial<DailySnapshot>,
  breakdown: DailySnapshot["breakdown"],
  clientPortfolio: number
): number {
  if (typeof raw.totalCashSgd === "number") {
    return Math.max(0, num(raw.totalCashSgd));
  }
  if (typeof raw.personalCashSgd === "number") {
    return Math.max(0, num(raw.personalCashSgd));
  }
  if (breakdown?.totalCashSgd !== undefined) {
    return Math.max(0, num(breakdown.totalCashSgd));
  }
  if (breakdown?.personalCashSgd !== undefined) {
    return Math.max(0, num(breakdown.personalCashSgd));
  }
  const legacyCash = num(raw.cashSgd, breakdown?.personalCashSgd);
  return Math.max(0, legacyCash - Math.min(clientPortfolio, legacyCash));
}

function resolveSnapshotTotalCashSgd(
  raw: Partial<DailySnapshot>,
  breakdown: DailySnapshot["breakdown"],
  clientPortfolio: number
): number {
  if (typeof raw.totalCashSgd === "number") {
    return Math.max(0, num(raw.totalCashSgd));
  }
  if (breakdown?.totalCashSgd !== undefined) {
    return Math.max(0, num(breakdown.totalCashSgd));
  }
  return derivePersonalCashSgd(raw, breakdown, clientPortfolio);
}

function resolveSnapshotCryptoHoldingsSgd(raw: Partial<DailySnapshot>): number {
  if (typeof raw.cryptoHoldingsValueSgd === "number") {
    return Math.max(0, num(raw.cryptoHoldingsValueSgd));
  }
  return Math.max(0, num(raw.cryptoSgd));
}

function resolveSnapshotNetOptionsSgd(
  raw: Partial<DailySnapshot>
): number | null {
  if (raw.netOptionsMarketValueSgd === null) return null;
  if (typeof raw.netOptionsMarketValueSgd === "number") {
    return num(raw.netOptionsMarketValueSgd);
  }
  return null;
}

export function normalizeDailySnapshot(
  raw: Partial<DailySnapshot> & { date: string }
): DailySnapshot {
  const breakdown = raw.breakdown;
  const clientPortfolio = num(raw.clientPortfolio);
  const usStocksEtfSgd = num(raw.usStocksEtfSgd, breakdown?.usStocksEtfSgd);
  const sgStocksSgd = num(raw.sgStocksSgd, breakdown?.sgStocksSgd);
  const cryptoHoldingsValueSgd = resolveSnapshotCryptoHoldingsSgd(raw);
  const totalCashSgd = resolveSnapshotTotalCashSgd(raw, breakdown, clientPortfolio);
  const personalCashSgd = totalCashSgd;
  const netOptionsMarketValueSgd = resolveSnapshotNetOptionsSgd(raw);
  const netOptionsForChart = netOptionsMarketValueSgd ?? 0;

  const ownPortfolio =
    raw.ownPortfolio !== undefined
      ? num(raw.ownPortfolio)
      : usStocksEtfSgd +
        netOptionsForChart +
        sgStocksSgd +
        cryptoHoldingsValueSgd +
        totalCashSgd;
  const totalPortfolio = ownPortfolio + clientPortfolio;

  return {
    date: raw.date,
    createdAt: normalizeCreatedAt(raw),
    snapshotType: normalizeSnapshotType(raw.snapshotType),
    ownPortfolio,
    totalPortfolio,
    clientPortfolio,
    totalContribution: num(raw.totalContribution),
    usStocksEtfSgd,
    sgStocksSgd,
    cryptoSgd: cryptoHoldingsValueSgd,
    personalCashSgd,
    cashSgd: totalCashSgd,
    netOptionsMarketValueSgd,
    cryptoHoldingsValueSgd,
    totalCashSgd,
    breakdown: raw.breakdown,
    fxRateUsed: raw.fxRateUsed,
  };
}

/** Chart series values — standardised daily worth formulas (SGD). */
export function getSnapshotChartValue(
  snapshot: DailySnapshot,
  series: SnapshotChartSeries
): number {
  switch (series) {
    case "ownPortfolio":
      return snapshot.ownPortfolio;
    case "usStocksEtfSgd":
      return (
        snapshot.usStocksEtfSgd + (snapshot.netOptionsMarketValueSgd ?? 0)
      );
    case "sgStocksSgd":
      return snapshot.sgStocksSgd;
    case "cryptoSgd":
      return snapshot.cryptoHoldingsValueSgd ?? snapshot.cryptoSgd;
    case "cashSgd":
      return (
        snapshot.totalCashSgd ??
        snapshot.breakdown?.totalCashSgd ??
        snapshot.personalCashSgd
      );
    default:
      return snapshot.ownPortfolio;
  }
}

export function filterSnapshotsByDays(
  snapshots: DailySnapshot[],
  days: number
): DailySnapshot[] {
  const cutoffStr = toLocalDateString(addLocalDays(new Date(), -days));
  return snapshots.filter((s) => s.date >= cutoffStr);
}

export function filterSnapshotsByMonths(
  snapshots: DailySnapshot[],
  months: number
): DailySnapshot[] {
  const cutoffStr = toLocalDateString(addLocalMonths(new Date(), -months));
  return snapshots.filter((s) => s.date >= cutoffStr);
}

/** When date filters exclude all data, show the most recent N snapshots. */
export function fallbackRecentSnapshots(
  snapshots: DailySnapshot[],
  count: number
): DailySnapshot[] {
  return [...snapshots]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-count);
}

export function calculateSnapshotStats(
  snapshots: DailySnapshot[],
  series: SnapshotChartSeries = "ownPortfolio"
) {
  if (snapshots.length === 0) {
    return { highest: 0, lowest: 0, average: 0 };
  }
  const values = snapshots.map((s) => getSnapshotChartValue(s, series));
  const highest = Math.max(...values);
  const lowest = Math.min(...values);
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  return { highest, lowest, average };
}

export function createDailySnapshot(
  inputs: PortfolioInputs,
  metrics: PortfolioMetrics,
  options: CreateDailySnapshotOptions
): DailySnapshot {
  const date = options.date ?? toLocalDateString();
  return normalizeDailySnapshot({
    date,
    createdAt: options.createdAt ?? new Date().toISOString(),
    snapshotType: options.snapshotType,
    ownPortfolio: metrics.ownPortfolio,
    totalPortfolio: metrics.totalPortfolio,
    clientPortfolio: metrics.clientPortfolio,
    totalContribution: metrics.totalContribution,
    usStocksEtfSgd: metrics.usStocksEtfSgd,
    sgStocksSgd: metrics.sgStocksSgd,
    cryptoSgd: metrics.cryptoHoldingsValueSgd,
    cryptoHoldingsValueSgd: metrics.cryptoHoldingsValueSgd,
    netOptionsMarketValueSgd: inputs.netOptionsMarketValueSgd,
    totalCashSgd: metrics.totalCashSgd,
    personalCashSgd: metrics.totalCashSgd,
    cashSgd: metrics.totalCashSgd,
    breakdown: buildPortfolioBreakdown(inputs, metrics),
    fxRateUsed: inputs.fxRate,
  });
}
