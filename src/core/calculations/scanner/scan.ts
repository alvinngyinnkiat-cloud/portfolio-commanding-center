import type { StockDailyCandle, StockPrice, StockWeeklyCandle } from "@/core/domain/types";
import type { WatchlistEntry } from "./watchlist";
import type {
  EmaStrategyResult,
  MainSystemDisplay,
  ScannerTickerResult,
} from "@/core/domain/types/scanner";
import { computeIndicators, filterCompletedDailyCandles } from "./indicators";
import { computeStructure } from "./structure";
import {
  scoreBearCall,
  scoreBullPut,
  scoreIronCondor,
} from "./scoring";
import { pickBestSetup } from "./trade-reasons";
import {
  deriveSoStatus,
  evaluateEmaStrategy,
} from "./ema-strategy";
import { buildRecentChartCandles } from "./chart-candles";
import { evaluateMainSystemDisplay } from "./main-system-display";
import {
  deriveMarketStructure,
  deriveMomentum,
} from "./structure-momentum";
import {
  computeAvgPricePrev,
  computeEma20Prev,
  computeEmaDiff,
  computeSma50Prev,
  computeSma200Prev,
  computeSma50SlopePct,
} from "./extended-indicators";
import { resolveScannerTickerCurrentPrice } from "./resolve-scanner-ticker-price";

export interface ScanTickerInput {
  entry: WatchlistEntry;
  dailyCandles: StockDailyCandle[];
  weeklyCandles: StockWeeklyCandle[];
  price: StockPrice | null;
}

export const SCANNER_INDICATOR_CANDLES_REQUIRED = 200;

const EMPTY_EMA: EmaStrategyResult = {
  output: "NO TRADE",
  reasons: ["Insufficient data"],
  checklist: [],
};

const EMPTY_MAIN: MainSystemDisplay = {
  output: "NO TRADE",
  strategy: null,
  reasons: ["Insufficient data"],
};

