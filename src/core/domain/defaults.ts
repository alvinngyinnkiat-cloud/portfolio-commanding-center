import type { ContributionTransaction } from "./types/contribution";
import type { Goal } from "./types/goal";
import type { DailySnapshot } from "./types/snapshot";
import type { DashboardSettings } from "./types/settings";
import type { CashBalances, ManualPortfolioValues } from "./types/portfolio";

export const DEFAULT_CASH_BALANCES: CashBalances = {
  usdTradingCashUsd: 0,
  sgdTradingCashSgd: 0,
  cryptoCashSgd: 0,
};

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && !Number.isNaN(value) ? value : fallback;
}

/** Backward-compatible cash balances (legacy stored cash fields are ignored). */
export function normalizeCashBalances(
  raw?: Partial<CashBalances> | null
): CashBalances {
  return {
    usdTradingCashUsd: safeNumber(raw?.usdTradingCashUsd),
    sgdTradingCashSgd: safeNumber(raw?.sgdTradingCashSgd),
    cryptoCashSgd: safeNumber(raw?.cryptoCashSgd),
  };
}

export const DEFAULT_MANUAL_VALUES: ManualPortfolioValues = {
  usStocksEtfUsd: 0,
  sgStocksSgd: 0,
  cryptoSgd: 0,
  clientPortfolioUsd: 0,
};

export const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
  usdSgdFxRate: 1.35,
  manualValues: DEFAULT_MANUAL_VALUES,
  brokerUsdCashOverride: null,
  brokerUsdCashLastUpdated: null,
};

export function normalizeManualPortfolioValues(
  raw?: Partial<ManualPortfolioValues> | null
): ManualPortfolioValues {
  const defaults = DEFAULT_MANUAL_VALUES;
  return {
    usStocksEtfUsd: safeNumber(raw?.usStocksEtfUsd, defaults.usStocksEtfUsd),
    sgStocksSgd: safeNumber(raw?.sgStocksSgd, defaults.sgStocksSgd),
    cryptoSgd: safeNumber(raw?.cryptoSgd, defaults.cryptoSgd),
    clientPortfolioUsd: safeNumber(
      raw?.clientPortfolioUsd,
      defaults.clientPortfolioUsd
    ),
  };
}

/** @deprecated Demo seed removed — returns empty list for fresh installs. */
export function generateDefaultContributions(): ContributionTransaction[] {
  return [];
}

export const DEFAULT_CONTRIBUTIONS: ContributionTransaction[] = [];

export const DEFAULT_GOALS: Goal[] = [];

/** @deprecated Demo seed removed — returns empty list for fresh installs. */
export function generateDefaultSnapshots(): DailySnapshot[] {
  return [];
}

export const DEFAULT_SNAPSHOTS: DailySnapshot[] = [];

const DEMO_CONTRIBUTION_IDS = new Set(["contrib-1", "contrib-2", "contrib-3"]);
const DEMO_GOAL_IDS = new Set(["goal-1", "goal-2"]);

const LEGACY_DEMO_MANUAL_VALUES: ManualPortfolioValues = {
  usStocksEtfUsd: 50_000,
  sgStocksSgd: 30_000,
  cryptoSgd: 15_000,
  clientPortfolioUsd: 15_000,
};

export function isDemoContributions(
  contributions: ContributionTransaction[]
): boolean {
  if (contributions.length !== 3) return false;
  return contributions.every((c) => DEMO_CONTRIBUTION_IDS.has(c.id));
}

export function isDemoGoals(goals: Goal[]): boolean {
  if (goals.length !== 2) return false;
  return goals.every((g) => DEMO_GOAL_IDS.has(g.id));
}

export function isDemoSnapshots(snapshots: DailySnapshot[]): boolean {
  if (snapshots.length !== 12) return false;
  return snapshots.every(
    (s) => s.clientPortfolio === 20_000 && s.snapshotType === "manual"
  );
}

export function isDemoManualValues(
  manualValues: ManualPortfolioValues
): boolean {
  return (
    manualValues.usStocksEtfUsd === LEGACY_DEMO_MANUAL_VALUES.usStocksEtfUsd &&
    manualValues.sgStocksSgd === LEGACY_DEMO_MANUAL_VALUES.sgStocksSgd &&
    manualValues.cryptoSgd === LEGACY_DEMO_MANUAL_VALUES.cryptoSgd &&
    manualValues.clientPortfolioUsd ===
      LEGACY_DEMO_MANUAL_VALUES.clientPortfolioUsd
  );
}
