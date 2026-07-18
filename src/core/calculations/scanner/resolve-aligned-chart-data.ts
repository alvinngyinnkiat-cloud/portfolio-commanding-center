import type { StockDailyCandle } from "@/core/domain/types";
import type { ScannerCandleBar } from "@/core/domain/types/scanner";
import type {
  AlignedChartData,
  AlignedChartStatus,
} from "@/core/domain/types/aligned-chart-data";
import { CHART_DATA_PENDING_MESSAGE } from "@/core/domain/types/aligned-chart-data";
import { buildRecentChartCandles } from "./chart-candles";
import { filterCompletedDailyCandles, type OhlcBar } from "./indicators";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";

export interface ResolveAlignedChartDataInput {
  ticker: string;
  priceSession: string | null;
  centralCurrentPrice: number | null;
  dailyCandles: StockDailyCandle[];
  scannerChartCandles?: ScannerCandleBar[];
  currentAveragePrice?: number | null;
  previousAveragePrice?: number | null;
  atr14?: number | null;
  source?: string | null;
  refreshedAt?: string | null;
  /** Optional candle fetched for the exact price session. */
  supplementalDailyBar?: OhlcBar | null;
}

function isValidPrice(price: number | null | undefined): price is number {
  return price != null && Number.isFinite(price) && price > 0;
}

function isValidOhlc(bar: OhlcBar | null | undefined): bar is OhlcBar {
  if (!bar || !bar.date) return false;
  return [bar.open, bar.high, bar.low, bar.close].every(
    (value) => Number.isFinite(value) && value > 0
  );
}

/** Normalize any market-session string to YYYY-MM-DD (US session date). */
export function normalizeMarketSessionDate(
  value: string | null | undefined
): string | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function toOhlcBars(
  dailyCandles: StockDailyCandle[],
  scannerChartCandles: ScannerCandleBar[]
): OhlcBar[] {
  if (dailyCandles.length > 0) {
    return dailyCandles.map((bar) => ({
      date: normalizeMarketSessionDate(bar.date) ?? bar.date,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
    }));
  }

  return scannerChartCandles.map((bar) => ({
    date: normalizeMarketSessionDate(bar.date) ?? bar.date,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
  }));
}

