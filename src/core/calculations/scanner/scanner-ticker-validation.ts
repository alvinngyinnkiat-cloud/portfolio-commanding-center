import type { ScannerTickerResult } from "@/core/domain/types/scanner";
import type { PersistedScannerTickerRecord } from "./scanner-ticker-records";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";
import { hasValidScannerTickerPrice } from "./scan";

export interface TickerValidationResult {
  ok: boolean;
  error?: string;
}

function isValidPrice(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value) && value > 0;
}

function isPriceOnlyResult(result: ScannerTickerResult): boolean {
  return (
    result.status === "price_only" ||
    result.indicatorStatus === "insufficient_history"
  );
}

function validatePriceAlignment(result: ScannerTickerResult): TickerValidationResult {
  if (result.recentCandles.length === 0) {
    return { ok: true };
  }

  const latest = result.recentCandles[result.recentCandles.length - 1];
  if (!latest) {
    return { ok: true };
  }

  if (result.priceSourceKey !== "daily_close" && result.priceSourceKey !== "stored_candle") {
    return { ok: true };
  }

  if (!isValidPrice(latest.close)) {
    return { ok: false, error: "Latest candle close is invalid" };
  }

  if (latest.high < latest.low) {
    return { ok: false, error: "Latest candle high < low" };
  }

  if (Math.abs(result.currentPrice! - latest.close) > 1e-6) {
    return {
      ok: false,
      error: "Current price must equal latest completed candle close",
    };
  }

  if (result.priceAsOf !== latest.date) {
    return {
      ok: false,
      error: "Market date must match latest completed candle date",
    };
  }

  if (
    result.currentPrice! < latest.low ||
    result.currentPrice! > latest.high
  ) {
    return {
      ok: false,
      error: "Current price outside latest candle high-low range",
    };
  }

  return { ok: true };
}

function validatePricePersistence(
  result: ScannerTickerResult,
  previousRecord: PersistedScannerTickerRecord | null
): TickerValidationResult {
  if (!result.priceAsOf) {
    return { ok: false, error: "Market date missing" };
  }

  if (!hasValidScannerTickerPrice(result)) {
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

  return validatePriceAlignment(result);
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

  if (isPriceOnlyResult(result)) {
    return validatePricePersistence(result, previousRecord);
  }

  if (!result.recentCandles.length) {
    return { ok: false, error: "Candle list is empty" };
  }

  const latest = result.recentCandles[result.recentCandles.length - 1];
  if (!latest) {
    return { ok: false, error: "Latest candle missing" };
  }

  if (!isValidPrice(result.indicators.atr14)) {
    return { ok: false, error: "ATR14 is invalid" };
  }

  const priceValidation = validatePricePersistence(result, previousRecord);
  if (!priceValidation.ok) {
    return priceValidation;
  }

  if (result.status !== "ok") {
    return { ok: false, error: result.notes[0] ?? "Scan incomplete" };
  }

  return { ok: true };
}
