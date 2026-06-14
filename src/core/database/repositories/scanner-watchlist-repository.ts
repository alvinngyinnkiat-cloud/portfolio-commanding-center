import type { WatchlistEntry } from "@/core/calculations/scanner/watchlist";

export interface ScannerWatchlistRepository {
  get(): WatchlistEntry[];
  set(entries: WatchlistEntry[]): void;
  reset(): void;
}
