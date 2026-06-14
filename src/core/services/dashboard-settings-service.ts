import type { DashboardSettings, ManualPortfolioValues } from "@/core/domain/types";
import type { DashboardSettingsRepository } from "@/core/database/repositories/dashboard-settings-repository";

export class DashboardSettingsService {
  constructor(private repo: DashboardSettingsRepository) {}

  get(): DashboardSettings {
    return this.repo.get();
  }

  updatePortfolioValues(
    usdSgdFxRate: number | null,
    manualValues: ManualPortfolioValues
  ): void {
    this.repo.save({ usdSgdFxRate, manualValues });
  }

  updateManualValues(manualValues: ManualPortfolioValues): void {
    const current = this.repo.get();
    this.repo.save({ ...current, manualValues });
  }
}
