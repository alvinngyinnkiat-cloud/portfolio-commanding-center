import type { StockDailyCandle, StockPrice, ContributionTransaction } from "@/core/domain/types";
import type { StockTransaction } from "@/core/domain/types/stock";
import type { ScannerScanRun } from "@/core/domain/types/scanner";
import type { WatchlistEntry } from "@/core/calculations/scanner/watchlist";
import {
  buildScannerScanPriceMap,
  indexUsDailyCandlesByTicker,
  resolveScannerWatchlistPrice,
} from "@/core/calculations/scanner/price-engine";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";
import type {
  OptionsCapitalReadiness,
  OptionsClosedTradeRow,
  OptionsOpenTradeRow,
  OptionsPerformanceSummary,
  OptionsRiskByStrategy,
  OptionsRiskByTrade,
  OptionsRiskSummary,
  OptionsStrategy,
  OptionsTrackerSummary,
  OptionsTrade,
  OptionsTradeType,
  OptionsTradeTypePerformanceDetail,
  OptionsTypePerformance,
} from "@/core/domain/types/options";
import { usdToSgd } from "@/core/calculations/fx";
import { isValidFxRate } from "@/core/calculations/fx-validation";
import { calculateUsAvailableCashUsd } from "@/core/calculations/us-cash";
import {
  calculateRemainingCapacityUsd,
  calculateRiskUtilizationPercent,
  deriveCapacityStatus,
  sumOpenRiskUsd,
} from "./capacity";
import {
  daysBetween,
  daysToExpiration,
  formatOptionsStrategy,
  buildVerticalSpreadMetricsFromTrade,
  buildIronCondorMetricsFromTrade,
  sumRealizedOptionsPlUsd,
} from "./helpers";
import { calculateCloseCostUsd } from "./realized-pl";
import {
  calculateAggregateReturnPercent,
  calculateTradeReturnPercent,
} from "./return-percent";
import { splitForTrade, splitTradeAmount } from "./split";
import { calculateUnrealizedPlUsd } from "./unrealized-pl";
import {
  compareOpenTradesByDte,
  deriveDteStatus,
  summarizeActionRequiredOpenRisk,
} from "./dte-status";

export interface OptionsScannerPriceContext {
  watchlist: WatchlistEntry[];
  prices: StockPrice[];
  dailyCandles: StockDailyCandle[];
  latestScannerRun: ScannerScanRun | null;
}

export function buildOpenTradeRows(
  trades: OptionsTrade[],
  asOfDate?: string,
  scannerPriceContext?: OptionsScannerPriceContext
): OptionsOpenTradeRow[] {
  const scanPriceMap = buildScannerScanPriceMap(
    scannerPriceContext?.latestScannerRun?.results ?? []
  );
  const candlesByTicker = indexUsDailyCandlesByTicker(
    scannerPriceContext?.dailyCandles ?? []
  );

  const rows = trades
    .filter((trade) => trade.status === "open")
    .map((trade) => {
      const dte = daysToExpiration(trade.expirationDate, asOfDate);
      const unrealizedPlUsd =
        trade.currentValueUsd == null
          ? null
          : calculateUnrealizedPlUsd({
              openPremiumUsd: trade.openPremiumUsd,
              openFeesUsd: trade.openFeesUsd,
              currentValueUsd: trade.currentValueUsd,
            });
      const split =
        unrealizedPlUsd == null
          ? { userLegUsd: null, clientLegUsd: null }
          : splitForTrade(trade, unrealizedPlUsd);
      const ticker = normalizeTicker(trade.underlying);

      return {
        trade,
        spreadMetrics: buildVerticalSpreadMetricsFromTrade(trade),
        ironCondorMetrics: buildIronCondorMetricsFromTrade(trade),
        underlyingPrice: scannerPriceContext
          ? resolveScannerWatchlistPrice({
              underlying: trade.underlying,
              watchlist: scannerPriceContext.watchlist,
              prices: scannerPriceContext.prices,
              dailyCandles: candlesByTicker.get(ticker) ?? [],
              scannerScanPrice: scanPriceMap.get(ticker) ?? null,
              storedManualFallback: trade.underlyingPriceUsd,
            })
          : {
              priceUsd: null,
              source: "unavailable" as const,
              isWatchlistTicker: false,
              priceAsOf: null,
            },
        unrealizedPlUsd,
        userUnrealizedPlUsd: split.userLegUsd,
        clientUnrealizedPlUsd: split.clientLegUsd,
        daysToExpiration: dte,
        dteStatus: deriveDteStatus(dte),
        strategyDisplay: formatOptionsStrategy(trade.strategy, trade.strategyLabel),
      };
    });

  return rows.sort(compareOpenTradesByDte);
}

