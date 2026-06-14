import type { StockMarket } from "@/core/domain/types";

import type { StockDailyCandleRepository } from "@/core/database/repositories/stock-daily-candle-repository";

import type { StockWeeklyCandleRepository } from "@/core/database/repositories/stock-weekly-candle-repository";

import type { StockTransactionRepository } from "@/core/database/repositories/stock-transaction-repository";

import type { StockPriceScheduleRepository } from "@/core/database/repositories/stock-price-schedule-repository";

import type { ScannerWatchlistRepository } from "@/core/database/repositories/scanner-watchlist-repository";

import { getOpenPositionSymbols } from "@/core/calculations/stocks/price-normalize";

import { normalizeTicker } from "@/core/calculations/stocks/normalize";

import { getActiveWatchlistEntries, resolveFetchSymbol } from "@/core/calculations/scanner/watchlist";

import {

  getSingaporeDateString,

  isSingaporeTimeAtOrAfter,

  US_PRICE_UPDATE_HOUR,

  US_PRICE_UPDATE_MINUTE,

} from "@/core/calculations/stocks/price-schedule";

import { aggregateWeeklyCandles } from "@/core/calculations/stocks/weekly-candles";

import type { StockDailyCandle } from "@/core/domain/types";

import type { StockHistoryFetcher } from "./stock-history-fetcher";



export interface StockCandleUpdateResult {

  updated: boolean;

  symbolsRequested: number;

  symbolsUpdated: number;

  symbolsFailed: number;

}



interface UsSymbolTarget {

  market: StockMarket;

  ticker: string;

  fetchSymbol: string;

}



export class StockCandleUpdateService {

  constructor(

    private transactionRepo: StockTransactionRepository,

    private dailyRepo: StockDailyCandleRepository,

    private weeklyRepo: StockWeeklyCandleRepository,

    private scheduleRepo: StockPriceScheduleRepository,

    private watchlistRepo: ScannerWatchlistRepository,

    private fetchHistory: StockHistoryFetcher

  ) {}



  isUsCandleUpdateDue(date: Date = new Date()): boolean {

    const state = this.scheduleRepo.get();

    const today = getSingaporeDateString(date);

    if (state.usLastCandleUpdateDate === today) {

      return false;

    }

    return isSingaporeTimeAtOrAfter(

      US_PRICE_UPDATE_HOUR,

      US_PRICE_UPDATE_MINUTE,

      date

    );

  }



  private collectUsSymbols(): UsSymbolTarget[] {

    const fromHoldings = getOpenPositionSymbols(

      this.transactionRepo.list(),

      "US"

    ).map((symbol) => ({

      market: "US" as const,

      ticker: normalizeTicker(symbol.ticker),

      fetchSymbol: normalizeTicker(symbol.ticker),

    }));



    const fromWatchlist = getActiveWatchlistEntries(this.watchlistRepo.get()).map(

      (entry) => ({

        market: "US" as const,

        ticker: normalizeTicker(entry.ticker),

        fetchSymbol: resolveFetchSymbol(entry.ticker, entry.fetchSymbol),

      })

    );



    const seen = new Set<string>();

    const symbols: UsSymbolTarget[] = [];

    for (const symbol of [...fromHoldings, ...fromWatchlist]) {

      if (seen.has(symbol.ticker)) {

        continue;

      }

      seen.add(symbol.ticker);

      symbols.push(symbol);

    }

    return symbols;

  }



  async updateUsCandlesIfDue(

    date: Date = new Date()

  ): Promise<StockCandleUpdateResult> {

    if (!this.isUsCandleUpdateDue(date)) {

      return {

        updated: false,

        symbolsRequested: 0,

        symbolsUpdated: 0,

        symbolsFailed: 0,

      };

    }

    return this.updateUsCandles(date);

  }



  async updateUsCandles(date: Date = new Date()): Promise<StockCandleUpdateResult> {

    const symbols = this.collectUsSymbols();

    const fetchedAt = date.toISOString();

    const today = getSingaporeDateString(date);



    if (symbols.length === 0) {

      const state = this.scheduleRepo.get();

      this.scheduleRepo.set({ ...state, usLastCandleUpdateDate: today });

      return {

        updated: true,

        symbolsRequested: 0,

        symbolsUpdated: 0,

        symbolsFailed: 0,

      };

    }



    const histories = await this.fetchHistory(

      symbols.map((symbol) => ({

        market: symbol.market,

        ticker: symbol.fetchSymbol,

        displayTicker: symbol.ticker,

      }))

    );

    let symbolsUpdated = 0;

    let symbolsFailed = 0;



    for (const history of histories) {

      if (history.candles.length === 0) {

        symbolsFailed += 1;

        continue;

      }



      const normalized = normalizeTicker(history.ticker);

      const daily: StockDailyCandle[] = history.candles.map((candle) => ({

        market: history.market,

        ticker: normalized,

        date: candle.date,

        open: candle.open,

        high: candle.high,

        low: candle.low,

        close: candle.close,

        source: "yahoo",

        fetchedAt,

      }));



      this.dailyRepo.replaceForTicker(history.market, normalized, daily);

      this.weeklyRepo.replaceForTicker(

        history.market,

        normalized,

        aggregateWeeklyCandles(daily)

      );

      symbolsUpdated += 1;

    }



    const state = this.scheduleRepo.get();

    this.scheduleRepo.set({ ...state, usLastCandleUpdateDate: today });



    return {

      updated: true,

      symbolsRequested: symbols.length,

      symbolsUpdated,

      symbolsFailed,

    };

  }

}

