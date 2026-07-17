import type { PersistedCurrentPriceRecord } from "@/core/domain/types/current-price";
import type { ScannerResultsStore } from "./scanner-ticker-records";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";

function isValidPrice(price: number | null | undefined): price is number {
  return price != null && Number.isFinite(price) && price > 0;
}

export function normalizeCurrentPriceRecords(
  store: ScannerResultsStore
): Record<string, PersistedCurrentPriceRecord> {
  return store.currentPriceRecords ?? {};
}

export function getPersistedCurrentPriceRecord(
  store: ScannerResultsStore,
  ticker: string
): PersistedCurrentPriceRecord | null {
  const key = normalizeTicker(ticker);
  return normalizeCurrentPriceRecords(store)[key] ?? null;
}

export function buildAllCurrentPriceRecords(
  store: ScannerResultsStore
): Map<string, PersistedCurrentPriceRecord> {
  const map = new Map<string, PersistedCurrentPriceRecord>();
  for (const [ticker, record] of Object.entries(normalizeCurrentPriceRecords(store))) {
    if (isValidPrice(record.currentPrice)) {
      map.set(normalizeTicker(ticker), record);
    }
  }
  return map;
}

export type UpsertCurrentPriceRecordOutcome = "saved" | "rejected";

export function upsertCurrentPriceRecord(
  store: ScannerResultsStore,
  record: PersistedCurrentPriceRecord
): UpsertCurrentPriceRecordOutcome {
  if (!isValidPrice(record.currentPrice)) {
    return "rejected";
  }
  if (!record.marketSession || !record.refreshedAt) {
    return "rejected";
  }

  const ticker = normalizeTicker(record.ticker);
  const existing = getPersistedCurrentPriceRecord(store, ticker);

  if (existing && record.refreshedAt < existing.refreshedAt) {
    return "rejected";
  }

  store.currentPriceRecords = {
    ...normalizeCurrentPriceRecords(store),
    [ticker]: { ...record, ticker },
  };
  return "saved";
}

export function verifyPersistedCurrentPriceRecord(
  stored: PersistedCurrentPriceRecord | null,
  expected: PersistedCurrentPriceRecord
): boolean {
  if (!stored) return false;
  if (normalizeTicker(stored.ticker) !== normalizeTicker(expected.ticker)) {
    return false;
  }
  if (stored.currentPrice !== expected.currentPrice) return false;
  if (stored.marketSession !== expected.marketSession) return false;
  if (stored.refreshedAt !== expected.refreshedAt) return false;
  if (stored.sourceKey !== expected.sourceKey) return false;
  if (stored.status !== expected.status) return false;
  return true;
}
