import { normalizeOptionsSettings } from "@/core/domain/defaults-options";
import type { OptionsSettings } from "@/core/domain/types/options";
import type { OptionsSettingsRepository } from "@/core/database/repositories/options-repository";

export interface OptionsSettingsDraft {
  clientName?: string;
  clientStartingCapitalUsd?: number;
  defaultSharedUserPercent?: number;
  defaultSharedClientPercent?: number;
}

export interface OptionsSettingsMutationResult {
  ok: boolean;
  settings?: OptionsSettings;
  errors: Array<{ field: string; message: string }>;
}

export class OptionsSettingsService {
  constructor(private settingsRepo: OptionsSettingsRepository) {}

  get(): OptionsSettings {
    return this.settingsRepo.get();
  }

  update(draft: OptionsSettingsDraft): OptionsSettingsMutationResult {
    const errors: Array<{ field: string; message: string }> = [];

    if (draft.clientName !== undefined && draft.clientName.trim() === "") {
      errors.push({ field: "clientName", message: "Client name is required" });
    }

    if (
      draft.clientStartingCapitalUsd !== undefined &&
      (!Number.isFinite(draft.clientStartingCapitalUsd) ||
        draft.clientStartingCapitalUsd < 0)
    ) {
      errors.push({
        field: "clientStartingCapitalUsd",
        message: "Starting capital must be zero or greater",
      });
    }

    if (errors.length > 0) {
      return { ok: false, errors };
    }

    const current = this.settingsRepo.get();
    const updated = normalizeOptionsSettings({
      ...current,
      ...draft,
      clientName:
        draft.clientName !== undefined ? draft.clientName.trim() : current.clientName,
      updatedAt: new Date().toISOString(),
    });

    this.settingsRepo.save(updated);
    return { ok: true, settings: updated, errors: [] };
  }
}
