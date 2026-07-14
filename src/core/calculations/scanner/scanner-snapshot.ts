import type {
  ScannerCandleBar,
  ScannerIndicators,
  ScannerScanRun,
  ScannerTickerResult,
} from "@/core/domain/types/scanner";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";

export interface LatestScannerRecord {
  ticker: string;
  currentPrice: number;
  /** Scanner market session date for the price (priceAsOf). */
  marketDate: string | null;
  /** ISO timestamp when the parent scan run completed. */
  refreshedAt: string;
  scanDate: string;
  indicators: ScannerIndicators;
  recentCandles: ScannerCandleBar[];
  status: ScannerTickerResult["status"];
  sourceRunId: string;
  /** True when this record is not from the latest persisted scan run. */
  isTickerStale: boolean;
}

interface ScannerRecordCandidate {
  ticker: string;
  currentPrice: number;
  marketDate: string | null;
  refreshedAt: string;
  scanDate: string;
  indicators: ScannerIndicators;
  recentCandles: ScannerCandleBar[];
  status: ScannerTickerResult["status"];
  sourceRunId: string;
}

function isValidScannerPrice(price: number | null | undefined): price is number {
  return price != null && Number.isFinite(price) && price > 0;
}

function compareScannerRecordCandidates(
  a: ScannerRecordCandidate,
  b: ScannerRecordCandidate
): number {
  const marketA = a.marketDate ?? "";
  const marketB = b.marketDate ?? "";
  if (marketA !== marketB) {
    return marketB.localeCompare(marketA);
  }

  const refreshedA = a.refreshedAt ?? "";
  const refreshedB = b.refreshedAt ?? "";
  if (refreshedA !== refreshedB) {
    return refreshedB.localeCompare(refreshedA);
  }

  return b.scanDate.localeCompare(a.scanDate);
}

function flattenRunsToCandidates(runs: ScannerScanRun[]): ScannerRecordCandidate[] {
  const candidates: ScannerRecordCandidate[] = [];

  for (const run of runs) {
    if (run.refreshStatus === "failed") continue;

    for (const result of run.results) {
      if (!isValidScannerPrice(result.currentPrice)) continue;

      candidates.push({
        ticker: normalizeTicker(result.ticker),
        currentPrice: result.currentPrice,
        marketDate: result.priceAsOf,
        refreshedAt: run.scanTime,
        scanDate: run.scanDate,
        indicators: result.indicators,
        recentCandles: result.recentCandles,
        status: result.status,
        sourceRunId: run.id,
      });
    }
  }

  return candidates;
}

export function buildLatestScannerRecordMap(
  runs: Array<ScannerScanRun | null | undefined>
): Map<string, LatestScannerRecord> {
  const normalizedRuns = runs.filter(
    (run): run is ScannerScanRun => run != null
  );
  const latestRun = normalizedRuns[0] ?? null;
  const candidates = flattenRunsToCandidates(normalizedRuns);
  const sorted = [...candidates].sort(compareScannerRecordCandidates);
  const map = new Map<string, LatestScannerRecord>();

  for (const candidate of sorted) {
    if (map.has(candidate.ticker)) continue;

    map.set(candidate.ticker, {
      ...candidate,
      isTickerStale: latestRun != null && candidate.sourceRunId !== latestRun.id,
    });
  }

  return map;
}

export function getLatestScannerRecordFromRuns(
  runs: Array<ScannerScanRun | null | undefined>,
  ticker: string
): LatestScannerRecord | null {
  const key = normalizeTicker(ticker);
  return buildLatestScannerRecordMap(runs).get(key) ?? null;
}

export function formatScannerRecordMarketDateLabel(
  record: LatestScannerRecord | null
): string | null {
  if (!record) return null;
  const market = record.marketDate ?? "—";
  const refreshed = new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(record.refreshedAt))
    .replace(",", "");

  return `Scanner market date: ${market} · refreshed ${refreshed}`;
}
