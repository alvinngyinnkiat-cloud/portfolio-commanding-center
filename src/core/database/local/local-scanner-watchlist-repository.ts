import type { WatchlistEntry } from "@/core/calculations/scanner/watchlist";
import {
  DEFAULT_SCANNER_WATCHLIST,
  resolveFetchSymbol,
  SCANNER_CATEGORIES,
} from "@/core/calculations/scanner/watchlist";
import type { ScannerCategory } from "@/core/domain/types/scanner";
import type { ScannerWatchlistRepository } from "../repositories/scanner-watchlist-repository";
import { STORAGE_KEYS } from "./storage-keys";
import { readJson, writeJson } from "./local-storage";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";

function normalizeCategory(value: ScannerCategory | string): ScannerCategory {
  if (SCANNER_CATEGORIES.includes(value as ScannerCategory)) {
    return value as ScannerCategory;
  }
  return "Custom";
}

function normalizeEntry(raw: WatchlistEntry): WatchlistEntry {
  const ticker = normalizeTicker(raw.ticker);
  return {
    ticker,
    fetchSymbol: resolveFetchSymbol(ticker, raw.fetchSymbol),
    category: normalizeCategory(raw.category),
    market: "US",
    active: raw.active !== false,
  };
}

export class LocalScannerWatchlistRepository implements ScannerWatchlistRepository {
  get(): WatchlistEntry[] {
    const stored = readJson<WatchlistEntry[] | null>(
      STORAGE_KEYS.scannerWatchlist,
      null
    );
    if (!stored || stored.length === 0) {
      return DEFAULT_SCANNER_WATCHLIST.map(normalizeEntry);
    }
    return stored.map(normalizeEntry);
  }

  set(entries: WatchlistEntry[]): void {
    writeJson(
      STORAGE_KEYS.scannerWatchlist,
      entries.map(normalizeEntry)
    );
  }

  reset(): void {
    writeJson(
      STORAGE_KEYS.scannerWatchlist,
      DEFAULT_SCANNER_WATCHLIST.map(normalizeEntry)
    );
  }
}
