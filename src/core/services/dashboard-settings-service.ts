import type { DashboardSettings, ManualPortfolioValues } from "@/core/domain/types";
import type { DashboardSettingsRepository } from "@/core/database/repositories/dashboard-settings-repository";

export class DashboardSettingsService {
  constructor(private repo: DashboardSettingsRepository) {}

  get(): DashboardSettings {
    return this.repo.get();
  }

  updateFxAndCash(
    usdSgdFxRate: number,
    stockCashUsd: number,
    cryptoCashSgd: number
  ): void {
    const current = this.repo.get();
    this.repo.save({
      ...current,
      usdSgdFxRate,
      stockCashUsd,
      cryptoCashSgd,
    });
  }

  updateManualValues(manualValues: ManualPortfolioValues): void {
    const current = this.repo.get();
    this.repo.save({ ...current, manualValues });
  }
}
