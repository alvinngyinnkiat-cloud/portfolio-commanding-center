import type { DashboardSettings } from "@/core/domain/types";

export interface DashboardSettingsRepository {
  get(): DashboardSettings;
  save(settings: DashboardSettings): void;
}
