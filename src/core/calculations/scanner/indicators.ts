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

function getUsMarketDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Daily session bars only — drops the in-progress US session candle. */
export function filterCompletedDailyCandles(candles: OhlcBar[]): OhlcBar[] {
  if (candles.length === 0) {
    return candles;
  }
  const sorted = [...candles].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  const usToday = getUsMarketDateString();
  if (last.date >= usToday) {
    return sorted.slice(0, -1);
  }
  return sorted;
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

export function computeAtr14(candles: OhlcBar[]): number | null {
  if (candles.length < 15) {
    return null;
  }

  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i += 1) {
    const current = candles[i];
    const previous = candles[i - 1];
    const range = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );
    trueRanges.push(range);
  }

  if (trueRanges.length < 14) {
    return null;
  }

  let atr =
    trueRanges.slice(0, 14).reduce((sum, value) => sum + value, 0) / 14;
  for (let i = 14; i < trueRanges.length; i += 1) {
    atr = (atr * 13 + trueRanges[i]) / 14;
  }
  return atr;
}

/**
 * TradingView Stochastic Oscillator 10 / 3 on daily OHLC.
 *
 * raw %K = 100 × (Close − Lowest Low₁₀) / (Highest High₁₀ − Lowest Low₁₀)
 * SO (%K) = 3-period SMA of raw %K
 *
 * Uses daily high/low range and daily close. Pass completed daily candles only.
 */
export function computeStochastic1033(
  candles: OhlcBar[]
): { so: number | null; soPrev: number | null } {
  const period = STOCHASTIC_K_PERIOD;
  const smoothing = STOCHASTIC_K_SMOOTHING;
  const minCandles = period + smoothing + 2;

  if (candles.length < minCandles) {
    return { so: null, soPrev: null };
  }

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

  const smoothK: number[] = [];
  for (let i = smoothing - 1; i < rawK.length; i += 1) {
    const slice = rawK.slice(i - smoothing + 1, i + 1);
    smoothK.push(slice.reduce((sum, value) => sum + value, 0) / smoothing);
  }

  if (smoothK.length === 0) {
    return { so: null, soPrev: null };
  }

  return {
    so: smoothK[smoothK.length - 1],
    soPrev: smoothK.length >= 2 ? smoothK[smoothK.length - 2] : null,
  };
}

/** @deprecated Use {@link computeStochastic1033} — retained for legacy imports. */
export function computeStochastic1433(candles: OhlcBar[]): {
  so: number | null;
  soPrev: number | null;
} {
  return computeStochastic1033(candles);
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
  so: number | null;
  soPrev: number | null;
  high: number | null;
  low: number | null;
  avgPrice: number | null;
  trend: "Bullish" | "Bearish" | "Neutral";
  trendQualityBullPut: number;
  trendQualityBearCall: number;
} {
  const completedDaily = filterCompletedDailyCandles(candles);
  const closes = completedDaily.map((bar) => bar.close);
  const last = completedDaily[completedDaily.length - 1];
  const { so, soPrev } = computeStochastic1033(completedDaily);
  const ema20 = ema(closes, 20);
  const sma50Val = sma(closes, 50);
  const sma200Val = sma(closes, 200);
  const price = currentPrice ?? last?.close ?? null;

  return {
    ema20,
    sma50: sma50Val,
    sma200: sma200Val,
    atr14: computeAtr14(completedDaily),
    so,
    soPrev,
    high: last?.high ?? null,
    low: last?.low ?? null,
    avgPrice: last ? (last.high + last.low) / 2 : null,
    trend: deriveTrend(price, ema20, sma50Val, sma200Val),
    trendQualityBullPut: scoreTrendQualityBullPut(price, ema20, sma50Val, sma200Val),
    trendQualityBearCall: scoreTrendQualityBearCall(price, ema20, sma50Val, sma200Val),
  };
}
