import type { StockMarket } from "@/core/domain/types";

export interface StockQuoteRequest {
  market: StockMarket;
  ticker: string;
}

export interface StockQuoteResult {
  market: StockMarket;
  ticker: string;
  price: number | null;
  error?: string;
}

/** Yahoo Finance symbol — SG listings use the .SI suffix. */
export function toYahooSymbol(market: StockMarket, ticker: string): string {
  const normalized = ticker.trim().toUpperCase();
  if (market === "SG") {
    return normalized.endsWith(".SI") ? normalized : `${normalized}.SI`;
  }
  return normalized;
}

function parseYahooPrice(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const chart = payload as {
    chart?: {
      result?: Array<{
        meta?: { regularMarketPrice?: number };
      }>;
    };
  };

  const price = chart.chart?.result?.[0]?.meta?.regularMarketPrice;
  return typeof price === "number" && Number.isFinite(price) && price > 0
    ? price
    : null;
}

export async function fetchYahooQuote(
  request: StockQuoteRequest,
  fetchImpl: typeof fetch = fetch
): Promise<StockQuoteResult> {
  const symbol = toYahooSymbol(request.market, request.ticker);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;

  try {
    const response = await fetchImpl(url, {
      headers: {
        "User-Agent": "PortfolioCommandCenter/1.0",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        market: request.market,
        ticker: request.ticker,
        price: null,
        error: `Yahoo Finance HTTP ${response.status}`,
      };
    }

    const payload = await response.json();
    const price = parseYahooPrice(payload);

    if (price == null) {
      return {
        market: request.market,
        ticker: request.ticker,
        price: null,
        error: "Price not available in Yahoo Finance response",
      };
    }

    return {
      market: request.market,
      ticker: request.ticker,
      price,
    };
  } catch (error) {
    return {
      market: request.market,
      ticker: request.ticker,
      price: null,
      error: error instanceof Error ? error.message : "Yahoo Finance fetch failed",
    };
  }
}

export async function fetchYahooQuotes(
  requests: StockQuoteRequest[],
  fetchImpl: typeof fetch = fetch
): Promise<StockQuoteResult[]> {
  return Promise.all(
    requests.map((request) => fetchYahooQuote(request, fetchImpl))
  );
}
