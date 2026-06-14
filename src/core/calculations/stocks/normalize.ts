import type {
  StockCurrency,
  StockMarket,
  StockTransaction,
} from "@/core/domain/types";

export function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

export function marketToCurrency(market: StockMarket): StockCurrency {
  return market === "US" ? "USD" : "SGD";
}

export function positionKey(market: StockMarket, ticker: string): string {
  return `${market}:${normalizeTicker(ticker)}`;
}

/** Sort ledger rows oldest-first; same-day rows use createdAt. */
export function sortStockTransactions(
  transactions: StockTransaction[]
): StockTransaction[] {
  return [...transactions].sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    return a.createdAt.localeCompare(b.createdAt);
  });
}
