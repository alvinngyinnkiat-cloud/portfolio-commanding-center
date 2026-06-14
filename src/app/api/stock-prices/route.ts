import { NextResponse } from "next/server";
import type { StockMarket } from "@/core/domain/types";
import {
  fetchYahooQuotes,
  type StockQuoteRequest,
} from "@/core/services/yahoo-finance-provider";

interface StockPricesRequestBody {
  symbols?: Array<{ market?: string; ticker?: string }>;
}

function isStockMarket(value: string | undefined): value is StockMarket {
  return value === "US" || value === "SG";
}

function normalizeRequests(
  body: StockPricesRequestBody
): StockQuoteRequest[] | null {
  if (!Array.isArray(body.symbols)) {
    return null;
  }

  const requests: StockQuoteRequest[] = [];
  for (const symbol of body.symbols) {
    if (!symbol || !isStockMarket(symbol.market) || !symbol.ticker?.trim()) {
      continue;
    }
    requests.push({
      market: symbol.market,
      ticker: symbol.ticker.trim().toUpperCase(),
    });
  }

  return requests;
}

export async function POST(request: Request) {
  let body: StockPricesRequestBody;
  try {
    body = (await request.json()) as StockPricesRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const symbols = normalizeRequests(body);
  if (!symbols || symbols.length === 0) {
    return NextResponse.json(
      { error: "At least one valid symbol is required" },
      { status: 400 }
    );
  }

  const quotes = await fetchYahooQuotes(symbols);
  return NextResponse.json({ quotes });
}
