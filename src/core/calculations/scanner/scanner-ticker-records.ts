import type { ScannerTickerResult } from "@/core/domain/types/scanner";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";

export type ScannerRefreshRunStatus =
  | "running"
  | "partial_success"
  | "success"
  | "failed";

export type ScannerTickerDataStatus =
  | "fresh"
  | "stale"
  | "failed"
  | "missing"
  | "fallback";

export interface PersistedScannerTickerRecord {
  ticker: string;
  marketDate: string;
  refreshedAt: string;
  refreshRunId: string;
  result: ScannerTickerResult;
  candleCount: number;
}

export interface ScannerRefreshRunMetadata {
  refreshRunId: string;
  startedAt: string;
  completedAt: string | null;
  totalTickers: number;
  successfulTickers: string[];
  failedTickers: Array<{ ticker: string; error: string }>;
  status: ScannerRefreshRunStatus;
}

export interface ScannerResultsStore {
  latest: import("@/core/domain/types/scanner").ScannerScanRun | null;
  previous: import("@/core/domain/types/scanner").ScannerScanRun | null;
  tickerRecords?: Record<string, PersistedScannerTickerRecord>;
  tickerLatestKeys?: Record<string, string>;
  lastRefreshRun?: ScannerRefreshRunMetadata | null;
}

export function tickerRecordKey(ticker: string, marketDate: string): string {
  return `${normalizeTicker(ticker)}|${marketDate}`;
}

export function normalizeScannerResultsStore(
  store: ScannerResultsStore | null | undefined
): ScannerResultsStore {
  return {
    latest: store?.latest ?? null,
    previous: store?.previous ?? null,
    tickerRecords: store?.tickerRecords ?? {},
    tickerLatestKeys: store?.tickerLatestKeys ?? {},
    lastRefreshRun: store?.lastRefreshRun ?? null,
  };
}

function comparePersistedRecords(
  a: PersistedScannerTickerRecord,
  b: PersistedScannerTickerRecord
): number {
  const marketCmp = b.marketDate.localeCompare(a.marketDate);
  if (marketCmp !== 0) return marketCmp;
  return b.refreshedAt.localeCompare(a.refreshedAt);
}

export function listRecordsForTicker(
  store: ScannerResultsStore,
  ticker: string
): PersistedScannerTickerRecord[] {
  const key = normalizeTicker(ticker);
  return Object.values(store.tickerRecords ?? {})
    .filter((row) => normalizeTicker(row.ticker) === key)
    .sort(comparePersistedRecords);
}

export function getLatestPersistedTickerRecord(
  store: ScannerResultsStore,
  ticker: string
): PersistedScannerTickerRecord | null {
  const normalized = normalizeTicker(ticker);
  const latestKey = store.tickerLatestKeys?.[normalized];
  if (latestKey && store.tickerRecords?.[latestKey]) {
    return store.tickerRecords[latestKey];
  }
  return listRecordsForTicker(store, ticker)[0] ?? null;
}

export function getPersistedTickerRecord(
  store: ScannerResultsStore,
  ticker: string,
  marketDate: string
): PersistedScannerTickerRecord | null {
  const key = tickerRecordKey(ticker, marketDate);
  return store.tickerRecords?.[key] ?? null;
}

export function isRecordNewerOrEqual(
  candidate: PersistedScannerTickerRecord,
  existing: PersistedScannerTickerRecord | null
): boolean {
  if (!existing) return true;
  return comparePersistedRecords(candidate, existing) <= 0;
}

export type UpsertTickerRecordOutcome = "saved" | "skipped_stale" | "rejected";

export function upsertTickerRecord(
  store: ScannerResultsStore,
  record: PersistedScannerTickerRecord
): UpsertTickerRecordOutcome {
  const normalized = normalizeScannerResultsStore(store);
  const ticker = normalizeTicker(record.ticker);
  const existingLatest = getLatestPersistedTickerRecord(normalized, ticker);

  if (existingLatest && !isRecordNewerOrEqual(record, existingLatest)) {
    return "skipped_stale";
  }

  const key = tickerRecordKey(record.ticker, record.marketDate);
  normalized.tickerRecords![key] = record;

  const currentLatest = getLatestPersistedTickerRecord(normalized, ticker);
  if (currentLatest) {
    normalized.tickerLatestKeys![ticker] = tickerRecordKey(
      currentLatest.ticker,
      currentLatest.marketDate
    );
  }

  store.tickerRecords = normalized.tickerRecords;
  store.tickerLatestKeys = normalized.tickerLatestKeys;
  return "saved";
}

export function verifyPersistedTickerRecord(
  stored: PersistedScannerTickerRecord | null,
  expected: PersistedScannerTickerRecord
): boolean {
  if (!stored) return false;
  if (normalizeTicker(stored.ticker) !== normalizeTicker(expected.ticker)) {
    return false;
  }
  if (stored.marketDate !== expected.marketDate) return false;
  if (stored.result.currentPrice !== expected.result.currentPrice) return false;
  if (stored.candleCount !== expected.candleCount) return false;
  if (stored.refreshedAt !== expected.refreshedAt) return false;
  return true;
}

export function buildAllLatestTickerRecords(
  store: ScannerResultsStore
): Map<string, PersistedScannerTickerRecord> {
  const normalized = normalizeScannerResultsStore(store);
  const map = new Map<string, PersistedScannerTickerRecord>();
  for (const key of Object.keys(normalized.tickerLatestKeys ?? {})) {
    const recordKey = normalized.tickerLatestKeys![key];
    const record = recordKey ? normalized.tickerRecords?.[recordKey] : null;
    if (record) {
      map.set(normalizeTicker(record.ticker), record);
    }
  }
  return map;
}
