import type {
  CalculatedHolding,
  StockPrice,
  StockTransaction,
} from "@/core/domain/types";
import type { StockTransactionRepository } from "@/core/database/repositories/stock-transaction-repository";
import type { StockPriceRepository } from "@/core/database/repositories/stock-price-repository";
import type { DashboardSettingsRepository } from "@/core/database/repositories/dashboard-settings-repository";
import { calculateHoldings } from "@/core/calculations/stocks/holdings";
import { normalizeStockPrices } from "@/core/calculations/stocks/price-normalize";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";
import { isValidFxRate } from "@/core/calculations/fx-validation";
import { toLocalDateString } from "@/shared/lib/date";
import { compareDateDescWithCreatedAt } from "@/shared/lib/sort";

export interface StockTrackerData {
  transactions: StockTransaction[];
  holdings: CalculatedHolding[];
  prices: StockPrice[];
  fxRate: number | null;
  fxRateValid: boolean;
}

export class StockTrackerService {
  constructor(
    private transactionRepo: StockTransactionRepository,
    private priceRepo: StockPriceRepository,
    private settingsRepo: DashboardSettingsRepository
  ) {}

  getData(): StockTrackerData {
    const transactions = this.transactionRepo.list();
    const prices = normalizeStockPrices(this.priceRepo.list());
    const fxRate = this.settingsRepo.get().usdSgdFxRate;
    const fxRateValid = isValidFxRate(fxRate);

    const holdings = calculateHoldings(
      transactions,
      prices,
      fxRateValid ? fxRate : null
    );

    return {
      transactions: [...transactions].sort(compareDateDescWithCreatedAt),
      holdings,
      prices,
      fxRate,
      fxRateValid,
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
