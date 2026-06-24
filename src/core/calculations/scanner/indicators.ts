import {
  formatUsMarketDateFromUnix,
  getUsMarketDateString,
  isUsCashSessionClosed,
} from "./us-market-date";
import { deriveMarketStructure, deriveMomentum } from "./structure-momentum";

export interface OhlcBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

/** TradingView Stochastic settings — %K length / %K smoothing. */
export const STOCHASTIC_K_PERIOD = 10;
export const STOCHASTIC_K_SMOOTHING = 3;

export interface StochasticSoDebug {
  sessionDate: string | null;
  last10Highs: number[];
  last10Lows: number[];
  last10Closes: number[];
  highestHigh10: number | null;
  lowestLow10: number | null;
  rawK: number | null;
  smoothedK3: number | null;
  previousSmoothedK3: number | null;
  /** Same value as indicators.so — Raw %K (10-period). */
  scannerSoUsed: number | null;
}

export interface Stochastic1033Result {
  /** Scanner SO — Raw %K (10-period). Matches TradingView %K crosshair on Stochastic 10/3. */
  so: number | null;
  /** Previous session Raw %K. */
  soPrev: number | null;
  debug: StochasticSoDebug;
}

/**
 * Keep completed US daily sessions only.
 * Drops just the in-progress ET session bar (today before 4:00 PM ET).
 */
export function filterCompletedDailyCandles(
  candles: OhlcBar[],
  asOf: Date = new Date()
): OhlcBar[] {
  if (candles.length === 0) {
    return candles;
  }

  const sorted = [...candles].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  const usToday = getUsMarketDateString(asOf);

  if (last.date === usToday && !isUsCashSessionClosed(asOf)) {
    return sorted.slice(0, -1);
  }

  return sorted;
}

/** TradingView ATR length — Wilder RMA smoothing. */
export const ATR_PERIOD = 14;

export interface AtrDebug {
  sessionDate: string | null;
  method: "RMA / Wilder";
  last14TrueRanges: number[];
  scannerAtrUsed: number | null;
}

export interface Atr14RmaResult {
  atr: number | null;
  debug: AtrDebug;
}

export function sma(values: number[], period: number): number | null {
  if (values.length < period) {
    return null;
  }
  const slice = values.slice(-period);
  return slice.reduce((sum, value) => sum + value, 0) / period;
}

export function ema(values: number[], period: number): number | null {
  if (values.length < period) {
    return null;
  }
  const multiplier = 2 / (period + 1);
  let result = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  for (let i = period; i < values.length; i += 1) {
    result = (values[i] - result) * multiplier + result;
  }
  return result;
}

/** True Range series from completed daily OHLC (bar 0 has no TR). */
export function computeTrueRanges(candles: OhlcBar[]): number[] {
  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i += 1) {
    const current = candles[i];
    const previous = candles[i - 1];
    trueRanges.push(
      Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close)
      )
    );
  }
  return trueRanges;
}

/**
 * TradingView ATR 14 — Wilder RMA (not SMA, not EMA).
 *
 * Seed: SMA of first 14 True Range values.
 * Then: ATR = ((ATR_prev × 13) + TR_today) / 14
 */
export function computeAtr14Rma(candles: OhlcBar[]): Atr14RmaResult {
  const period = ATR_PERIOD;
  const emptyDebug: AtrDebug = {
    sessionDate: null,
    method: "RMA / Wilder",
    last14TrueRanges: [],
    scannerAtrUsed: null,
  };

  if (candles.length < period + 1) {
    return { atr: null, debug: emptyDebug };
  }

  const trueRanges = computeTrueRanges(candles);
  if (trueRanges.length < period) {
    return { atr: null, debug: emptyDebug };
  }

  let atr =
    trueRanges.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  for (let i = period; i < trueRanges.length; i += 1) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }

  return {
    atr,
    debug: {
      sessionDate: candles.at(-1)?.date ?? null,
      method: "RMA / Wilder",
      last14TrueRanges: trueRanges.slice(-period),
      scannerAtrUsed: atr,
    },
  };
}

