import type {
  CalculatedHolding,
  ContributionTransaction,
  StockPrice,
  StockTransaction,
} from "@/core/domain/types";
import type { StockFxConversion } from "@/core/domain/types/stock-fx-conversion";
import type { StockTransactionRepository } from "@/core/database/repositories/stock-transaction-repository";
import type { StockPriceRepository } from "@/core/database/repositories/stock-price-repository";
import type { DashboardSettingsRepository } from "@/core/database/repositories/dashboard-settings-repository";
import type { ContributionRepository } from "@/core/database/repositories/contribution-repository";
import type { StockFxConversionRepository } from "@/core/database/repositories/stock-fx-conversion-repository";
import { calculateHoldings } from "@/core/calculations/stocks/holdings";
import { normalizeStockPrices } from "@/core/calculations/stocks/price-normalize";
import { normalizeStockTransactions } from "@/core/calculations/stocks/transaction-normalize";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";
import { isValidFxRate } from "@/core/calculations/fx-validation";
import { toLocalDateString } from "@/shared/lib/date";
import { compareDateDescWithCreatedAt, sortByDateDesc } from "@/shared/lib/sort";
import {
  buildStockCashFlowSummary,
  type StockCashFlowSummary,
} from "@/core/calculations/stocks/cash-flow";

export interface StockCashFlowData {
  summary: StockCashFlowSummary;
  deposits: ContributionTransaction[];
  fxConversions: StockFxConversion[];
}

export interface StockTrackerData {
  transactions: StockTransaction[];
  holdings: CalculatedHolding[];
  prices: StockPrice[];
  fxRate: number | null;
  fxRateValid: boolean;
  cashFlow: StockCashFlowData;
}

export class StockTrackerService {
  constructor(
    private transactionRepo: StockTransactionRepository,
    private priceRepo: StockPriceRepository,
    private settingsRepo: DashboardSettingsRepository,
    private contributionRepo: ContributionRepository,
    private fxConversionRepo: StockFxConversionRepository
  ) {}

  getData(): StockTrackerData {
    const transactions = normalizeStockTransactions(this.transactionRepo.list());
    const prices = normalizeStockPrices(this.priceRepo.list());
    const fxRate = this.settingsRepo.get().usdSgdFxRate;
    const fxRateValid = isValidFxRate(fxRate);
    const fxConversions = this.fxConversionRepo.list();
    const deposits = sortByDateDesc(
      this.contributionRepo
        .list()
        .filter((row) => row.category === "stock")
    );

    let holdings: CalculatedHolding[] = [];
    try {
      holdings = calculateHoldings(
        transactions,
        prices,
        fxRateValid ? fxRate : null
      );
    } catch (error) {
      console.error(
        "[StockTrackerService] holdings rebuild failed — transactions preserved",
        error
      );
    }

    return {
      transactions: [...transactions].sort(compareDateDescWithCreatedAt),
      holdings,
      prices,
      fxRate,
      fxRateValid,
      cashFlow: {
        summary: buildStockCashFlowSummary(deposits, fxConversions, fxRate),
        deposits,
        fxConversions: sortByDateDesc(fxConversions),
      },
    };
  }

  upsertManualPrice(
    market: StockPrice["market"],
    ticker: string,
    manualPrice: number
  ): StockPrice | null {
    if (!Number.isFinite(manualPrice) || manualPrice <= 0) {
      return null;
    }

    const normalized = normalizeTicker(ticker);
    const existing = this.priceRepo
      .list()
      .find((row) => row.market === market && row.ticker === normalized);
    const now = new Date().toISOString();

    const price = normalizeStockPrices([
      {
        market,
        ticker: normalized,
        latestPrice: existing?.latestPrice ?? 0,
        manualPrice,
        manualPriceUpdatedAt: now,
        lastPriceUpdate: existing?.lastPriceUpdate ?? now,
        priceAsOf: existing?.priceAsOf ?? toLocalDateString(),
        source: existing?.source ?? "yahoo",
        priceUnavailable: existing?.priceUnavailable,
      },
    ])[0];

    this.priceRepo.upsert(price);
    return price;
  }
}
