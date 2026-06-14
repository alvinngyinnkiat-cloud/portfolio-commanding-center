import type { StockMarket } from "@/core/domain/types";
import type { StockQuoteFetcher } from "./stock-price-update-service";

/** Browser-side fetcher that proxies Yahoo Finance through the Next.js API route. */
export function createBrowserStockQuoteFetcher(): StockQuoteFetcher {
  return async (symbols) => {
    const response = await fetch("/api/stock-prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols }),
    });

    if (!response.ok) {
      throw new Error(`Stock price API failed with HTTP ${response.status}`);
    }

    const payload = (await response.json()) as {
      quotes?: Array<{
        market: StockMarket;
        ticker: string;
        price: number | null;
        error?: string;
      }>;
    };

    return payload.quotes ?? [];
  };
}
