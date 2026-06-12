import { migrateLegacyStorageIfNeeded } from "./migrate-legacy";
import { LocalContributionRepository } from "./local-contribution-repository";
import { LocalGoalRepository } from "./local-goal-repository";
import { LocalSnapshotRepository } from "./local-snapshot-repository";
import { LocalDashboardSettingsRepository } from "./local-dashboard-settings-repository";

export function createLocalRepositories() {
  migrateLegacyStorageIfNeeded();
  return {
    contributions: new LocalContributionRepository(),
    goals: new LocalGoalRepository(),
    snapshots: new LocalSnapshotRepository(),
    dashboardSettings: new LocalDashboardSettingsRepository(),
  };
}

export { generateId } from "./local-storage";