export function scanTicker(input: ScanTickerInput): ScannerTickerResult {
  const { entry, dailyCandles, weeklyCandles, price } = input;
  const notes: string[] = [];
  const candlesAvailable = dailyCandles.length;

  const resolvedPrice = resolveScannerTickerCurrentPrice({ dailyCandles, price });
  if (!resolvedPrice) {
    return incompleteResult(
      entry,
      notes,
      "Current price unavailable — no quote or daily candle data",
      candlesAvailable
    );
  }

  const dailyBars = filterCompletedDailyCandles(
    dailyCandles.map((bar) => ({
      date: bar.date,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
    }))
  );
  const recentCandles = buildRecentChartCandles(dailyBars);

  if (candlesAvailable < SCANNER_INDICATOR_CANDLES_REQUIRED) {
    const reason = `Insufficient daily history: ${candlesAvailable}/${SCANNER_INDICATOR_CANDLES_REQUIRED} sessions`;
    notes.push(reason);
    return priceOnlyResult({
      entry,
      notes,
      resolvedPrice,
      recentCandles,
      candlesAvailable,
      indicatorError: reason,
    });
  }

  const weeklyBars = weeklyCandles.map((bar) => ({
    date: bar.date,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
  }));

  const indicatorValues = computeIndicators(dailyBars, resolvedPrice.currentPrice);
  const structure = computeStructure(
    dailyBars,
    weeklyBars,
    indicatorValues.atr14
  );

  const ema20Prev = computeEma20Prev(dailyBars);
  const sma50Prev = computeSma50Prev(dailyBars);
  const sma200Prev = computeSma200Prev(dailyBars);
  const avgPricePrev = computeAvgPricePrev(dailyBars);
  const { emaDiff, emaDiffPct } = computeEmaDiff(
    indicatorValues.avgPrice,
    indicatorValues.ema20
  );
  const soStatus = deriveSoStatus(indicatorValues.so, indicatorValues.soPrev);
  const marketStructure = deriveMarketStructure(
    indicatorValues.ema20,
    indicatorValues.sma50,
    indicatorValues.sma200
  );
  const momentum = deriveMomentum(indicatorValues.avgPrice, indicatorValues.ema20);

  const bullPut = scoreBullPut({
    soStatus,
    marketStructure,
    momentum,
    avgPrice: indicatorValues.avgPrice,
    avgPricePrev,
    primarySupport: structure.primarySupport,
    atr14: indicatorValues.atr14,
    sellPutRange: structure.sellPutRange,
  });

  const bearCall = scoreBearCall({
    soStatus,
    marketStructure,
    momentum,
    avgPrice: indicatorValues.avgPrice,
    avgPricePrev,
    primaryResistance: structure.primaryResistance,
    atr14: indicatorValues.atr14,
    sellCallRange: structure.sellCallRange,
  });

  const ironCondor = scoreIronCondor({
    so: indicatorValues.so,
    marketStructure,
    momentum,
    soStatus,
    avgPrice: indicatorValues.avgPrice,
    avgPricePrev,
    midPrice: structure.midPrice,
    atr14: indicatorValues.atr14,
    icMidZone: structure.icMidZone,
    rangeWidth: structure.rangeWidth,
  });

  const strategies = { bullPut, bearCall, ironCondor };
  const bestSetup = pickBestSetup(strategies);

  const emaStrategy = evaluateEmaStrategy({
    soStatus,
    avgPrice: indicatorValues.avgPrice,
    avgPricePrev,
    ema20: indicatorValues.ema20,
    sma200: indicatorValues.sma200,
    emaDiffPct,
    marketStructure,
    primarySupport: structure.primarySupport,
    primaryResistance: structure.primaryResistance,
    atr14: indicatorValues.atr14,
  });

  const mainSystem = evaluateMainSystemDisplay({
    bullPut,
    bearCall,
    ironCondor,
    marketStructure,
    momentum,
    so: indicatorValues.so,
    soStatus,
    avgPrice: indicatorValues.avgPrice,
    avgPricePrev,
    midPrice: structure.midPrice,
    atr14: indicatorValues.atr14,
    icMidZone: structure.icMidZone,
  });

  return {
    ticker: entry.ticker,
    category: entry.category,
    market: entry.market,
    currentPrice: resolvedPrice.currentPrice,
    priceAsOf: resolvedPrice.marketDate,
    priceSource: resolvedPrice.priceSource,
    priceSourceKey: resolvedPrice.priceSourceKey,
    priceStatus: resolvedPrice.priceStatus,
    indicatorStatus: "ready",
    indicatorError: null,
    candlesAvailable,
    candlesRequired: SCANNER_INDICATOR_CANDLES_REQUIRED,
    indicators: {
      ema20: indicatorValues.ema20,
      ema20Prev,
      sma50: indicatorValues.sma50,
      sma50Prev,
      sma50SlopePct: computeSma50SlopePct(indicatorValues.sma50, sma50Prev),
      sma200: indicatorValues.sma200,
      sma200Prev,
      atr14: indicatorValues.atr14,
      so: indicatorValues.so,
      soPrev: indicatorValues.soPrev,
      soStatus,
      soDebug: indicatorValues.soDebug,
      atrDebug: indicatorValues.atrDebug,
      high: indicatorValues.high,
      low: indicatorValues.low,
      avgPrice: indicatorValues.avgPrice,
      avgPricePrev,
      emaDiff,
      emaDiffPct,
      marketStructure,
      momentum,
      trend: marketStructure,
      trendQualityScore: Math.max(
        indicatorValues.trendQualityBullPut,
        indicatorValues.trendQualityBearCall
      ),
    },
    structure,
    strategies,
    emaStrategy,
    mainSystem,
    bestSetup,
    tradable: mainSystem.output !== "NO TRADE",
    tradeReasons: [],
    recentCandles,
    status: "ok",
    notes,
  };
}

