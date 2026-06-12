import type { DashboardSettings } from "@/core/domain/types";
import type { DashboardSettingsRepository } from "../repositories/dashboard-settings-repository";
import { DEFAULT_DASHBOARD_SETTINGS } from "@/core/domain/defaults";
import { STORAGE_KEYS } from "./storage-keys";
import { readJson, writeJson } from "./local-storage";

export class LocalDashboardSettingsRepository
  implements DashboardSettingsRepository
{
  get(): DashboardSettings {
    return readJson(STORAGE_KEYS.dashboardSettings, DEFAULT_DASHBOARD_SETTINGS);
  }

  save(settings: DashboardSettings): void {
    writeJson(STORAGE_KEYS.dashboardSettings, settings);
  }
}