export function buildClosedTradeRows(trades: OptionsTrade[]): OptionsClosedTradeRow[] {
  return trades
    .filter((trade) => trade.status === "closed")
    .sort((a, b) => (b.closeDate ?? "").localeCompare(a.closeDate ?? ""))
    .map((trade) => {
      const realized = trade.realizedPlUsd ?? 0;
      const legs = splitForTrade(trade, realized);
      const returnPercent =
        trade.returnPercent ??
        calculateTradeReturnPercent(realized, trade.maxRiskUsd);
      return {
        trade,
        closeCostUsd: calculateCloseCostUsd({
          closePremiumUsd: trade.closePremiumUsd ?? 0,
          closeFeesUsd: trade.closeFeesUsd ?? 0,
        }),
        userRealizedPlUsd: legs.userLegUsd,
        clientRealizedPlUsd: legs.clientLegUsd,
        returnPercent,
        daysHeld: daysBetween(trade.openDate, trade.closeDate ?? trade.openDate),
        strategyDisplay: formatOptionsStrategy(trade.strategy, trade.strategyLabel),
      };
    });
}

function buildUsCashSnapshot(input: {
  contributions: ContributionTransaction[];
  stockTransactions: StockTransaction[];
  optionsTrades: OptionsTrade[];
  fxRate: number | null;
}) {
  const realizedOptionsPlUsd = sumRealizedOptionsPlUsd(input.optionsTrades);
  const usAvailableCashUsd = calculateUsAvailableCashUsd({
    contributions: input.contributions,
    stockTransactions: input.stockTransactions,
    fxRate: input.fxRate,
    realizedOptionsPlUsd,
  });
  const fxValid = isValidFxRate(input.fxRate) && input.fxRate != null;
  const usAvailableCashSgd = fxValid
    ? usdToSgd(usAvailableCashUsd, input.fxRate!)
    : 0;
  return { usAvailableCashUsd, usAvailableCashSgd, realizedOptionsPlUsd };
}

export function buildOptionsCapitalReadiness(input: {
  contributions: ContributionTransaction[];
  stockTransactions: StockTransaction[];
  optionsTrades: OptionsTrade[];
  fxRate: number | null;
}): OptionsCapitalReadiness {
  const cash = buildUsCashSnapshot(input);
  const totalOpenRiskUsd = sumOpenRiskUsd(input.optionsTrades);
  const remainingCapacityUsd = calculateRemainingCapacityUsd(
    cash.usAvailableCashUsd,
    totalOpenRiskUsd
  );

  return {
    usAvailableCashUsd: cash.usAvailableCashUsd,
    usAvailableCashSgd: cash.usAvailableCashSgd,
    totalOpenRiskUsd,
    remainingCapacityUsd,
    capacityStatus: deriveCapacityStatus(remainingCapacityUsd),
    riskUtilizationPercent: calculateRiskUtilizationPercent(
      totalOpenRiskUsd,
      cash.usAvailableCashUsd
    ),
  };
}