function emptyIndicators(): ScannerTickerResult["indicators"] {
  return {
    ema20: null,
    ema20Prev: null,
    sma50: null,
    sma50Prev: null,
    sma50SlopePct: null,
    sma200: null,
    sma200Prev: null,
    atr14: null,
    so: null,
    soPrev: null,
    soStatus: "Rolling Down",
    soDebug: null,
    atrDebug: null,
    high: null,
    low: null,
    avgPrice: null,
    avgPricePrev: null,
    emaDiff: null,
    emaDiffPct: null,
    marketStructure: "Neutral",
    momentum: "At EMA",
    trend: "Neutral",
    trendQualityScore: 0,
  };
}

function emptyStructure(): ScannerTickerResult["structure"] {
  return {
    dailySupport: null,
    weeklySupport: null,
    primarySupport: null,
    dailyResistance: null,
    weeklyResistance: null,
    primaryResistance: null,
    midPrice: null,
    rangeWidth: null,
    sellPutRange: null,
    sellCallRange: null,
    icMidZone: null,
  };
}

function emptyStrategies(reason: string): ScannerTickerResult["strategies"] {
  const emptyStrategy = {
    eligible: false,
    checklist: [],
    passReasons: [],
    failReasons: [reason],
  };
  return {
    bullPut: emptyStrategy,
    bearCall: emptyStrategy,
    ironCondor: emptyStrategy,
  };
}

function priceOnlyResult(input: {
  entry: WatchlistEntry;
  notes: string[];
  resolvedPrice: NonNullable<ReturnType<typeof resolveScannerTickerCurrentPrice>>;
  recentCandles: ScannerTickerResult["recentCandles"];
  candlesAvailable: number;
  indicatorError: string;
}): ScannerTickerResult {
  const reason = input.indicatorError;
  return {
    ticker: input.entry.ticker,
    category: input.entry.category,
    market: input.entry.market,
    currentPrice: input.resolvedPrice.currentPrice,
    priceAsOf: input.resolvedPrice.marketDate,
    priceSource: input.resolvedPrice.priceSource,
    priceSourceKey: input.resolvedPrice.priceSourceKey,
    priceStatus: input.resolvedPrice.priceStatus,
    indicatorStatus: "insufficient_history",
    indicatorError: reason,
    candlesAvailable: input.candlesAvailable,
    candlesRequired: SCANNER_INDICATOR_CANDLES_REQUIRED,
    indicators: emptyIndicators(),
    structure: emptyStructure(),
    strategies: emptyStrategies(reason),
    emaStrategy: EMPTY_EMA,
    mainSystem: {
      output: "NO TRADE",
      strategy: null,
      reasons: ["NO SCANNER RESULT — INSUFFICIENT HISTORY"],
    },
    bestSetup: null,
    tradable: false,
    tradeReasons: [],
    recentCandles: input.recentCandles,
    status: "price_only",
    notes: input.notes,
  };
}

function incompleteResult(
  entry: WatchlistEntry,
  notes: string[],
  reason: string,
  candlesAvailable = 0
): ScannerTickerResult {
  notes.push(reason);

  return {
    ticker: entry.ticker,
    category: entry.category,
    market: entry.market,
    currentPrice: null,
    priceAsOf: null,
    priceSource: null,
    priceSourceKey: null,
    priceStatus: null,
    indicatorStatus: "failed",
    indicatorError: reason,
    candlesAvailable,
    candlesRequired: SCANNER_INDICATOR_CANDLES_REQUIRED,
    indicators: emptyIndicators(),
    structure: emptyStructure(),
    strategies: emptyStrategies(reason),
    emaStrategy: EMPTY_EMA,
    mainSystem: EMPTY_MAIN,
    bestSetup: null,
    tradable: false,
    tradeReasons: [],
    recentCandles: [],
    status: "incomplete",
    notes,
  };
}

export function isScannerIndicatorReady(result: ScannerTickerResult): boolean {
  if (result.indicatorStatus === "ready") return true;
  if (result.indicatorStatus == null && result.status === "ok") return true;
  return false;
}

export function hasValidScannerTickerPrice(result: ScannerTickerResult): boolean {
  return result.currentPrice != null && Number.isFinite(result.currentPrice) && result.currentPrice > 0;
}