export function computeAtr14(candles: OhlcBar[]): number | null {
  return computeAtr14Rma(candles).atr;
}

function computeRawKSeries(candles: OhlcBar[], period: number): number[] {
  const rawK: number[] = [];
  for (let i = period - 1; i < candles.length; i += 1) {
    const window = candles.slice(i - period + 1, i + 1);
    const highest = Math.max(...window.map((bar) => bar.high));
    const lowest = Math.min(...window.map((bar) => bar.low));
    const close = candles[i].close;
    if (highest === lowest) {
      rawK.push(50);
    } else {
      rawK.push(((close - lowest) / (highest - lowest)) * 100);
    }
  }
  return rawK;
}

function smoothRawKSeries(rawK: number[], smoothing: number): number[] {
  const smoothK: number[] = [];
  for (let i = smoothing - 1; i < rawK.length; i += 1) {
    const slice = rawK.slice(i - smoothing + 1, i + 1);
    smoothK.push(slice.reduce((sum, value) => sum + value, 0) / smoothing);
  }
  return smoothK;
}

/**
 * TradingView Stochastic Oscillator 10 / 3 on daily OHLC.
 *
 * Raw %K = 100 × (Close − Lowest Low₁₀) / (Highest High₁₀ − Lowest Low₁₀)
 * Smoothed %K = 3-period SMA(Raw %K)
 *
 * Scanner SO = Raw %K on the latest completed daily session (TradingView %K value).
 * Debug panel also exposes Smoothed %K (3-period SMA).
 */
export function computeStochastic1033(candles: OhlcBar[]): Stochastic1033Result {
  const period = STOCHASTIC_K_PERIOD;
  const smoothing = STOCHASTIC_K_SMOOTHING;
  const emptyDebug: StochasticSoDebug = {
    sessionDate: null,
    last10Highs: [],
    last10Lows: [],
    last10Closes: [],
    highestHigh10: null,
    lowestLow10: null,
    rawK: null,
    smoothedK3: null,
    previousSmoothedK3: null,
    scannerSoUsed: null,
  };

  if (candles.length < period) {
    return { so: null, soPrev: null, debug: emptyDebug };
  }

  const rawK = computeRawKSeries(candles, period);
  const smoothK = smoothRawKSeries(rawK, smoothing);

  const lastIndex = candles.length - 1;
  const window = candles.slice(lastIndex - period + 1, lastIndex + 1);
  const highestHigh10 = Math.max(...window.map((bar) => bar.high));
  const lowestLow10 = Math.min(...window.map((bar) => bar.low));
  const rawKLatest = rawK.at(-1) ?? null;
  const rawKPrevious = rawK.length >= 2 ? rawK.at(-2) ?? null : null;
  const smoothedLatest = smoothK.at(-1) ?? null;
  const smoothedPrevious = smoothK.length >= 2 ? smoothK.at(-2) ?? null : null;

  const debug: StochasticSoDebug = {
    sessionDate: candles[lastIndex]?.date ?? null,
    last10Highs: window.map((bar) => bar.high),
    last10Lows: window.map((bar) => bar.low),
    last10Closes: window.map((bar) => bar.close),
    highestHigh10,
    lowestLow10,
    rawK: rawKLatest,
    smoothedK3: smoothedLatest,
    previousSmoothedK3: smoothedPrevious,
    scannerSoUsed: rawKLatest,
  };

  return {
    so: rawKLatest,
    soPrev: rawKPrevious,
    debug,
  };
}

/** @deprecated Use {@link computeStochastic1033} — retained for legacy imports. */
export function computeStochastic1433(candles: OhlcBar[]): {
  so: number | null;
  soPrev: number | null;
} {
  const result = computeStochastic1033(candles);
  return { so: result.so, soPrev: result.soPrev };
}

