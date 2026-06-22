import { describe, expect, it } from "vitest";
import {
  DEFAULT_OPTIONS_SETTINGS,
  isUnsetOptionsSettings,
  normalizeOptionsSettings,
} from "./defaults-options";

describe("defaults-options", () => {
  it("seeds Aileen client defaults", () => {
    expect(DEFAULT_OPTIONS_SETTINGS).toMatchObject({
      clientName: "Aileen",
      clientStartingCapitalUsd: 3000,
      defaultSharedUserPercent: 55,
      defaultSharedClientPercent: 45,
    });
  });

  it("normalizes empty cloud payload to seeded defaults", () => {
    expect(normalizeOptionsSettings({})).toMatchObject({
      clientName: "Aileen",
      clientStartingCapitalUsd: 3000,
      defaultSharedUserPercent: 55,
      defaultSharedClientPercent: 45,
    });
  });

  it("detects unset settings", () => {
    expect(isUnsetOptionsSettings({ clientName: "", clientStartingCapitalUsd: 0 })).toBe(
      true
    );
    expect(
      isUnsetOptionsSettings({
        clientName: "Aileen",
        clientStartingCapitalUsd: 3000,
      })
    ).toBe(false);
  });
});
