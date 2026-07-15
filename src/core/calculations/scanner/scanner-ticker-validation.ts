import type { ScannerTickerResult } from "@/core/domain/types/scanner";
import type { PersistedScannerTickerRecord } from "./scanner-ticker-records";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";

export interface TickerValidationResult {
  ok: boolean;
  error?: string;
}

function isValidPrice(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value) && value > 0;
}

export function validateTickerScanResult(
  result: ScannerTickerResult,
  expectedTicker: string,
  previousRecord: PersistedScannerTickerRecord | null
): TickerValidationResult {
  const ticker = normalizeTicker(expectedTicker);
  if (normalizeTicker(result.ticker) !== ticker) {
    return { ok: false, error: "Ticker mismatch" };
  }

  if (!result.recentCandles.length) {
    return { ok: false, error: "Candle list is empty" };
  }

  const latest = result.recentCandles[result.recentCandles.length - 1];
  if (!latest) {
    return { ok: false, error: "Latest candle missing" };
  }

  if (!isValidPrice(latest.close)) {
    return { ok: false, error: "Latest candle close is invalid" };
  }

  if (latest.high < latest.low) {
    return { ok: false, error: "Latest candle high < low" };
  }

  if (latest.close < latest.low || latest.close > latest.high) {
    return { ok: false, error: "Latest candle close outside high-low range" };
  }

  if (!isValidPrice(result.indicators.atr14)) {
    return { ok: false, error: "ATR14 is invalid" };
  }

  if (!result.priceAsOf) {
    return { ok: false, error: "Market date missing" };
  }

  if (!isValidPrice(result.currentPrice)) {
    return { ok: false, error: "Current price is invalid" };
  }

  if (previousRecord) {
    const marketCmp = result.priceAsOf.localeCompare(previousRecord.marketDate);
    if (marketCmp < 0) {
      return {
        ok: false,
        error: "Fetched market date is older than stored valid record",
      };
    }
  }

  if (result.status !== "ok") {
    return { ok: false, error: result.notes[0] ?? "Scan incomplete" };
  }

  return { ok: true };
}