export function deriveTrend(
  price: number | null,
  ema20: number | null,
  sma50: number | null,
  sma200: number | null
): "Bullish" | "Bearish" | "Neutral" {
  if (price == null || ema20 == null) {
    return "Neutral";
  }
  if (
    sma50 != null &&
    sma200 != null &&
    price > ema20 &&
    ema20 > sma50 &&
    sma50 > sma200
  ) {
    return "Bullish";
  }
  if (
    sma50 != null &&
    sma200 != null &&
    price < ema20 &&
    ema20 < sma50 &&
    sma50 < sma200
  ) {
    return "Bearish";
  }
  return "Neutral";
}

export function scoreTrendQualityBullPut(
  price: number | null,
  ema20: number | null,
  sma50: number | null,
  sma200: number | null
): number {
  if (price == null || ema20 == null) {
    return 0;
  }
  if (sma50 != null && sma200 != null && price > ema20 && ema20 > sma50 && sma50 > sma200) {
    return 20;
  }
  if (sma50 != null && price > ema20 && ema20 > sma50) {
    return 12;
  }
  if (price > ema20) {
    return 6;
  }
  return 0;
}

export function scoreTrendQualityBearCall(
  price: number | null,
  ema20: number | null,
  sma50: number | null,
  sma200: number | null
): number {
  if (price == null || ema20 == null) {
    return 0;
  }
  if (sma50 != null && sma200 != null && price < ema20 && ema20 < sma50 && sma50 < sma200) {
    return 20;
  }
  if (sma50 != null && price < ema20 && ema20 < sma50) {
    return 12;
  }
  if (price < ema20) {
    return 6;
  }
  return 0;
}

export function computeIndicators(
  candles: OhlcBar[],
  currentPrice: number | null
): {
  ema20: number | null;
  sma50: number | null;
  sma200: number | null;
  atr14: number | null;
  atrDebug: AtrDebug;
  so: number | null;
  soPrev: number | null;
  soDebug: StochasticSoDebug;
  high: number | null;
  low: number | null;
  avgPrice: number | null;
  marketStructure: "Bullish" | "Bearish" | "Neutral";
  momentum: "Above EMA" | "Below EMA" | "At EMA";
  trend: "Bullish" | "Bearish" | "Neutral";
  trendQualityBullPut: number;
  trendQualityBearCall: number;
} {
  const completedDaily = filterCompletedDailyCandles(candles);
  const closes = completedDaily.map((bar) => bar.close);
  const last = completedDaily[completedDaily.length - 1];
  const stochastic = computeStochastic1033(completedDaily);
  const atrResult = computeAtr14Rma(completedDaily);
  const ema20 = ema(closes, 20);
  const sma50Val = sma(closes, 50);
  const sma200Val = sma(closes, 200);
  const price = currentPrice ?? last?.close ?? null;
  const avgPrice = last ? (last.high + last.low) / 2 : null;
  const marketStructure = deriveMarketStructure(ema20, sma50Val, sma200Val);
  const momentum = deriveMomentum(avgPrice, ema20);

  return {
    ema20,
    sma50: sma50Val,
    sma200: sma200Val,
    atr14: atrResult.atr,
    atrDebug: atrResult.debug,
    so: stochastic.so,
    soPrev: stochastic.soPrev,
    soDebug: stochastic.debug,
    high: last?.high ?? null,
    low: last?.low ?? null,
    avgPrice,
    marketStructure,
    momentum,
    trend: marketStructure,
    trendQualityBullPut: scoreTrendQualityBullPut(price, ema20, sma50Val, sma200Val),
    trendQualityBearCall: scoreTrendQualityBearCall(price, ema20, sma50Val, sma200Val),
  };
}

export { formatUsMarketDateFromUnix, getUsMarketDateString };
