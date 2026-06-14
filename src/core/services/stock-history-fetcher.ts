import type { StockMarket } from "@/core/domain/types";
import type { StockHistoryResult } from "@/core/services/yahoo-history-provider";
import { fetchYahooHistories } from "@/core/services/yahoo-history-provider";

export type StockHistoryFetcher = (
  symbols: Array<{
    market: StockMarket;
    ticker: string;
    displayTicker?: string;
  }>
) => Promise<StockHistoryResult[]>;

export function createBrowserStockHistoryFetcher(): StockHistoryFetcher {
  return async (symbols) => {
    const response = await fetch("/api/stock-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols }),
    });

    if (!response.ok) {
      throw new Error(`Stock history API failed with HTTP ${response.status}`);
    }

    const payload = (await response.json()) as { histories?: StockHistoryResult[] };
    return payload.histories ?? [];
  };
}

/** Server-side fetcher for API routes and Vercel Cron. */
export function createServerStockHistoryFetcher(): StockHistoryFetcher {
  return async (symbols) => fetchYahooHistories(symbols);
}