export function buildOptionsTrackerSummary(input: {
  contributions: ContributionTransaction[];
  stockTransactions: StockTransaction[];
  optionsTrades: OptionsTrade[];
  fxRate: number | null;
}): OptionsTrackerSummary {
  const readiness = buildOptionsCapitalReadiness(input);
  const openTrades = input.optionsTrades.filter((trade) => trade.status === "open");
  const closedTrades = input.optionsTrades.filter((trade) => trade.status === "closed");
  const today = new Date().toISOString().slice(0, 10);

  const actionRequired = summarizeActionRequiredOpenRisk(
    openTrades.map((trade) => ({
      daysToExpiration: daysToExpiration(trade.expirationDate, today),
      maxRiskUsd: trade.maxRiskUsd,
    }))
  );

  let totalUnrealized: number | null = 0;
  let userUnrealized: number | null = 0;
  let clientUnrealized: number | null = 0;
  let markedOpenCount = 0;
  let hasMarked = false;

  for (const trade of openTrades) {
    if (trade.currentValueUsd == null) continue;
    markedOpenCount += 1;
    hasMarked = true;
    const unrealized = calculateUnrealizedPlUsd({
      openPremiumUsd: trade.openPremiumUsd,
      openFeesUsd: trade.openFeesUsd,
      currentValueUsd: trade.currentValueUsd,
    });
    totalUnrealized! += unrealized;
    const legs = splitForTrade(trade, unrealized);
    userUnrealized! += legs.userLegUsd;
    if (trade.tradeType === "shared") {
      clientUnrealized! += legs.clientLegUsd;
    }
  }
  if (!hasMarked) {
    totalUnrealized = null;
    userUnrealized = null;
    clientUnrealized = null;
  }

  let totalRealizedPlUsd = 0;
  let userRealizedPlUsd = 0;
  let clientRealizedPlUsd = 0;
  for (const trade of closedTrades) {
    const realized = trade.realizedPlUsd ?? 0;
    totalRealizedPlUsd += realized;
    const legs = splitForTrade(trade, realized);
    userRealizedPlUsd += legs.userLegUsd;
    if (trade.tradeType === "shared") {
      clientRealizedPlUsd += legs.clientLegUsd;
    }
  }

  const personalPerformance = buildTradeTypePerformanceDetail(
    input.optionsTrades,
    "personal"
  );
  const sharedPerformance = buildTradeTypePerformanceDetail(
    input.optionsTrades,
    "shared"
  );

  return {
    usAvailableCashUsd: readiness.usAvailableCashUsd,
    usAvailableCashSgd: readiness.usAvailableCashSgd,
    totalOpenRiskUsd: readiness.totalOpenRiskUsd,
    totalUnrealizedPlUsd: totalUnrealized,
    userUnrealizedPlUsd: userUnrealized,
    clientUnrealizedPlUsd: clientUnrealized,
    markedOpenCount,
    openTradeCount: openTrades.length,
    totalRealizedPlUsd,
    userRealizedPlUsd,
    clientRealizedPlUsd,
    closedTradeCount: closedTrades.length,
    personalReturnPercent: personalPerformance.returnPercent,
    sharedReturnPercent: sharedPerformance.returnPercent,
    remainingCapacityUsd: readiness.remainingCapacityUsd,
    capacityStatus: readiness.capacityStatus,
    tradesRequiringActionCount: actionRequired.tradesRequiringActionCount,
    openRiskRequiringActionUsd: actionRequired.openRiskRequiringActionUsd,
  };
}

