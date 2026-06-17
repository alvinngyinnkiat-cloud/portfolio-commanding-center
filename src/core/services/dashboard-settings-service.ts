import type { DashboardSettings, ManualPortfolioValues } from "@/core/domain/types";
import type { DashboardSettingsRepository } from "@/core/database/repositories/dashboard-settings-repository";
import { normalizeBrokerUsdCashOverride } from "@/core/calculations/us-cash/effective-cash";

export class DashboardSettingsService {
  constructor(private repo: DashboardSettingsRepository) {}

  get(): DashboardSettings {
    return this.repo.get();
  }

  updatePortfolioValues(
    usdSgdFxRate: number | null,
    manualValues: ManualPortfolioValues
  ): void {
    const current = this.repo.get();
    this.repo.save({
      ...current,
      usdSgdFxRate,
      manualValues,
    });
  }

  updateManualValues(manualValues: ManualPortfolioValues): void {
    const current = this.repo.get();
    this.repo.save({ ...current, manualValues });
  }

  updateBrokerUsdCashOverride(
    brokerUsdCashOverride: number | null,
    brokerUsdCashLastUpdated: string | null
  ): void {
    const current = this.repo.get();
    this.repo.save({
      ...current,
      brokerUsdCashOverride: normalizeBrokerUsdCashOverride(
        brokerUsdCashOverride
      ),
      brokerUsdCashLastUpdated:
        brokerUsdCashLastUpdated?.trim() || null,
    });
  }
}
