import type {
  PortfolioInputs,
  PortfolioMetrics,
  AssetAllocationItem,
  GoalProgress,
  ContributionTransaction,
  Goal,
  DailySnapshot,
  DashboardSettings,
} from "@/core/domain/types";
import type { ContributionRepository } from "@/core/database/repositories/contribution-repository";
import type { GoalRepository } from "@/core/database/repositories/goal-repository";
import type { SnapshotRepository } from "@/core/database/repositories/snapshot-repository";
import type { DashboardSettingsRepository } from "@/core/database/repositories/dashboard-settings-repository";
import { calculatePortfolioMetrics } from "@/core/calculations/portfolio";
import { calculateAssetAllocation } from "@/core/calculations/allocation";
import { calculateGoalProgress } from "@/core/calculations/goals";

export interface PortfolioDashboardData {
  settings: DashboardSettings;
  inputs: PortfolioInputs;
  metrics: PortfolioMetrics;
  allocation: AssetAllocationItem[];
  goalProgress: GoalProgress[];
  contributions: ContributionTransaction[];
  goals: Goal[];
  snapshots: DailySnapshot[];
}

/**
 * Single entry point for dashboard reads.
 * Future: add Stock/Client module providers as additional input sources.
 */
export class PortfolioAggregator {
  constructor(
    private settingsRepo: DashboardSettingsRepository,
    private contributionRepo: ContributionRepository,
    private goalRepo: GoalRepository,
    private snapshotRepo: SnapshotRepository
  ) {}

  buildInputs(): PortfolioInputs {
    const settings = this.settingsRepo.get();
    const contributions = this.contributionRepo.list();
    const manual = settings.manualValues;

    return {
      usStocksEtfUsd: manual.usStocksEtfUsd,
      sgStocksSgd: manual.sgStocksSgd,
      cryptoSgd: manual.cryptoSgd,
      stockCashUsd: settings.stockCashUsd,
      cryptoCashSgd: settings.cryptoCashSgd,
      clientPortfolioSgd: manual.clientPortfolioSgd,
      clientPortfolioUsd: manual.clientPortfolioUsd,
      fxRate: settings.usdSgdFxRate,
      contributions,
    };
  }

  getPortfolioState(): {
    inputs: PortfolioInputs;
    metrics: PortfolioMetrics;
  } {
    const inputs = this.buildInputs();
    const metrics = calculatePortfolioMetrics(inputs);
    return { inputs, metrics };
  }

  getDashboardData(): PortfolioDashboardData {
    const settings = this.settingsRepo.get();
    const { inputs, metrics } = this.getPortfolioState();

    return {
      settings,
      inputs,
      metrics,
      allocation: calculateAssetAllocation(metrics),
      goalProgress: calculateGoalProgress(
        this.goalRepo.list(),
        metrics.ownPortfolio
      ),
      contributions: this.contributionRepo.list(),
      goals: this.goalRepo.list(),
      snapshots: this.snapshotRepo.list(),
    };
  }
}