export function buildOptionsRiskSummary(input: {
  contributions: ContributionTransaction[];
  stockTransactions: StockTransaction[];
  optionsTrades: OptionsTrade[];
  fxRate: number | null;
  asOfDate?: string;
}): OptionsRiskSummary {
  const readiness = buildOptionsCapitalReadiness(input);
  const openTrades = input.optionsTrades.filter((trade) => trade.status === "open");
  const totalOpenRiskUsd = readiness.totalOpenRiskUsd;
  const today = input.asOfDate ?? new Date().toISOString().slice(0, 10);

  const byTrade: OptionsRiskByTrade[] = openTrades
    .map((trade) => {
      const legs = splitForTrade(trade, trade.maxRiskUsd);
      return {
        tradeId: trade.id,
        underlying: trade.underlying,
        strategyDisplay: formatOptionsStrategy(trade.strategy, trade.strategyLabel),
        tradeType: trade.tradeType,
        splitLabel: `${trade.userSharePercent}/${trade.clientSharePercent}`,
        maxRiskUsd: trade.maxRiskUsd,
        userRiskUsd: legs.userLegUsd,
        percentOfPool:
          totalOpenRiskUsd > 0 ? (trade.maxRiskUsd / totalOpenRiskUsd) * 100 : 0,
      };
    })
    .sort((a, b) => b.maxRiskUsd - a.maxRiskUsd);

  const strategyMap = new Map<OptionsStrategy, OptionsRiskByStrategy>();
  for (const trade of openTrades) {
    const existing = strategyMap.get(trade.strategy);
    if (!existing) {
      strategyMap.set(trade.strategy, {
        strategy: trade.strategy,
        strategyDisplay: formatOptionsStrategy(trade.strategy, trade.strategyLabel),
        openCount: 1,
        totalRiskUsd: trade.maxRiskUsd,
        avgRiskUsd: trade.maxRiskUsd,
        percentOfPool: 0,
      });
    } else {
      existing.openCount += 1;
      existing.totalRiskUsd += trade.maxRiskUsd;
      existing.avgRiskUsd = existing.totalRiskUsd / existing.openCount;
    }
  }

  const byStrategy = [...strategyMap.values()]
    .map((row) => ({
      ...row,
      percentOfPool:
        totalOpenRiskUsd > 0 ? (row.totalRiskUsd / totalOpenRiskUsd) * 100 : 0,
    }))
    .sort((a, b) => b.totalRiskUsd - a.totalRiskUsd);

  let personalRiskUsd = 0;
  let sharedRiskUsd = 0;
  let userRiskLegUsd = 0;
  let clientRiskLegUsd = 0;
  let expiring7DayRiskUsd = 0;
  let expiring30DayRiskUsd = 0;

  for (const trade of openTrades) {
    const legs = splitForTrade(trade, trade.maxRiskUsd);
    userRiskLegUsd += legs.userLegUsd;
    clientRiskLegUsd += legs.clientLegUsd;
    if (trade.tradeType === "personal") personalRiskUsd += trade.maxRiskUsd;
    else sharedRiskUsd += trade.maxRiskUsd;

    const dte = daysToExpiration(trade.expirationDate, today);
    if (dte <= 7) expiring7DayRiskUsd += trade.maxRiskUsd;
    if (dte <= 30) expiring30DayRiskUsd += trade.maxRiskUsd;
  }

  const largest = byTrade[0];

  return {
    openTradeCount: openTrades.length,
    totalOpenRiskUsd,
    avgRiskPerTradeUsd:
      openTrades.length > 0 ? totalOpenRiskUsd / openTrades.length : 0,
    largestRiskUsd: largest?.maxRiskUsd ?? 0,
    largestRiskUnderlying: largest?.underlying ?? "—",
    remainingCapacityUsd: readiness.remainingCapacityUsd,
    capacityStatus: readiness.capacityStatus,
    byTrade,
    byStrategy,
    personalRiskUsd,
    sharedRiskUsd,
    userRiskLegUsd,
    clientRiskLegUsd,
    expiring7DayRiskUsd,
    expiring30DayRiskUsd,
  };
}

