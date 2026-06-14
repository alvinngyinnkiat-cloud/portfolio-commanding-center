import type { DashboardSettings } from "@/core/domain/types";
import type { DashboardSettingsRepository } from "../repositories/dashboard-settings-repository";
import { DEFAULT_DASHBOARD_SETTINGS } from "@/core/domain/defaults";
import { STORAGE_KEYS } from "./storage-keys";
import { readJson, writeJson } from "./local-storage";
import { normalizeDashboardSettings } from "./normalize-settings";

export class LocalDashboardSettingsRepository
  implements DashboardSettingsRepository
{
  get(): DashboardSettings {
    const raw = readJson(
      STORAGE_KEYS.dashboardSettings,
      DEFAULT_DASHBOARD_SETTINGS
    );
    return normalizeDashboardSettings(raw);
  }

  save(settings: DashboardSettings): void {
    writeJson(
      STORAGE_KEYS.dashboardSettings,
      normalizeDashboardSettings(settings)
    );
  }
}
