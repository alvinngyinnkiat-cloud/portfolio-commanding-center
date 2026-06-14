import type { ScannerCategory } from "@/core/domain/types/scanner";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";

export interface WatchlistEntry {
  ticker: string;
  fetchSymbol: string;
  category: ScannerCategory;
  market: "US";
  active: boolean;
}

/** Display ticker → Yahoo Finance fetch symbol overrides. */
export const SCANNER_FETCH_SYMBOL_OVERRIDES: Record<string, string> = {
  XSP: "^XSP",
};

export function resolveFetchSymbol(
  displayTicker: string,
  fetchSymbol?: string
): string {
  const display = normalizeTicker(displayTicker);
  const override = SCANNER_FETCH_SYMBOL_OVERRIDES[display];
  if (override) {
    return override;
  }
  const candidate = fetchSymbol?.trim();
  return candidate || display;
}

function entry(
  ticker: string,
  category: ScannerCategory,
  fetchSymbol?: string
): WatchlistEntry {
  const display = normalizeTicker(ticker);
  return {
    ticker: display,
    fetchSymbol: resolveFetchSymbol(display, fetchSymbol),
    category,
    market: "US",
    active: true,
  };
}
export const DEFAULT_SCANNER_WATCHLIST: WatchlistEntry[] = [
  entry("XSP", "ETF", "^XSP"),
  entry("QQQ", "ETF"),
  entry("IWM", "ETF"),
  entry("MGK", "ETF"),
  entry("JPM", "Sector Leaders"),
  entry("CAT", "Sector Leaders"),
  entry("WMT", "Sector Leaders"),
  entry("UNH", "Sector Leaders"),
  entry("XOM", "Sector Leaders"),
  entry("HD", "Sector Leaders"),
  entry("AAPL", "MAG 7"),
  entry("MSFT", "MAG 7"),
  entry("NVDA", "MAG 7"),
  entry("AVGO", "MAG 7"),
  entry("AMZN", "MAG 7"),
  entry("META", "MAG 7"),
  entry("GOOG", "MAG 7"),
  entry("TMUS", "Pullbacks"),
  entry("NFLX", "Pullbacks"),
  entry("PG", "Pullbacks"),
  entry("V", "Pullbacks"),
  entry("MA", "Pullbacks"),
  entry("ACN", "Pullbacks"),
  entry("INTU", "Pullbacks"),
];

/** @deprecated Use DEFAULT_SCANNER_WATCHLIST */
export const SCANNER_WATCHLIST = DEFAULT_SCANNER_WATCHLIST;

export const SCANNER_PASS_SCORE = 80;

export const SCANNER_CATEGORIES: ScannerCategory[] = [
  "ETF",
  "Sector Leaders",
  "MAG 7",
  "Pullbacks",
  "Custom",
];

export function getActiveWatchlistEntries(
  entries: WatchlistEntry[]
): WatchlistEntry[] {
  return entries.filter((row) => row.active);
}