export function buildOptionsPerformanceSummary(
  trades: OptionsTrade[],
  filters?: {
    year?: number;
    tradeType?: OptionsTrade["tradeType"] | "all";
    strategy?: OptionsStrategy | "all";
  }
): OptionsPerformanceSummary {
  let closed = trades.filter((trade) => trade.status === "closed");
  const open = trades.filter((trade) => trade.status === "open");

  if (filters?.year != null) {
    closed = closed.filter((trade) =>
      (trade.closeDate ?? "").startsWith(String(filters.year))
    );
  }
  if (filters?.tradeType && filters.tradeType !== "all") {
    closed = closed.filter((trade) => trade.tradeType === filters.tradeType);
  }
  if (filters?.strategy && filters.strategy !== "all") {
    closed = closed.filter((trade) => trade.strategy === filters.strategy);
  }

  let winCount = 0;
  let lossCount = 0;
  let totalRealizedPlUsd = 0;
  let userRealizedPlUsd = 0;
  let clientRealizedPlUsd = 0;
  let totalDaysHeld = 0;
  let winTotal = 0;
  let lossTotal = 0;
  let bestPlUsd = closed.length > 0 ? Number.NEGATIVE_INFINITY : 0;
  let worstPlUsd = closed.length > 0 ? Number.POSITIVE_INFINITY : 0;

  const monthlyMap = new Map<string, OptionsPerformanceSummary["monthlyRealized"][number]>();

  for (const trade of closed) {
    const realized = trade.realizedPlUsd ?? 0;
    const legs = splitForTrade(trade, realized);
    totalRealizedPlUsd += realized;
    userRealizedPlUsd += legs.userLegUsd;
    if (trade.tradeType === "shared") clientRealizedPlUsd += legs.clientLegUsd;

    if (realized > 0) {
      winCount += 1;
      winTotal += realized;
    } else if (realized < 0) {
      lossCount += 1;
      lossTotal += realized;
    }

    bestPlUsd = Math.max(bestPlUsd, realized);
    worstPlUsd = Math.min(worstPlUsd, realized);
    totalDaysHeld += daysBetween(trade.openDate, trade.closeDate ?? trade.openDate);

    const closeDate = trade.closeDate ?? "";
    const monthKey = closeDate.slice(0, 7);
    if (monthKey) {
      const existing = monthlyMap.get(monthKey) ?? {
        monthKey,
        label: monthKey,
        totalRealizedPlUsd: 0,
        userRealizedPlUsd: 0,
      };
      existing.totalRealizedPlUsd += realized;
      existing.userRealizedPlUsd += legs.userLegUsd;
      monthlyMap.set(monthKey, existing);
    }
  }

  let totalUnrealized: number | null = 0;
  let markedOpenCount = 0;
  let hasMarked = false;
  for (const trade of open) {
    if (trade.currentValueUsd == null) continue;
    markedOpenCount += 1;
    hasMarked = true;
    totalUnrealized! += calculateUnrealizedPlUsd({
      openPremiumUsd: trade.openPremiumUsd,
      openFeesUsd: trade.openFeesUsd,
      currentValueUsd: trade.currentValueUsd,
    });
  }
  if (!hasMarked) totalUnrealized = null;

  const strategyKeys: OptionsStrategy[] = [
    "bullPut",
    "bearCall",
    "ironCondor",
    "custom",
  ];
  const byStrategy = strategyKeys
    .map((strategy) => buildStrategyPerformance(closed, strategy))
    .filter((row) => row.closedCount > 0);

  const byType: OptionsTypePerformance[] = (["personal", "shared"] as const).map(
    (tradeType) => buildTypePerformance(closed, tradeType)
  );

  return {
    closedCount: closed.length,
    winCount,
    lossCount,
    winRatePercent: closed.length > 0 ? (winCount / closed.length) * 100 : 0,
    totalRealizedPlUsd,
    userRealizedPlUsd,
    clientRealizedPlUsd,
    avgRealizedPlUsd: closed.length > 0 ? totalRealizedPlUsd / closed.length : 0,
    avgWinUsd: winCount > 0 ? winTotal / winCount : 0,
    avgLossUsd: lossCount > 0 ? lossTotal / lossCount : 0,
    avgDaysHeld: closed.length > 0 ? totalDaysHeld / closed.length : 0,
    bestPlUsd: closed.length > 0 ? bestPlUsd : 0,
    worstPlUsd: closed.length > 0 ? worstPlUsd : 0,
    totalUnrealizedPlUsd: totalUnrealized,
    markedOpenCount,
    openTradeCount: open.length,
    byStrategy,
    byType,
    monthlyRealized: [...monthlyMap.values()].sort((a, b) =>
      a.monthKey.localeCompare(b.monthKey)
    ),
  };
}

