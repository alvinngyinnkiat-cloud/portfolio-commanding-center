import type { OhlcBar } from "./indicators";
import { ema, sma } from "./indicators";

export function computeEma20Prev(candles: OhlcBar[]): number | null {
  if (candles.length < 21) {
    return null;
  }
  return ema(
    candles.slice(0, -1).map((bar) => bar.close),
    20
  );
}

export function computeSma50Prev(candles: OhlcBar[]): number | null {
  if (candles.length < 51) {
    return null;
  }
  return sma(
    candles.slice(0, -1).map((bar) => bar.close),
    50
  );
}

export function computeAvgPricePrev(candles: OhlcBar[]): number | null {
  if (candles.length < 2) {
    return null;
  }
  const prev = candles[candles.length - 2];
  return (prev.high + prev.low) / 2;
}

export function computeSma200Prev(candles: OhlcBar[]): number | null {
  if (candles.length < 201) {
    return null;
  }
  return sma(
    candles.slice(0, -1).map((bar) => bar.close),
    200
  );
}

export function computeSma50SlopePct(
  sma50: number | null,
  sma50Prev: number | null
): number | null {
  if (sma50 == null || sma50Prev == null || sma50Prev === 0) {
    return null;
  }
  return ((sma50 - sma50Prev) / sma50Prev) * 100;
}

export function computeEmaDiff(
  avgPrice: number | null,
  ema20: number | null
): { emaDiff: number | null; emaDiffPct: number | null } {
  if (avgPrice == null || ema20 == null || ema20 === 0) {
    return { emaDiff: null, emaDiffPct: null };
  }
  const emaDiff = avgPrice - ema20;
  return {
    emaDiff,
    emaDiffPct: (emaDiff / ema20) * 100,
  };
}
