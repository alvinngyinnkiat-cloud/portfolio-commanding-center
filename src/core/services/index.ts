import { createLocalRepositories } from "@/core/database/local";
import { FxService } from "./fx-service";
import { DashboardSettingsService } from "./dashboard-settings-service";
import { ContributionService } from "./contribution-service";
import { GoalService } from "./goal-service";
import { PortfolioAggregator } from "./portfolio-aggregator";
import { SnapshotService } from "./snapshot-service";

export function createPortfolioServices() {
  const repos = createLocalRepositories();

  const aggregator = new PortfolioAggregator(
    repos.dashboardSettings,
    repos.contributions,
    repos.goals,
    repos.snapshots
  );

  return {
    aggregator,
    fx: new FxService(repos.dashboardSettings),
    dashboardSettings: new DashboardSettingsService(repos.dashboardSettings),
    contributions: new ContributionService(repos.contributions),
    goals: new GoalService(repos.goals),
    snapshots: new SnapshotService(repos.snapshots, aggregator),
  };
}

export type PortfolioServices = ReturnType<typeof createPortfolioServices>;
