import type { StockMarket } from "@/core/domain/types";
import { formatUsMarketDateFromUnix } from "@/core/calculations/scanner/us-market-date";
import { toYahooSymbol } from "./yahoo-finance-provider";

export interface StockHistoryRequest {
  market: StockMarket;
  /** Yahoo Finance symbol used for the API request. */
  ticker: string;
  /** Display/storage ticker — candles are keyed under this symbol. */
  displayTicker?: string;
}

export interface StockHistoryCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface StockHistoryResult {
  market: StockMarket;
  ticker: string;
  candles: StockHistoryCandle[];
  error?: string;
}

function parseHistoryPayload(payload: unknown): StockHistoryCandle[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const chart = payload as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: {
          quote?: Array<{
            open?: Array<number | null>;
            high?: Array<number | null>;
            low?: Array<number | null>;
            close?: Array<number | null>;
          }>;
        };
      }>;
    };
  };

  const result = chart.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];
  if (!quote) {
    return [];
  }

  const candles: StockHistoryCandle[] = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    const open = quote.open?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];
    const close = quote.close?.[i];
    if (
      open == null ||
      high == null ||
      low == null ||
      close == null ||
      !Number.isFinite(open) ||
      !Number.isFinite(high) ||
      !Number.isFinite(low) ||
      !Number.isFinite(close)
    ) {
      continue;
    }
    const date = formatUsMarketDateFromUnix(timestamps[i]);
    candles.push({ date, open, high, low, close });
  }

  return candles;
}

export async function fetchYahooHistory(
  request: StockHistoryRequest,
  fetchImpl: typeof fetch = fetch
): Promise<StockHistoryResult> {
  const symbol = toYahooSymbol(request.market, request.ticker);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2y`;

  try {
    const response = await fetchImpl(url, {
      headers: { "User-Agent": "PortfolioCommandCenter/1.0" },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        market: request.market,
        ticker: request.displayTicker ?? request.ticker,
        candles: [],
        error: `Yahoo Finance HTTP ${response.status}`,
      };
    }

    const payload = await response.json();
    const candles = parseHistoryPayload(payload);
    if (candles.length === 0) {
      return {
        market: request.market,
        ticker: request.displayTicker ?? request.ticker,
        candles: [],
        error: "No historical candles in Yahoo Finance response",
      };
    }

    return {
      market: request.market,
      ticker: request.displayTicker ?? request.ticker,
      candles,
    };
  } catch (error) {
    return {
      market: request.market,
      ticker: request.displayTicker ?? request.ticker,
      candles: [],
      error: error instanceof Error ? error.message : "Yahoo Finance fetch failed",
    };
  }
}

export async function fetchYahooHistories(
  requests: StockHistoryRequest[],
  fetchImpl: typeof fetch = fetch
): Promise<StockHistoryResult[]> {
  return Promise.all(
    requests.map((request) => fetchYahooHistory(request, fetchImpl))
  );
}
