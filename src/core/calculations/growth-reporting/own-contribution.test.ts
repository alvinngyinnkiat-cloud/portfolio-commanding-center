import { describe, expect, it } from "vitest";
import {
  buildGrowthSummary,
  deriveOwnContributionSgd,
  deriveOwnPortfolioPerformance,
} from "./index";
import type { PortfolioMetrics } from "@/core/domain/types";

describe("own contribution (Portfolio Growth)", () => {
  it("excludes client capital from cumulative contribution", () => {
    expect(deriveOwnContributionSgd(48_900, 3_900)).toBe(45_000);
  });

  it("computes own P/L and return % from own contribution only", () => {
    const result = deriveOwnPortfolioPerformance(45_280.6, 48_900, 3_900);

    expect(result.ownContribution).toBe(45_000);
    expect(result.profitLoss).toBeCloseTo(280.6, 2);
    expect(result.returnPercent).toBeCloseTo(0.62, 2);
  });

  it("buildGrowthSummary uses own contribution, not combined total", () => {
    const metrics = {
      totalPortfolioValue: 45_280.6,
      totalPortfolio: 50_000,
      totalContribution: 48_900,
      totalPL: -3_619.4,
      totalPLPercent: -7.4,
    } as PortfolioMetrics;

    const summary = buildGrowthSummary([], metrics, 3_900);

    expect(summary?.totalContribution).toBe(45_000);
    expect(summary?.totalPL).toBeCloseTo(280.6, 2);
    expect(summary?.totalPLPercent).toBeCloseTo(0.62, 2);
    expect(summary?.currentOwnPortfolio).toBe(45_280.6);
  });
});
