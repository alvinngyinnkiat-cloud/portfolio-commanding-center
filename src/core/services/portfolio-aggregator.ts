import type {
  PortfolioInputs,
  PortfolioMetrics,
  AssetAllocationItem,
  GoalProgress,
  ContributionTransaction,
  Goal,
  DailySnapshot,
  DashboardSettings,
  CashBalances,
} from "@/core/domain/types";
import type { ContributionRepository } from "@/core/database/repositories/contribution-repository";
import type { GoalRepository } from "@/core/database/repositories/goal-repository";
import type { SnapshotRepository } from "@/core/database/repositories/snapshot-repository";
import type { DashboardSettingsRepository } from "@/core/database/repositories/dashboard-settings-repository";
import { deriveDashboardStockValues } from "@/core/adapters/dashboard-stock-adapter";
import {
  buildDashboardStockSummary,
  deriveDashboardStockOutputs,
} from "@/core/adapters/dashboard-stock-adapter";
import { deriveDashboardCryptoOutputs } from "@/core/adapters/dashboard-crypto-adapter";
import {
  deriveDashboardClientPortfolio,
  deriveDashboardOptionsValue,
} from "@/core/adapters/dashboard-client-adapter";
import { calculatePersonalCashContributionSgd } from "@/core/calculations/personal-cash/contributions";
import {
  sumRealizedOptionsPlUsd,
  buildClosedTradeRows,
  buildOpenTradeRows,
  buildOptionsClientSummary,
  buildOptionsTrackerSummary,
} from "@/core/calculations/options";
import type {
  OptionsSettingsRepository,
  OptionsTradeRepository,
} from "@/core/database/repositories/options-repository";
import {
  calculatePortfolioMetrics,
} from "@/core/calculations/portfolio";
import type { StockTrackerService } from "./stock-tracker-service";
import type { CryptoTrackerService } from "./crypto-tracker-service";
import { calculateAssetAllocation } from "@/core/calculations/allocation";
import { calculateGoalProgress } from "@/core/calculations/goals";
import { calculateCashBalancesFromContributions } from "@/core/calculations/contribution-cash";
import {
  DEFAULT_CASH_BALANCES,
  normalizeCashBalances,
} from "@/core/domain/defaults";
import { isValidFxRate } from "@/core/calculations/fx-validation";
import { usdToSgd } from "@/core/calculations/fx";

export interface PortfolioDashboardData {
  settings: DashboardSettings;
  fxRateValid: boolean;
  inputs: PortfolioInputs | null;
  metrics: PortfolioMetrics | null;
  /** Single source of truth for cash — derived from contribution transactions when FX valid */
  cashBalances: CashBalances;
  allocation: AssetAllocationItem[];
  goalProgress: GoalProgress[];
  contributions: ContributionTransaction[];
  goals: Goal[];
  snapshots: DailySnapshot[];
}

export class PortfolioAggregator {
  constructor(
    private settingsRepo: DashboardSettingsRepository,
    private contributionRepo: ContributionRepository,
    private goalRepo: GoalRepository,
    private snapshotRepo: SnapshotRepository,
    private stockTracker: StockTrackerService,
    private cryptoTracker: CryptoTrackerService,
    private optionsTradeRepo: OptionsTradeRepository,
    private optionsSettingsRepo: OptionsSettingsRepository
  ) {}

  deriveCashBalances(
    contributions: ContributionTransaction[],
    fxRate: number
  ): CashBalances {
    return normalizeCashBalances(
      calculateCashBalancesFromContributions(contributions, fxRate)
    );
  }

