import type { ScannerCategory } from "@/core/domain/types/scanner";
import type {
  WatchlistEntry,
} from "@/core/calculations/scanner/watchlist";
import {
  DEFAULT_SCANNER_WATCHLIST,
  getActiveWatchlistEntries,
  resolveFetchSymbol,
} from "@/core/calculations/scanner/watchlist";
import type { ScannerWatchlistRepository } from "@/core/database/repositories/scanner-watchlist-repository";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";

export class ScannerWatchlistService {
  constructor(private repo: ScannerWatchlistRepository) {}

  getWatchlist(): WatchlistEntry[] {
    return this.repo.get();
  }

  getActiveEntries(): WatchlistEntry[] {
    return getActiveWatchlistEntries(this.repo.get());
  }

  saveWatchlist(entries: WatchlistEntry[]): void {
    this.repo.set(entries);
  }

  resetToDefault(): void {
    this.repo.reset();
  }

  addEntry(input: {
    ticker: string;
    category: ScannerCategory;
    fetchSymbol?: string;
  }): WatchlistEntry[] {
    const ticker = normalizeTicker(input.ticker);
    if (!ticker) {
      return this.getWatchlist();
    }

    const current = this.getWatchlist();
    if (current.some((row) => row.ticker === ticker)) {
      return current;
    }

    const next: WatchlistEntry = {
      ticker,
      fetchSymbol: resolveFetchSymbol(ticker, input.fetchSymbol),
      category: input.category,
      market: "US",
      active: true,
    };

    const updated = [...current, next];
    this.repo.set(updated);
    return updated;
  }

  removeEntry(ticker: string): WatchlistEntry[] {
    const normalized = normalizeTicker(ticker);
    const updated = this.getWatchlist().filter((row) => row.ticker !== normalized);
    this.repo.set(updated);
    return updated;
  }

  updateEntry(
    ticker: string,
    patch: Partial<Pick<WatchlistEntry, "category" | "active" | "fetchSymbol">>
  ): WatchlistEntry[] {
    const normalized = normalizeTicker(ticker);
    const updated = this.getWatchlist().map((row) =>
      row.ticker === normalized
        ? {
            ...row,
            ...patch,
            fetchSymbol: resolveFetchSymbol(
              row.ticker,
              patch.fetchSymbol ?? row.fetchSymbol
            ),
          }
        : row
    );
    this.repo.set(updated);
    return updated;
  }

  getDefaultWatchlist(): WatchlistEntry[] {
    return DEFAULT_SCANNER_WATCHLIST.map((row) => ({ ...row }));
  }
}
