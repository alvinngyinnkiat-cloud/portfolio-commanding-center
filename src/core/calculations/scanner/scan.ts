import type { StockDailyCandle, StockPrice, StockWeeklyCandle } from "@/core/domain/types";
import type { WatchlistEntry } from "./watchlist";
import type {
  EmaStrategyResult,
  MainSystemDisplay,
  ScannerTickerResult,
} from "@/core/domain/types/scanner";
import { computeIndicators } from "./indicators";
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
import { evaluateMainSystemDisplay } from "./main-system-display";
import {
  computeAvgPricePrev,
  computeEma20Prev,
  computeEmaDiff,
  computeSma50Prev,
  computeSma50SlopePct,
} from "./extended-indicators";

export interface ScanTickerInput {
  entry: WatchlistEntry;
  dailyCandles: StockDailyCandle[];
  weeklyCandles: StockWeeklyCandle[];
  price: StockPrice | null;
}

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

  if (dailyCandles.length < 200) {
    return incompleteResult(
      entry,
      price,
      notes,
      `Insufficient daily history: ${dailyCandles.length}/200 sessions`
    );
  }

  const dailyBars = dailyCandles.map((bar) => ({
    date: bar.date,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
  }));
  const weeklyBars = weeklyCandles.map((bar) => ({
    date: bar.date,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
  }));

  const currentPrice = price?.currentPrice ?? price?.latestPrice ?? null;
  if (price?.priceUnavailable) {
    notes.push("Stock Tracker price unavailable — using last candle close");
  }

  const indicatorValues = computeIndicators(
    dailyBars,
    currentPrice ?? dailyBars[dailyBars.length - 1]?.close ?? null
  );
  const structure = computeStructure(
    dailyBars,
    weeklyBars,
    indicatorValues.atr14
  );

  const resolvedPrice =
    currentPrice ?? dailyBars[dailyBars.length - 1]?.close ?? null;
  const ema20Prev = computeEma20Prev(dailyBars);
  const sma50Prev = computeSma50Prev(dailyBars);
  const avgPricePrev = computeAvgPricePrev(dailyBars);
  const { emaDiff, emaDiffPct } = computeEmaDiff(
    indicatorValues.avgPrice,
    indicatorValues.ema20
  );
  const soStatus = deriveSoStatus(indicatorValues.so, indicatorValues.soPrev);

  const bullPut = scoreBullPut({
    soStatus,
    trend: indicatorValues.trend,
    avgPrice: indicatorValues.avgPrice,
    avgPricePrev,
    primarySupport: structure.primarySupport,
    atr14: indicatorValues.atr14,
    sellPutRange: structure.sellPutRange,
  });

  const bearCall = scoreBearCall({
    soStatus,
    trend: indicatorValues.trend,
    avgPrice: indicatorValues.avgPrice,
    avgPricePrev,
    primaryResistance: structure.primaryResistance,
    atr14: indicatorValues.atr14,
    sellCallRange: structure.sellCallRange,
  });

  const ironCondor = scoreIronCondor({
    so: indicatorValues.so,
    trend: indicatorValues.trend,
    avgPrice: indicatorValues.avgPrice,
    midPrice: structure.midPrice,
    atr14: indicatorValues.atr14,
    icMidZone: structure.icMidZone,
    rangeWidth: structure.rangeWidth,
  });

  const strategies = { bullPut, bearCall, ironCondor };
  const bestSetup = pickBestSetup(strategies);

  const emaStrategy = evaluateEmaStrategy({
    so: indicatorValues.so,
    soPrev: indicatorValues.soPrev,
    soStatus,
    trend: indicatorValues.trend,
    avgPrice: indicatorValues.avgPrice,
    avgPricePrev,
    ema20: indicatorValues.ema20,
    ema20Prev,
    emaDiffPct,
    primarySupport: structure.primarySupport,
    primaryResistance: structure.primaryResistance,
    atr14: indicatorValues.atr14,
  });

  const mainSystem = evaluateMainSystemDisplay({
    bullPutEligible: bullPut.eligible,
    bearCallEligible: bearCall.eligible,
    ironCondorEligible: ironCondor.eligible,
    trend: indicatorValues.trend,
    so: indicatorValues.so,
    soStatus,
    avgPrice: indicatorValues.avgPrice,
    avgPricePrev,
    midPrice: structure.midPrice,
    atr14: indicatorValues.atr14,
    primarySupport: structure.primarySupport,
    primaryResistance: structure.primaryResistance,
    sellPutRange: structure.sellPutRange,
    sellCallRange: structure.sellCallRange,
    icMidZone: structure.icMidZone,
  });

  return {
    ticker: entry.ticker,
    category: entry.category,
    market: entry.market,
    currentPrice: resolvedPrice,
    priceAsOf: price?.priceAsOf ?? dailyBars[dailyBars.length - 1]?.date ?? null,
    indicators: {
      ema20: indicatorValues.ema20,
      ema20Prev,
      sma50: indicatorValues.sma50,
      sma50Prev,
      sma50SlopePct: computeSma50SlopePct(indicatorValues.sma50, sma50Prev),
      sma200: indicatorValues.sma200,
      atr14: indicatorValues.atr14,
      so: indicatorValues.so,
      soPrev: indicatorValues.soPrev,
      soStatus,
      high: indicatorValues.high,
      low: indicatorValues.low,
      avgPrice: indicatorValues.avgPrice,
      avgPricePrev,
      emaDiff,
      emaDiffPct,
      trend: indicatorValues.trend,
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
    recentCandles: dailyBars.slice(-5),
    status: "ok",
    notes,
  };
}

function incompleteResult(
  entry: WatchlistEntry,
  price: StockPrice | null,
  notes: string[],
  reason: string
): ScannerTickerResult {
  notes.push(reason);
  const emptyStrategy = {
    eligible: false,
    checklist: [],
    passReasons: [],
    failReasons: [reason],
  };

  return {
    ticker: entry.ticker,
    category: entry.category,
    market: entry.market,
    currentPrice: price?.currentPrice ?? price?.latestPrice ?? null,
    priceAsOf: price?.priceAsOf ?? null,
    indicators: {
      ema20: null,
      ema20Prev: null,
      sma50: null,
      sma50Prev: null,
      sma50SlopePct: null,
      sma200: null,
      atr14: null,
      so: null,
      soPrev: null,
      soStatus: "Rolling Down",
      high: null,
      low: null,
      avgPrice: null,
      avgPricePrev: null,
      emaDiff: null,
      emaDiffPct: null,
      trend: "Neutral",
      trendQualityScore: 0,
    },
    structure: {
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
    },
    strategies: {
      bullPut: emptyStrategy,
      bearCall: emptyStrategy,
      ironCondor: emptyStrategy,
    },
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