  buildInputs(
    settings: DashboardSettings,
    contributions: ContributionTransaction[],
    fxRate: number
  ): PortfolioInputs {
    const stockData = this.stockTracker.getData();
    const stockValues = deriveDashboardStockValues(
      stockData.holdings,
      fxRate
    );
    const optionsTrades = this.optionsTradeRepo.list();
    const realizedOptionsPlUsd = sumRealizedOptionsPlUsd(optionsTrades);
    const stockSummary = buildDashboardStockSummary(
      stockData.holdings,
      contributions,
      stockData.transactions,
      fxRate,
      realizedOptionsPlUsd
    );
    const stockOutputs = deriveDashboardStockOutputs(stockSummary);
    const cryptoData = this.cryptoTracker.getData();
    const cryptoOutputs = deriveDashboardCryptoOutputs(cryptoData.summary);
    const optionsSettings = this.optionsSettingsRepo.get();
    const clientSummary = buildOptionsClientSummary(
      optionsSettings,
      buildOpenTradeRows(optionsTrades),
      buildClosedTradeRows(optionsTrades)
    );
    const optionsSummary = buildOptionsTrackerSummary({
      contributions,
      stockTransactions: stockData.transactions,
      optionsTrades,
      fxRate,
    });
    const clientPortfolio = deriveDashboardClientPortfolio(
      settings,
      fxRate,
      clientSummary.clientEquityUsd
    );
    const clientUnrealizedPlSgd =
      clientSummary.clientUnrealizedPlUsd != null
        ? usdToSgd(clientSummary.clientUnrealizedPlUsd, fxRate)
        : 0;

    return {
      usStocksEtfUsd: stockValues.usStocksEtfUsd,
      sgStocksSgd: stockValues.sgStocksSgd,
      cryptoSgd: cryptoOutputs.cryptoTotalValueSgd,
      cryptoHoldingCount: cryptoOutputs.numberOfHoldings,
      usAvailableTradingCashUsd: stockSummary.usAvailableTradingCashUsd,
      sgAvailableTradingCashSgd: stockSummary.sgAvailableTradingCashSgd,
      usdTradingCashUsd: stockSummary.usAvailableTradingCashUsd,
      sgdTradingCashSgd: stockSummary.sgAvailableTradingCashSgd,
      cryptoCashSgd: cryptoOutputs.availableTradingCashSgd,
      clientPortfolioUsd: clientPortfolio.clientPortfolioUsd,
      clientPortfolioSgd: clientPortfolio.clientPortfolioSgd,
      clientStartingCapitalUsd: clientSummary.startingCapitalUsd,
      clientStartingCapitalSgd: usdToSgd(
        clientSummary.startingCapitalUsd,
        fxRate
      ),
      clientRealizedPlUsd: clientSummary.clientRealizedPlUsd,
      clientUnrealizedPlSgd: clientUnrealizedPlSgd,
      fxRate,
      contributions,
      totalStockContributionSgd: stockOutputs.stockContributionSgd,
      usStockContributionSgd: stockSummary.usStockContributionSgd,
      sgStockContributionSgd: stockSummary.sgStockContributionSgd,
      totalStockValueSgd: stockOutputs.totalStockValueSgd,
      stockHoldingsValueSgd: stockOutputs.stockHoldingsValueSgd,
      stockProfitLossSgd: stockOutputs.stockProfitLossSgd,
      stockAvailableTradingCashSgd: stockOutputs.availableTradingCashSgd,
      cryptoContributionSgd: cryptoOutputs.cryptoContributionSgd,
      totalCryptoValueSgd: cryptoOutputs.cryptoTotalValueSgd,
      cryptoHoldingsValueSgd: cryptoOutputs.cryptoHoldingsValueSgd,
      cryptoProfitLossSgd: cryptoOutputs.cryptoProfitLossSgd,
      cryptoAvailableTradingCashSgd: cryptoOutputs.availableTradingCashSgd,
      personalCashContributionSgd:
        calculatePersonalCashContributionSgd(contributions),
      optionsValueSgd: deriveDashboardOptionsValue(
        optionsSummary.userUnrealizedPlUsd,
        fxRate
      ),
    };
  }

  getPortfolioState(
    settings?: DashboardSettings,
    contributions?: ContributionTransaction[]
  ): {
    settings: DashboardSettings;
    contributions: ContributionTransaction[];
    fxRateValid: boolean;
    cashBalances: CashBalances;
    inputs: PortfolioInputs | null;
    metrics: PortfolioMetrics | null;
  } {
    const resolvedSettings = settings ?? this.settingsRepo.get();
    const resolvedContributions =
      contributions ?? this.contributionRepo.list();
    const fxRate = resolvedSettings.usdSgdFxRate;

    if (!isValidFxRate(fxRate)) {
      return {
        settings: resolvedSettings,
        contributions: resolvedContributions,
        fxRateValid: false,
        cashBalances: normalizeCashBalances(DEFAULT_CASH_BALANCES),
        inputs: null,
        metrics: null,
      };
    }

    const cashBalances = this.deriveCashBalances(
      resolvedContributions,
      fxRate!
    );
    const inputs = this.buildInputs(
      resolvedSettings,
      resolvedContributions,
      fxRate!
    );
    const metrics = calculatePortfolioMetrics(inputs);

    return {
      settings: resolvedSettings,
      contributions: resolvedContributions,
      fxRateValid: true,
      cashBalances,
      inputs,
      metrics,
    };
  }

  getDashboardData(): PortfolioDashboardData {
    const state = this.getPortfolioState();
    const goals = this.goalRepo.list();

    if (!state.fxRateValid || !state.metrics) {
      return {
        settings: state.settings,
        fxRateValid: false,
        inputs: null,
        metrics: null,
        cashBalances: normalizeCashBalances(state.cashBalances),
        allocation: [],
        goalProgress: calculateGoalProgress(goals, 0),
        contributions: state.contributions,
        goals,
        snapshots: this.snapshotRepo.list(),
      };
    }

    return {
      settings: state.settings,
      fxRateValid: true,
      inputs: state.inputs,
      metrics: state.metrics,
      cashBalances: normalizeCashBalances(state.cashBalances),
      allocation: calculateAssetAllocation(state.metrics),
      goalProgress: calculateGoalProgress(
        goals,
        state.metrics.totalPortfolioValue
      ),
      contributions: state.contributions,
      goals,
      snapshots: this.snapshotRepo.list(),
    };
  }
}
