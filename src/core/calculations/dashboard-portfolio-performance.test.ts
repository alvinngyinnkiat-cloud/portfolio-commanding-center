import { describe, expect, it, vi, afterEach } from "vitest";

import {
  calculatePortfolioPerformance,
  PORTFOLIO_PERFORMANCE_ROUNDING_TOLERANCE,
} from "./dashboard-portfolio-performance";

function performanceSource(
  overrides: Partial<{
    totalPortfolio: number;
    clientPortfolio: number;
    totalContributionSgd: number;
    clientContributionSgd: number;
  }> = {}
) {
  const totalContributionSgd = overrides.totalContributionSgd ?? 35_000;
  const stockContribution = totalContributionSgd - 5_000;
  const cryptoContribution = 5_000;

  return {
    metrics: {
      totalPortfolio: overrides.totalPortfolio ?? 50_000,
      clientPortfolio: overrides.clientPortfolio ?? 10_000,
    },
    contributions: [
      {
        id: "stock",
        date: "2024-01-01",
        type: "deposit" as const,
        category: "stock" as const,
        amountSgd: stockContribution,
      },
      {
        id: "crypto",
        date: "2024-02-01",
        type: "deposit" as const,
        category: "crypto" as const,
        amountSgd: cryptoContribution,
      },
    ],
    clientContributionSgd: overrides.clientContributionSgd ?? 8_000,
  };
}

describe("calculatePortfolioPerformance", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Test 1 — Own Portfolio", () => {
    const summary = calculatePortfolioPerformance(
      performanceSource({
        totalPortfolio: 50_000,
        clientPortfolio: 10_000,
        totalContributionSgd: 35_000,
        clientContributionSgd: 8_000,
      })
    );

    expect(summary).not.toBeNull();
    expect(summary!.own.portfolioValue).toBe(40_000);
    expect(summary!.own.contribution).toBe(27_000);
    expect(summary!.own.profitLoss).toBe(13_000);
    expect(summary!.own.returnPercent).toBeCloseTo(48.15, 2);
  });

  it("Test 2 — Total Portfolio", () => {
    const summary = calculatePortfolioPerformance(
      performanceSource({
        totalPortfolio: 50_000,
        clientPortfolio: 10_000,
        totalContributionSgd: 35_000,
        clientContributionSgd: 8_000,
      })
    );

    expect(summary!.total.portfolioValue).toBe(50_000);
    expect(summary!.total.contribution).toBe(35_000);
    expect(summary!.total.profitLoss).toBe(15_000);
    expect(summary!.total.returnPercent).toBeCloseTo(42.86, 2);
  });

  it("Test 3 — Client Portfolio", () => {
    const summary = calculatePortfolioPerformance(
      performanceSource({
        totalPortfolio: 50_000,
        clientPortfolio: 10_000,
        totalContributionSgd: 35_000,
        clientContributionSgd: 8_000,
      })
    );

    expect(summary!.client.portfolioValue).toBe(10_000);
    expect(summary!.client.contribution).toBe(8_000);
    expect(summary!.client.profitLoss).toBe(2_000);
    expect(summary!.client.returnPercent).toBeCloseTo(25, 2);
  });

  it("Test 4 — Zero Contribution shows null return", () => {
    const summary = calculatePortfolioPerformance({
      metrics: {
        totalPortfolio: 10_000,
        clientPortfolio: 0,
      },
      contributions: [
        {
          id: "stock",
          date: "2024-01-01",
          type: "deposit",
          category: "stock",
          amountSgd: 5_000,
        },
      ],
      clientContributionSgd: 0,
    });

    expect(summary!.client.returnPercent).toBeNull();
    expect(summary!.own.returnPercent).not.toBeNull();
  });

  it("Test 5 — Reconciliation holds within tolerance", () => {
    const summary = calculatePortfolioPerformance(
      performanceSource({
        totalPortfolio: 50_000,
        clientPortfolio: 10_000,
        totalContributionSgd: 35_000,
        clientContributionSgd: 8_000,
      })
    );

    expect(
      Math.abs(
        summary!.own.portfolioValue +
          summary!.client.portfolioValue -
          summary!.total.portfolioValue
      )
    ).toBeLessThanOrEqual(PORTFOLIO_PERFORMANCE_ROUNDING_TOLERANCE);

    expect(
      Math.abs(
        summary!.own.contribution +
          summary!.client.contribution -
          summary!.total.contribution
      )
    ).toBeLessThanOrEqual(PORTFOLIO_PERFORMANCE_ROUNDING_TOLERANCE);
  });

  it("contribution values stay fixed when portfolio values move with FX", () => {
    const contributions = [
      {
        id: "stock",
        date: "2024-01-01",
        type: "deposit" as const,
        category: "stock" as const,
        amountSgd: 30_000,
        fxRate: 1.32,
      },
      {
        id: "crypto",
        date: "2024-02-01",
        type: "deposit" as const,
        category: "crypto" as const,
        amountSgd: 5_000,
      },
    ];

    const atLowerFx = calculatePortfolioPerformance({
      metrics: { totalPortfolio: 50_000, clientPortfolio: 10_000 },
      contributions,
      clientContributionSgd: 8_000,
    });
    const atHigherFx = calculatePortfolioPerformance({
      metrics: { totalPortfolio: 52_000, clientPortfolio: 10_500 },
      contributions,
      clientContributionSgd: 8_000,
    });

    expect(atLowerFx!.total.contribution).toBe(35_000);
    expect(atHigherFx!.total.contribution).toBe(35_000);
    expect(atLowerFx!.client.contribution).toBe(8_000);
    expect(atHigherFx!.client.contribution).toBe(8_000);
    expect(atLowerFx!.own.contribution).toBe(27_000);
    expect(atHigherFx!.own.contribution).toBe(27_000);
    expect(atLowerFx!.total.portfolioValue).not.toBe(
      atHigherFx!.total.portfolioValue
    );
  });

  it("logs reconciliation warnings in development only", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    calculatePortfolioPerformance(
      performanceSource({
        totalPortfolio: 50_000,
        clientPortfolio: 10_000,
        totalContributionSgd: 35_000,
        clientContributionSgd: 8_000,
      })
    );

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("returns null when required values are not finite", () => {
    const summary = calculatePortfolioPerformance({
      metrics: {
        totalPortfolio: Number.NaN,
        clientPortfolio: 10_000,
      },
      contributions: [],
      clientContributionSgd: 8_000,
    });

    expect(summary).toBeNull();
  });
});
