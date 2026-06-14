import type { StockMarket, StockPrice } from "@/core/domain/types";
import type { StockPriceRepository } from "@/core/database/repositories/stock-price-repository";
import type { StockTransactionRepository } from "@/core/database/repositories/stock-transaction-repository";
import type { StockPriceScheduleRepository } from "@/core/database/repositories/stock-price-schedule-repository";
import type { ScannerWatchlistRepository } from "@/core/database/repositories/scanner-watchlist-repository";
import {
  getOpenPositionSymbols,
  normalizeStockPrice,
} from "@/core/calculations/stocks/price-normalize";
import {
  getActiveWatchlistEntries,
  resolveFetchSymbol,
} from "@/core/calculations/scanner/watchlist";
import {
  getSingaporeDateString,
  isMarketPriceUpdateDue,
} from "@/core/calculations/stocks/price-schedule";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";
import type { StockQuoteResult } from "./yahoo-finance-provider";

export interface StockPriceUpdateResult {
  market: StockMarket;
  updated: boolean;
  symbolsRequested: number;
  symbolsUpdated: number;
  symbolsFailed: number;
}

export type StockQuoteFetcher = (
  symbols: Array<{ market: StockMarket; ticker: string }>
) => Promise<StockQuoteResult[]>;

const MARKETS: StockMarket[] = ["US", "SG"];

export class StockPriceUpdateService {
  constructor(
    private transactionRepo: StockTransactionRepository,
    private priceRepo: StockPriceRepository,
    private scheduleRepo: StockPriceScheduleRepository,
    private watchlistRepo: ScannerWatchlistRepository,
    private fetchQuotes: StockQuoteFetcher
  ) {}

  private getLastUpdateDate(market: StockMarket): string | null {
    const state = this.scheduleRepo.get();
    return market === "US"
      ? state.usLastUpdateDate
      : state.sgLastUpdateDate;
  }

  private markMarketUpdated(market: StockMarket, date: string): void {
    const state = this.scheduleRepo.get();
    if (market === "US") {
      this.scheduleRepo.set({ ...state, usLastUpdateDate: date });
      return;
    }
    this.scheduleRepo.set({ ...state, sgLastUpdateDate: date });
  }

  isMarketUpdateDue(market: StockMarket, date: Date = new Date()): boolean {
    return isMarketPriceUpdateDue(
      market,
      this.getLastUpdateDate(market),
      date
    );
  }

  async updateMarketPricesIfDue(
    market: StockMarket,
    date: Date = new Date()
  ): Promise<StockPriceUpdateResult> {
    if (!this.isMarketUpdateDue(market, date)) {
      return {
        market,
        updated: false,
        symbolsRequested: 0,
        symbolsUpdated: 0,
        symbolsFailed: 0,
      };
    }

    return this.updateMarketPrices(market, date);
  }

  async updateAllDuePrices(date: Date = new Date()): Promise<StockPriceUpdateResult[]> {
    const results: StockPriceUpdateResult[] = [];
    for (const market of MARKETS) {
      const result = await this.updateMarketPricesIfDue(market, date);
      if (result.updated) {
        results.push(result);
      }
    }
    return results;
  }

  /** Force-fetch prices for all open positions (manual refresh — ignores schedule). */
  async refreshAllPrices(date: Date = new Date()): Promise<StockPriceUpdateResult[]> {
    return Promise.all(MARKETS.map((market) => this.updateMarketPrices(market, date)));
  }

  private findExistingPrice(
    market: StockMarket,
    ticker: string
  ): StockPrice | undefined {
    const normalized = normalizeTicker(ticker);
    return this.priceRepo
      .list()
      .find((row) => row.market === market && row.ticker === normalized);
  }

  private applyQuote(
    quote: StockQuoteResult,
    fetchedAt: string,
    priceAsOf: string
  ): "updated" | "failed" | "skipped" {
    const normalized = normalizeTicker(quote.ticker);
    const existing = this.findExistingPrice(quote.market, normalized);

    if (quote.price != null) {
      const next: StockPrice = normalizeStockPrice({
        market: quote.market,
        ticker: normalized,
        latestPrice: quote.price,
        manualPrice: existing?.manualPrice,
        manualPriceUpdatedAt: existing?.manualPriceUpdatedAt,
        lastPriceUpdate: fetchedAt,
        priceAsOf,
        source: "yahoo",
        priceUnavailable: false,
      });
      this.priceRepo.upsert(next);
      return "updated";
    }

    if (existing) {
      this.priceRepo.upsert(
        normalizeStockPrice({
          ...existing,
          manualPrice: existing.manualPrice,
          manualPriceUpdatedAt: existing.manualPriceUpdatedAt,
          priceUnavailable: true,
        })
      );
      return "failed";
    }

    return "skipped";
  }

  private collectMarketSymbols(market: StockMarket): Array<{
    market: StockMarket;
    ticker: string;
    fetchSymbol?: string;
  }> {
    const fromHoldings = getOpenPositionSymbols(
      this.transactionRepo.list(),
      market
    ).map((symbol) => ({
      market: symbol.market,
      ticker: normalizeTicker(symbol.ticker),
    }));

    const fromWatchlist =
      market === "US"
        ? getActiveWatchlistEntries(this.watchlistRepo.get()).map((entry) => ({
            market: "US" as const,
            ticker: normalizeTicker(entry.ticker),
            fetchSymbol: resolveFetchSymbol(entry.ticker, entry.fetchSymbol),
          }))
        : [];

    const seen = new Set<string>();
    const symbols: Array<{
      market: StockMarket;
      ticker: string;
      fetchSymbol?: string;
    }> = [];

    for (const symbol of [...fromHoldings, ...fromWatchlist]) {
      const key = `${symbol.market}:${symbol.ticker}`;
      if (seen.has(key)) continue;
      seen.add(key);
      symbols.push(symbol);
    }

    return symbols;
  }

  async updateMarketPrices(
    market: StockMarket,
    date: Date = new Date()
  ): Promise<StockPriceUpdateResult> {
    const symbols = this.collectMarketSymbols(market);
    const fetchedAt = date.toISOString();
    const priceAsOf = getSingaporeDateString(date);

    if (symbols.length === 0) {
      this.markMarketUpdated(market, priceAsOf);
      return {
        market,
        updated: true,
        symbolsRequested: 0,
        symbolsUpdated: 0,
        symbolsFailed: 0,
      };
    }

    const quotes = await this.fetchQuotes(
      symbols.map((symbol) => ({
        market: symbol.market,
        ticker: symbol.fetchSymbol ?? symbol.ticker,
      }))
    );
    let symbolsUpdated = 0;
    let symbolsFailed = 0;

    for (let index = 0; index < symbols.length; index += 1) {
      const symbol = symbols[index];
      const quote = quotes[index];
      if (!quote) continue;
      const outcome = this.applyQuote(
        { ...quote, ticker: symbol.ticker },
        fetchedAt,
        priceAsOf
      );
      if (outcome === "updated") {
        symbolsUpdated += 1;
      } else if (outcome === "failed") {
        symbolsFailed += 1;
      }
    }

    this.markMarketUpdated(market, priceAsOf);

    return {
      market,
      updated: true,
      symbolsRequested: symbols.length,
      symbolsUpdated,
      symbolsFailed,
    };
  }
}