export function buildTradeTypePerformanceDetail(
  trades: OptionsTrade[],
  tradeType: OptionsTradeType,
  filters?: { year?: number }
): OptionsTradeTypePerformanceDetail {
  let closed = trades.filter(
    (trade) => trade.status === "closed" && trade.tradeType === tradeType
  );

  if (filters?.year != null) {
    closed = closed.filter((trade) =>
      (trade.closeDate ?? "").startsWith(String(filters.year))
    );
  }

  let winCount = 0;
  let lossCount = 0;
  let totalRealizedPlUsd = 0;
  let totalMaxRiskUsd = 0;
  let totalDaysHeld = 0;
  let winTotal = 0;
  let lossTotal = 0;

  for (const trade of closed) {
    const realized = trade.realizedPlUsd ?? 0;
    totalRealizedPlUsd += realized;
    totalMaxRiskUsd += trade.maxRiskUsd;
    totalDaysHeld += daysBetween(trade.openDate, trade.closeDate ?? trade.openDate);

    if (realized > 0) {
      winCount += 1;
      winTotal += realized;
    } else if (realized < 0) {
      lossCount += 1;
      lossTotal += realized;
    }
  }

  return {
    closedCount: closed.length,
    winCount,
    lossCount,
    winRatePercent: closed.length > 0 ? (winCount / closed.length) * 100 : 0,
    avgWinUsd: winCount > 0 ? winTotal / winCount : 0,
    avgLossUsd: lossCount > 0 ? lossTotal / lossCount : 0,
    totalRealizedPlUsd,
    avgDaysHeld: closed.length > 0 ? totalDaysHeld / closed.length : 0,
    totalMaxRiskUsd,
    returnPercent: calculateAggregateReturnPercent(
      totalRealizedPlUsd,
      totalMaxRiskUsd
    ),
  };
}

function buildStrategyPerformance(
  closed: OptionsTrade[],
  strategy: OptionsStrategy
) {
  const rows = closed.filter((trade) => trade.strategy === strategy);
  let total = 0;
  let userTotal = 0;
  let wins = 0;
  let best = rows.length > 0 ? Number.NEGATIVE_INFINITY : 0;
  let worst = rows.length > 0 ? Number.POSITIVE_INFINITY : 0;

  for (const trade of rows) {
    const realized = trade.realizedPlUsd ?? 0;
    total += realized;
    userTotal += splitForTrade(trade, realized).userLegUsd;
    if (realized > 0) wins += 1;
    best = Math.max(best, realized);
    worst = Math.min(worst, realized);
  }

  return {
    strategy,
    strategyDisplay: formatOptionsStrategy(strategy),
    closedCount: rows.length,
    totalRealizedPlUsd: total,
    userRealizedPlUsd: userTotal,
    winCount: wins,
    lossCount: rows.length - wins,
    winRatePercent: rows.length > 0 ? (wins / rows.length) * 100 : 0,
    avgRealizedPlUsd: rows.length > 0 ? total / rows.length : 0,
    bestPlUsd: rows.length > 0 ? best : 0,
    worstPlUsd: rows.length > 0 ? worst : 0,
  };
}

function buildTypePerformance(
  closed: OptionsTrade[],
  tradeType: OptionsTrade["tradeType"]
): OptionsTypePerformance {
  const rows = closed.filter((trade) => trade.tradeType === tradeType);
  let total = 0;
  let userTotal = 0;
  let wins = 0;
  let totalDays = 0;

  for (const trade of rows) {
    const realized = trade.realizedPlUsd ?? 0;
    total += realized;
    userTotal += splitForTrade(trade, realized).userLegUsd;
    if (realized > 0) wins += 1;
    totalDays += daysBetween(trade.openDate, trade.closeDate ?? trade.openDate);
  }

  return {
    tradeType,
    closedCount: rows.length,
    totalRealizedPlUsd: total,
    userRealizedPlUsd: userTotal,
    winRatePercent: rows.length > 0 ? (wins / rows.length) * 100 : 0,
    avgDaysHeld: rows.length > 0 ? totalDays / rows.length : 0,
  };
}