function mergeDailyBars(
  bars: OhlcBar[],
  supplemental: OhlcBar | null | undefined
): OhlcBar[] {
  const map = new Map<string, OhlcBar>();
  for (const bar of bars) {
    const date = normalizeMarketSessionDate(bar.date);
    if (!date || !isValidOhlc({ ...bar, date })) continue;
    map.set(date, { ...bar, date });
  }
  if (supplemental) {
    const date = normalizeMarketSessionDate(supplemental.date);
    if (date && isValidOhlc({ ...supplemental, date })) {
      map.set(date, { ...supplemental, date });
    }
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function findMatchingDailyBar(
  bars: OhlcBar[],
  priceSession: string
): OhlcBar | null {
  return bars.find((bar) => bar.date === priceSession) ?? null;
}

function buildAlignedResult(input: {
  ticker: string;
  priceSession: string;
  matchingBar: OhlcBar;
  allCompletedBars: OhlcBar[];
  centralCurrentPrice: number | null;
  currentAveragePrice: number | null;
  previousAveragePrice: number | null;
  atr14: number | null;
  source: string | null;
  refreshedAt: string | null;
}): AlignedChartData {
  const barsUpToSession = input.allCompletedBars.filter(
    (bar) => bar.date <= input.priceSession
  );
  const sessionIndex = barsUpToSession.findIndex(
    (bar) => bar.date === input.priceSession
  );
  const historyForChart =
    sessionIndex >= 0 ? barsUpToSession : input.allCompletedBars;
  const candles = buildRecentChartCandles(historyForChart, 5);
  const latestCandle = candles[candles.length - 1] ?? null;
  const alignedClose = input.matchingBar.close;

  return {
    ticker: normalizeTicker(input.ticker),
    marketSession: input.priceSession,
    currentPrice: alignedClose,
    displayCurrentPrice: input.centralCurrentPrice ?? alignedClose,
    candles,
    latestCandle,
    currentAveragePrice: input.currentAveragePrice,
    previousAveragePrice: input.previousAveragePrice,
    atr14: input.atr14,
    source: input.source,
    refreshedAt: input.refreshedAt,
    status: "aligned",
    statusMessage: null,
    showCurrentPriceLine: true,
  };
}

function buildPendingResult(input: {
  ticker: string;
  priceSession: string | null;
  centralCurrentPrice: number | null;
  allCompletedBars: OhlcBar[];
  currentAveragePrice: number | null;
  previousAveragePrice: number | null;
  atr14: number | null;
  source: string | null;
  refreshedAt: string | null;
}): AlignedChartData {
  const candles = buildRecentChartCandles(input.allCompletedBars, 5);
  const latestCandle = candles[candles.length - 1] ?? null;

  return {
    ticker: normalizeTicker(input.ticker),
    marketSession: input.priceSession,
    currentPrice: null,
    displayCurrentPrice: input.centralCurrentPrice,
    candles,
    latestCandle,
    currentAveragePrice: input.currentAveragePrice,
    previousAveragePrice: input.previousAveragePrice,
    atr14: input.atr14,
    source: input.source,
    refreshedAt: input.refreshedAt,
    status: "chart_data_pending",
    statusMessage: CHART_DATA_PENDING_MESSAGE,
    showCurrentPriceLine: false,
  };
}

function buildEmptyResult(ticker: string): AlignedChartData {
  return {
    ticker: normalizeTicker(ticker),
    marketSession: null,
    currentPrice: null,
    displayCurrentPrice: null,
    candles: [],
    latestCandle: null,
    currentAveragePrice: null,
    previousAveragePrice: null,
    atr14: null,
    source: null,
    refreshedAt: null,
    status: "chart_data_pending",
    statusMessage: null,
    showCurrentPriceLine: false,
  };
}

/**
 * Shared read-only chart alignment for Scanner and Income charts.
 * Never mutates candles. Current Price line uses matching session close only.
 */
export function resolveAlignedChartData(
  input: ResolveAlignedChartDataInput
): AlignedChartData {
  const ticker = normalizeTicker(input.ticker);
  const priceSession = normalizeMarketSessionDate(input.priceSession);
  const merged = mergeDailyBars(
    toOhlcBars(input.dailyCandles, input.scannerChartCandles ?? []),
    input.supplementalDailyBar
  );
  const completed = filterCompletedDailyCandles(merged);

  if (completed.length === 0) {
    return buildEmptyResult(ticker);
  }

  const meta = {
    currentAveragePrice: input.currentAveragePrice ?? null,
    previousAveragePrice: input.previousAveragePrice ?? null,
    atr14: input.atr14 ?? null,
    source: input.source ?? null,
    refreshedAt: input.refreshedAt ?? null,
    centralCurrentPrice: isValidPrice(input.centralCurrentPrice)
      ? input.centralCurrentPrice
      : null,
  };

  if (!priceSession) {
    const lastBar = completed[completed.length - 1];
    if (!lastBar) return buildEmptyResult(ticker);
    return buildAlignedResult({
      ticker,
      priceSession: lastBar.date,
      matchingBar: lastBar,
      allCompletedBars: completed,
      ...meta,
    });
  }

  const matchingBar = findMatchingDailyBar(completed, priceSession);
  if (matchingBar) {
    return buildAlignedResult({
      ticker,
      priceSession,
      matchingBar,
      allCompletedBars: completed,
      ...meta,
    });
  }

  const newestDate = completed[completed.length - 1]?.date ?? null;
  if (newestDate && priceSession > newestDate) {
    return buildPendingResult({
      ticker,
      priceSession,
      allCompletedBars: completed,
      ...meta,
    });
  }

  const fallbackBar = completed[completed.length - 1];
  if (!fallbackBar) return buildEmptyResult(ticker);

  return buildAlignedResult({
    ticker,
    priceSession: fallbackBar.date,
    matchingBar: fallbackBar,
    allCompletedBars: completed,
    ...meta,
  });
}

export function alignedChartNeedsSessionFetch(
  resolved: AlignedChartData,
  priceSession: string | null
): boolean {
  const session = normalizeMarketSessionDate(priceSession);
  if (!session || resolved.status !== "chart_data_pending") return false;
  const newest = resolved.latestCandle?.date ?? null;
  return newest != null && session > newest;
}

export function validateFetchedSessionCandle(
  ticker: string,
  sessionDate: string,
  candle: OhlcBar | null | undefined
): OhlcBar | null {
  if (!candle) return null;
  const date = normalizeMarketSessionDate(candle.date);
  if (date !== sessionDate) return null;
  if (!isValidOhlc(candle)) return null;
  return { ...candle, date };
}

export type { AlignedChartStatus };
