import type { IncomeOverlaySettings } from "@/core/domain/types/income";

export const INCOME_OVERLAY_SETTINGS_KEY = "portfolio:income_overlay_settings";

export const DEFAULT_INCOME_OVERLAY_SETTINGS: IncomeOverlaySettings = {
  foundationTriggerAtrMultiplier: 2.5,
  minFoundationDte: 45,
  updatedAt: new Date().toISOString(),
};

export function normalizeIncomeOverlaySettings(
  raw: Partial<IncomeOverlaySettings> | null | undefined
): IncomeOverlaySettings {
  const multiplier = raw?.foundationTriggerAtrMultiplier;
  const minDte = raw?.minFoundationDte;

  return {
    foundationTriggerAtrMultiplier:
      typeof multiplier === "number" && multiplier > 0 ? multiplier : 2.5,
    minFoundationDte: typeof minDte === "number" && minDte >= 0 ? minDte : 45,
    updatedAt: raw?.updatedAt ?? new Date().toISOString(),
  };
}

export function readIncomeOverlaySettings(): IncomeOverlaySettings {
  if (typeof window === "undefined") {
    return DEFAULT_INCOME_OVERLAY_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(INCOME_OVERLAY_SETTINGS_KEY);
    if (!raw) return DEFAULT_INCOME_OVERLAY_SETTINGS;
    return normalizeIncomeOverlaySettings(JSON.parse(raw) as Partial<IncomeOverlaySettings>);
  } catch {
    return DEFAULT_INCOME_OVERLAY_SETTINGS;
  }
}

export function writeIncomeOverlaySettings(
  settings: IncomeOverlaySettings
): IncomeOverlaySettings {
  const normalized = normalizeIncomeOverlaySettings({
    ...settings,
    updatedAt: new Date().toISOString(),
  });
  if (typeof window !== "undefined") {
    localStorage.setItem(INCOME_OVERLAY_SETTINGS_KEY, JSON.stringify(normalized));
  }
  return normalized;
}
