import { NextResponse } from "next/server";
import type { StockMarket } from "@/core/domain/types";
import {
  fetchYahooHistories,
  type StockHistoryRequest,
} from "@/core/services/yahoo-history-provider";

interface StockHistoryRequestBody {
  symbols?: Array<{
    market?: string;
    ticker?: string;
    displayTicker?: string;
  }>;
}

function isStockMarket(value: string | undefined): value is StockMarket {
  return value === "US" || value === "SG";
}

function normalizeRequests(
  body: StockHistoryRequestBody
): StockHistoryRequest[] | null {
  if (!Array.isArray(body.symbols)) {
    return null;
  }

  const requests: StockHistoryRequest[] = [];
  for (const symbol of body.symbols) {
    if (!symbol || !isStockMarket(symbol.market) || !symbol.ticker?.trim()) {
      continue;
    }
    requests.push({
      market: symbol.market,
      ticker: symbol.ticker.trim(),
      displayTicker: symbol.displayTicker?.trim().toUpperCase(),
    });
  }
  return requests;
}

export async function POST(request: Request) {
  let body: StockHistoryRequestBody;
  try {
    body = (await request.json()) as StockHistoryRequestBody;
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

  const histories = await fetchYahooHistories(symbols);
  return NextResponse.json({ histories });
}
