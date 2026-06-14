export interface OhlcBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
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

export function computeStochastic1433(
  candles: OhlcBar[]
): { so: number | null; soPrev: number | null } {
  if (candles.length < 17) {
    return { so: null, soPrev: null };
  }

  const rawK: number[] = [];
  for (let i = 14; i < candles.length; i += 1) {
    const window = candles.slice(i - 13, i + 1);
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
  for (let i = 2; i < rawK.length; i += 1) {
    smoothK.push((rawK[i] + rawK[i - 1] + rawK[i - 2]) / 3);
  }

  if (smoothK.length === 0) {
    return { so: null, soPrev: null };
  }

  return {
    so: smoothK[smoothK.length - 1],
    soPrev: smoothK.length >= 2 ? smoothK[smoothK.length - 2] : null,
  };
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
  const closes = candles.map((bar) => bar.close);
  const last = candles[candles.length - 1];
  const { so, soPrev } = computeStochastic1433(candles);
  const ema20 = ema(closes, 20);
  const sma50Val = sma(closes, 50);
  const sma200Val = sma(closes, 200);
  const price = currentPrice ?? last?.close ?? null;

  return {
    ema20,
    sma50: sma50Val,
    sma200: sma200Val,
    atr14: computeAtr14(candles),
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
