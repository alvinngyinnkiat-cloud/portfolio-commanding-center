import type { OptionsTrackerData } from "@/core/domain/types/options";
import type { ContributionRepository } from "@/core/database/repositories/contribution-repository";
import type { StockTransactionRepository } from "@/core/database/repositories/stock-transaction-repository";
import type { DashboardSettingsRepository } from "@/core/database/repositories/dashboard-settings-repository";
import type {
  OptionsSettingsRepository,
  OptionsTradeRepository,
} from "@/core/database/repositories/options-repository";
import type { StockFxConversionRepository } from "@/core/database/repositories/stock-fx-conversion-repository";
import {
  buildClosedTradeRows,
  buildOpenTradeRows,
  buildOptionsCapitalReadiness,
  buildOptionsPerformanceSummary,
  buildOptionsRiskSummary,
  buildOptionsTrackerSummary,
  buildOptionsClientSummary,
  buildTradeTypePerformanceDetail,
} from "@/core/calculations/options";
import type { MarketDataService } from "./market-data-service";

export class OptionsTrackerService {
  constructor(
    private tradeRepo: OptionsTradeRepository,
    private settingsRepo: OptionsSettingsRepository,
    private contributionRepo: ContributionRepository,
    private stockTransactionRepo: StockTransactionRepository,
    private dashboardSettingsRepo: DashboardSettingsRepository,
    private marketData: MarketDataService,
    private fxConversionRepo: StockFxConversionRepository
  ) {}

  getData(): OptionsTrackerData {
    const trades = this.tradeRepo.list();
    const settings = this.settingsRepo.get();
    const contributions = this.contributionRepo.list();
    const fxConversions = this.fxConversionRepo.list();
    const stockTransactions = this.stockTransactionRepo.list();
    const fxRate = this.dashboardSettingsRepo.get().usdSgdFxRate;
    const fxRateValid = isValidFxRate(fxRate);

    const dashboardSettings = this.dashboardSettingsRepo.get();
    const brokerUsdCashOverride = dashboardSettings.brokerUsdCashOverride;

    const calcInput = {
      contributions,
      fxConversions,
      stockTransactions,
      optionsTrades: trades,
      fxRate: fxRateValid ? fxRate : null,
    };

    const marketDataContext = {
      marketData: this.marketData.getRecordMap(),
    };

    return {
      trades,
      settings,
      summary: buildOptionsTrackerSummary(calcInput, brokerUsdCashOverride),
      readiness: buildOptionsCapitalReadiness(calcInput, brokerUsdCashOverride),
      risk: buildOptionsRiskSummary(calcInput),
      performance: buildOptionsPerformanceSummary(trades),
      personalPerformance: buildTradeTypePerformanceDetail(trades, "personal"),
      sharedPerformance: buildTradeTypePerformanceDetail(trades, "shared"),
      openRows: buildOpenTradeRows(trades, undefined, marketDataContext),
      closedRows: buildClosedTradeRows(trades),
      clientSummary: buildOptionsClientSummary(
        settings,
        buildOpenTradeRows(trades, undefined, marketDataContext),
        buildClosedTradeRows(trades)
      ),
      fxRate: fxRateValid ? fxRate : null,
      fxRateValid,
    };
  }
}

import { isValidFxRate } from "@/core/calculations/fx-validation";
