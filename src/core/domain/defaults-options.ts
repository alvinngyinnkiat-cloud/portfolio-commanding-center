import type { OptionsSettings } from "@/core/domain/types/options";
import { normalizeShareSplit } from "@/core/calculations/options/split";

export const DEFAULT_OPTIONS_SETTINGS: OptionsSettings = {
  clientName: "Aileen",
  clientStartingCapitalUsd: 3000,
  defaultSharedUserPercent: 55,
  defaultSharedClientPercent: 45,
  updatedAt: new Date(0).toISOString(),
};

export function isUnsetOptionsSettings(
  settings: Partial<OptionsSettings> | undefined
): boolean {
  const name = settings?.clientName?.trim() ?? "";
  const capital = Number(settings?.clientStartingCapitalUsd);
  return name.length === 0 && (!Number.isFinite(capital) || capital <= 0);
}

export function normalizeOptionsSettings(raw?: Partial<OptionsSettings>): OptionsSettings {
  const userPercent = Number(raw?.defaultSharedUserPercent);
  const clientPercent = Number(raw?.defaultSharedClientPercent);
  const split = normalizeShareSplit(
    Number.isFinite(userPercent)
      ? userPercent
      : DEFAULT_OPTIONS_SETTINGS.defaultSharedUserPercent,
    Number.isFinite(clientPercent)
      ? clientPercent
      : DEFAULT_OPTIONS_SETTINGS.defaultSharedClientPercent
  );
  const startingCapital = Number(raw?.clientStartingCapitalUsd);
  const startingCapitalSgd = Number(raw?.clientStartingCapitalSgd);
  const name = raw?.clientName?.trim();

  return {
    clientName: name || DEFAULT_OPTIONS_SETTINGS.clientName,
    clientStartingCapitalUsd: Number.isFinite(startingCapital)
      ? Math.max(0, startingCapital)
      : DEFAULT_OPTIONS_SETTINGS.clientStartingCapitalUsd,
    clientStartingCapitalSgd:
      Number.isFinite(startingCapitalSgd) && startingCapitalSgd >= 0
        ? startingCapitalSgd
        : undefined,
    defaultSharedUserPercent: split.userSharePercent,
    defaultSharedClientPercent: split.clientSharePercent,
    updatedAt: raw?.updatedAt ?? new Date().toISOString(),
  };
}
