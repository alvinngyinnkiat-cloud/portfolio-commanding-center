import type { DashboardSettingsRepository } from "@/core/database/repositories/dashboard-settings-repository";

export class FxService {
  constructor(private settingsRepo: DashboardSettingsRepository) {}

  getActiveRate(): number | null {
    return this.settingsRepo.get().usdSgdFxRate;
  }
}
