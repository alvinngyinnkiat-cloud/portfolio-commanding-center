import type { OptionsSettings } from "@/core/domain/types/options";
import type { OptionsSettingsRepository } from "../repositories/options-repository";
import {
  DEFAULT_OPTIONS_SETTINGS,
  normalizeOptionsSettings,
} from "@/core/domain/defaults-options";
import { STORAGE_KEYS } from "./storage-keys";
import { readJson, writeJson } from "./local-storage";

export class LocalOptionsSettingsRepository implements OptionsSettingsRepository {
  get(): OptionsSettings {
    return normalizeOptionsSettings(
      readJson<Partial<OptionsSettings> | null>(
        STORAGE_KEYS.optionsSettings,
        DEFAULT_OPTIONS_SETTINGS
      ) ?? undefined
    );
  }

  save(settings: OptionsSettings): void {
    writeJson(STORAGE_KEYS.optionsSettings, normalizeOptionsSettings(settings));
  }
}
