import type { OhlcBar } from "./indicators";

function isSwingLow(candles: OhlcBar[], index: number): boolean {
  if (index < 2 || index >= candles.length - 2) {
    return false;
  }
  const low = candles[index].low;
  for (let offset = -2; offset <= 2; offset += 1) {
    if (offset === 0) {
      continue;
    }
    if (candles[index + offset].low <= low) {
      return false;
    }
  }
  return true;
}

function isSwingHigh(candles: OhlcBar[], index: number): boolean {
  if (index < 2 || index >= candles.length - 2) {
    return false;
  }
  const high = candles[index].high;
  for (let offset = -2; offset <= 2; offset += 1) {
    if (offset === 0) {
      continue;
    }
    if (candles[index + offset].high >= high) {
      return false;
    }
  }
  return true;
}

export function lowestSwingLow(candles: OhlcBar[], lookback: number): number | null {
  if (candles.length === 0) {
    return null;
  }
  const window = candles.slice(-lookback);
  const startIndex = candles.length - window.length;
  let best: number | null = null;

  for (let i = 0; i < window.length; i += 1) {
    const absoluteIndex = startIndex + i;
    if (!isSwingLow(candles, absoluteIndex)) {
      continue;
    }
    const low = window[i].low;
    if (best == null || low < best) {
      best = low;
    }
  }

  return best;
}

export function highestSwingHigh(candles: OhlcBar[], lookback: number): number | null {
  if (candles.length === 0) {
    return null;
  }
  const window = candles.slice(-lookback);
  const startIndex = candles.length - window.length;
  let best: number | null = null;

  for (let i = 0; i < window.length; i += 1) {
    const absoluteIndex = startIndex + i;
    if (!isSwingHigh(candles, absoluteIndex)) {
      continue;
    }
    const high = window[i].high;
    if (best == null || high > best) {
      best = high;
    }
  }

  return best;
}

export interface ComputedStructure {
  dailySupport: number | null;
  weeklySupport: number | null;
  primarySupport: number | null;
  dailyResistance: number | null;
  weeklyResistance: number | null;
  primaryResistance: number | null;
  midPrice: number | null;
  rangeWidth: number | null;
  sellPutRange: { low: number; high: number } | null;
  sellCallRange: { low: number; high: number } | null;
  icMidZone: { low: number; high: number } | null;
}

export function computeStructure(
  dailyCandles: OhlcBar[],
  weeklyCandles: OhlcBar[],
  atr14: number | null
): ComputedStructure {
  const dailySupport = lowestSwingLow(dailyCandles, 60);
  const weeklySupport = lowestSwingLow(weeklyCandles, 30);
  const dailyResistance = highestSwingHigh(dailyCandles, 60);
  const weeklyResistance = highestSwingHigh(weeklyCandles, 30);

  const primarySupport =
    dailySupport != null && weeklySupport != null
      ? dailySupport * 0.25 + weeklySupport * 0.75
      : null;
  const primaryResistance =
    dailyResistance != null && weeklyResistance != null
      ? dailyResistance * 0.25 + weeklyResistance * 0.75
      : null;

  const midPrice =
    primarySupport != null && primaryResistance != null
      ? (primarySupport + primaryResistance) / 2
      : null;

  let rangeWidth: number | null = null;
  let sellPutRange: { low: number; high: number } | null = null;
  let sellCallRange: { low: number; high: number } | null = null;

  let icMidZone: { low: number; high: number } | null = null;

  if (primarySupport != null && primaryResistance != null && atr14 != null) {
    rangeWidth =
      (primaryResistance - atr14) - (primarySupport + atr14);
    sellPutRange = {
      low: primarySupport,
      high: primarySupport + atr14,
    };
    sellCallRange = {
      low: primaryResistance - atr14,
      high: primaryResistance,
    };
    if (midPrice != null) {
      icMidZone = {
        low: midPrice - atr14,
        high: midPrice + atr14,
      };
    }
  }

  return {
    dailySupport,
    weeklySupport,
    primarySupport,
    dailyResistance,
    weeklyResistance,
    primaryResistance,
    midPrice,
    rangeWidth,
    sellPutRange,
    sellCallRange,
    icMidZone,
  };
}
