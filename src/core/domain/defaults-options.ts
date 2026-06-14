import type { OptionsSettings } from "@/core/domain/types/options";
import { normalizeShareSplit } from "@/core/calculations/options/split";

export const DEFAULT_OPTIONS_SETTINGS: OptionsSettings = {
  clientName: "",
  clientStartingCapitalUsd: 0,
  defaultSharedUserPercent: 55,
  defaultSharedClientPercent: 45,
  updatedAt: new Date(0).toISOString(),
};

export function normalizeOptionsSettings(raw?: Partial<OptionsSettings>): OptionsSettings {
  const split = normalizeShareSplit(
    Number(raw?.defaultSharedUserPercent),
    Number(raw?.defaultSharedClientPercent)
  );
  const startingCapital = Number(raw?.clientStartingCapitalUsd);
  const name = raw?.clientName?.trim();

  return {
    clientName: name || DEFAULT_OPTIONS_SETTINGS.clientName,
    clientStartingCapitalUsd: Number.isFinite(startingCapital)
      ? Math.max(0, startingCapital)
      : DEFAULT_OPTIONS_SETTINGS.clientStartingCapitalUsd,
    defaultSharedUserPercent: split.userSharePercent,
    defaultSharedClientPercent: split.clientSharePercent,
    updatedAt: raw?.updatedAt ?? new Date().toISOString(),
  };
}
