import { describe, expect, it } from "vitest";
import {
  calculateIronCondorMetrics,
  validateIronCondorStrikes,
} from "./iron-condor";
import { resolveOpenTradeDraft, validateOpenTradeDraft } from "./validation";
import { requiresManualMaxRisk } from "./vertical-spread";
import { DEFAULT_OPTIONS_SETTINGS } from "@/core/domain/defaults-options";

describe("iron condor calculations", () => {
  it("NVDA example: widths, max profit, max risk, breakevens", () => {
    const metrics = calculateIronCondorMetrics({
      bullPutShortStrikeUsd: 105,
      bullPutLongStrikeUsd: 100,
      bearCallShortStrikeUsd: 195,
      bearCallLongStrikeUsd: 200,
      contracts: 1,
      openPremiumUsd: 100,
      openFeesUsd: 5,
    });

    expect(metrics.bullPutWidthPerShare).toBe(5);
    expect(metrics.bearCallWidthPerShare).toBe(5);
    expect(metrics.ironCondorWidthPerShare).toBe(5);
    expect(metrics.maxProfitUsd).toBe(95);
    expect(metrics.netCreditUsd).toBe(95);
    expect(metrics.tpExitPrice75Usd).toBeCloseTo(23.75, 4);
    expect(metrics.maxRiskUsd).toBe(405);
    expect(metrics.netCreditPerShare).toBeCloseTo(0.95, 4);
    expect(metrics.lowerBreakevenUsd).toBeCloseTo(104.05, 4);
    expect(metrics.upperBreakevenUsd).toBeCloseTo(195.95, 4);
  });

  it("uses wider wing only when sides differ", () => {
    const metrics = calculateIronCondorMetrics({
      bullPutShortStrikeUsd: 105,
      bullPutLongStrikeUsd: 100,
      bearCallShortStrikeUsd: 195,
      bearCallLongStrikeUsd: 205,
      contracts: 1,
      openPremiumUsd: 120,
      openFeesUsd: 5,
    });

    expect(metrics.bullPutWidthPerShare).toBe(5);
    expect(metrics.bearCallWidthPerShare).toBe(10);
    expect(metrics.ironCondorWidthPerShare).toBe(10);
    expect(metrics.maxRiskUsd).toBe(885);
  });

  it("rejects invalid strike ordering", () => {
    expect(
      validateIronCondorStrikes({
        bullPutShortStrikeUsd: 100,
        bullPutLongStrikeUsd: 105,
        bearCallShortStrikeUsd: 195,
        bearCallLongStrikeUsd: 200,
        contracts: 1,
        openPremiumUsd: 100,
        openFeesUsd: 5,
      })
    ).toContain("short strike must be above");
  });
});

describe("iron condor validation and resolution", () => {
  it("derives max risk from strikes — not manual", () => {
    const draft = {
      tradeType: "personal" as const,
      userSharePercent: 100,
      clientSharePercent: 0,
      strategy: "ironCondor" as const,
      underlying: "NVDA",
      expirationDate: "2025-06-20",
      contracts: 1,
      bullPutShortStrikeUsd: 105,
      bullPutLongStrikeUsd: 100,
      bearCallShortStrikeUsd: 195,
      bearCallLongStrikeUsd: 200,
      openDate: "2025-06-01",
      openPremiumUsd: 100,
      openFeesUsd: 5,
    };

    const errors = validateOpenTradeDraft(draft, DEFAULT_OPTIONS_SETTINGS);
    expect(errors).toHaveLength(0);

    const resolved = resolveOpenTradeDraft(draft);
    expect(resolved.maxRiskUsd).toBe(405);
    expect(resolved.bullPutShortStrikeUsd).toBe(105);
    expect(resolved.bearCallLongStrikeUsd).toBe(200);
  });

  it("iron condor does not require manual max risk", () => {
    expect(requiresManualMaxRisk("ironCondor")).toBe(false);
    expect(requiresManualMaxRisk("custom")).toBe(true);
  });
});
