import type {
  OptionsPerformanceScopeDetail,
  OptionsStrategy,
  OptionsStrategyBreakdownRow,
  OptionsMonthlyPerformanceRow,
  OptionsTrade,
} from "@/core/domain/types/options";
import { daysBetween, formatOptionsStrategy } from "./helpers";
import { calculateAggregateReturnPercent } from "./return-percent";
import { calculateProfitFactorMetrics } from "./profit-factor";
import { splitForTrade } from "./split";

export type PerformanceScope = "total" | "personal" | "client";

const STRATEGY_KEYS: OptionsStrategy[] = [
  "bullPut",
  "bearCall",
  "ironCondor",
  "custom",
];

export interface PerformanceFilters {
  year?: number;
}

function filterClosedTrades(
  trades: OptionsTrade[],
  filters?: PerformanceFilters
): OptionsTrade[] {
  let closed = trades.filter((trade) => trade.status === "closed");
  if (filters?.year != null) {
    closed = closed.filter((trade) =>
      (trade.closeDate ?? "").startsWith(String(filters.year))
    );
  }
  return closed;
}

/** Scoped realized P/L and max risk for performance reporting. */
export function scopeTradePerformanceAmounts(
  trade: OptionsTrade,
  scope: PerformanceScope
): { realizedUsd: number; maxRiskUsd: number } | null {
  if (scope === "total") {
    return {
      realizedUsd: trade.realizedPlUsd ?? 0,
      maxRiskUsd: trade.maxRiskUsd,
    };
  }

  if (scope === "personal") {
    if (trade.tradeType !== "personal") return null;
    return {
      realizedUsd: trade.realizedPlUsd ?? 0,
      maxRiskUsd: trade.maxRiskUsd,
    };
  }

  if (trade.tradeType !== "shared") return null;
  const realized = trade.realizedPlUsd ?? 0;
  const realizedLegs = splitForTrade(trade, realized);
  const riskLegs = splitForTrade(trade, trade.maxRiskUsd);
  return {
    realizedUsd: realizedLegs.clientLegUsd,
    maxRiskUsd: riskLegs.clientLegUsd,
  };
}

function accumulateScopeMetrics(
  trades: OptionsTrade[],
  scope: PerformanceScope
): OptionsPerformanceScopeDetail {
  let winCount = 0;
  let lossCount = 0;
  let totalRealizedPlUsd = 0;
  let totalMaxRiskUsd = 0;
  let totalDaysHeld = 0;
  let winTotal = 0;
  let lossTotal = 0;
  let closedCount = 0;

  for (const trade of trades) {
    const amounts = scopeTradePerformanceAmounts(trade, scope);
    if (amounts == null) continue;

    closedCount += 1;
    const { realizedUsd, maxRiskUsd } = amounts;
    totalRealizedPlUsd += realizedUsd;
    totalMaxRiskUsd += maxRiskUsd;
    totalDaysHeld += daysBetween(trade.openDate, trade.closeDate ?? trade.openDate);

    if (realizedUsd > 0) {
      winCount += 1;
      winTotal += realizedUsd;
    } else if (realizedUsd < 0) {
      lossCount += 1;
      lossTotal += realizedUsd;
    }
  }

  const grossProfitUsd = winTotal;
  const grossLossUsd = Math.abs(lossTotal);
  const profitFactor = calculateProfitFactorMetrics(
    grossProfitUsd,
    grossLossUsd,
    closedCount
  );

  return {
    closedCount,
    winCount,
    lossCount,
    winRatePercent: closedCount > 0 ? (winCount / closedCount) * 100 : 0,
    avgWinUsd: winCount > 0 ? winTotal / winCount : 0,
    avgLossUsd: lossCount > 0 ? lossTotal / lossCount : 0,
    totalRealizedPlUsd,
    avgDaysHeld: closedCount > 0 ? totalDaysHeld / closedCount : 0,
    totalMaxRiskUsd,
    returnPercent: calculateAggregateReturnPercent(
      totalRealizedPlUsd,
      totalMaxRiskUsd
    ),
    grossProfitUsd: profitFactor.grossProfitUsd,
    grossLossUsd: profitFactor.grossLossUsd,
    profitFactorLabel: profitFactor.label,
    profitFactorValue: profitFactor.value,
    profitFactorKind: profitFactor.kind,
  };
}

export function buildPerformanceScopeDetail(
  trades: OptionsTrade[],
  scope: PerformanceScope,
  filters?: PerformanceFilters
): OptionsPerformanceScopeDetail {
  return accumulateScopeMetrics(filterClosedTrades(trades, filters), scope);
}

function accumulateStrategyMetrics(
  trades: OptionsTrade[],
  strategy: OptionsStrategy,
  scope: PerformanceScope
): OptionsStrategyBreakdownRow {
  const strategyTrades = trades.filter((trade) => trade.strategy === strategy);

  let winCount = 0;
  let lossCount = 0;
  let totalRealizedPlUsd = 0;
  let totalMaxRiskUsd = 0;
  let winTotal = 0;
  let lossTotal = 0;
  let closedCount = 0;

  for (const trade of strategyTrades) {
    const amounts = scopeTradePerformanceAmounts(trade, scope);
    if (amounts == null) continue;

    closedCount += 1;
    const { realizedUsd, maxRiskUsd } = amounts;
    totalRealizedPlUsd += realizedUsd;
    totalMaxRiskUsd += maxRiskUsd;

    if (realizedUsd > 0) {
      winCount += 1;
      winTotal += realizedUsd;
    } else if (realizedUsd < 0) {
      lossCount += 1;
      lossTotal += realizedUsd;
    }
  }

  return {
    strategy,
    strategyDisplay: formatOptionsStrategy(strategy),
    closedCount,
    winCount,
    lossCount,
    winRatePercent: closedCount > 0 ? (winCount / closedCount) * 100 : 0,
    avgWinUsd: winCount > 0 ? winTotal / winCount : 0,
    avgLossUsd: lossCount > 0 ? lossTotal / lossCount : 0,
    totalRealizedPlUsd,
    totalMaxRiskUsd,
    returnPercent: calculateAggregateReturnPercent(
      totalRealizedPlUsd,
      totalMaxRiskUsd
    ),
  };
}

export function buildStrategyBreakdown(
  trades: OptionsTrade[],
  scope: PerformanceScope,
  filters?: PerformanceFilters
): OptionsStrategyBreakdownRow[] {
  const closed = filterClosedTrades(trades, filters);
  return STRATEGY_KEYS.map((strategy) =>
    accumulateStrategyMetrics(closed, strategy, scope)
  );
}

export function buildMonthlyPerformance(
  trades: OptionsTrade[],
  scope: PerformanceScope,
  filters?: PerformanceFilters
): OptionsMonthlyPerformanceRow[] {
  const closed = filterClosedTrades(trades, filters);
  const monthlyMap = new Map<string, OptionsMonthlyPerformanceRow>();

  for (const trade of closed) {
    const amounts = scopeTradePerformanceAmounts(trade, scope);
    if (amounts == null) continue;

    const closeDate = trade.closeDate ?? "";
    const monthKey = closeDate.slice(0, 7);
    if (!monthKey) continue;

    const existing = monthlyMap.get(monthKey) ?? {
      monthKey,
      label: monthKey,
      realizedPlUsd: 0,
    };
    existing.realizedPlUsd += amounts.realizedUsd;
    monthlyMap.set(monthKey, existing);
  }

  return [...monthlyMap.values()].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}
