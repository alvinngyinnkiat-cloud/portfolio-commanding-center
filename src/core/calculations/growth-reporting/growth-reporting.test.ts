import { describe, expect, it } from "vitest";
import type { ContributionTransaction, DailySnapshot } from "@/core/domain/types";
import type { PortfolioMetrics } from "@/core/domain/types";
import {
  buildBestWorstMonths,
  buildContributionAnalytics,
  buildGrowthSummary,
  buildMonthlyPerformanceTable,
  buildPortfolioGrowthChartData,
  buildPortfolioJourney,
  calculateGrowthDelta,
  findSnapshotAtOrBefore,
  hasSufficientSnapshotData,
  readSnapshotTotalPl,
} from "./index";

function snapshot(
  overrides: Partial<DailySnapshot> & Pick<DailySnapshot, "date">
): DailySnapshot {
  return {
    createdAt: `${overrides.date}T23:59:00.000Z`,
    snapshotType: "automatic",
    ownPortfolio: 10_000,
    totalPortfolio: 12_000,
    clientPortfolio: 2_000,
    totalContribution: 8_000,
    usStocksEtfSgd: 5_000,
    sgStocksSgd: 2_000,
    cryptoSgd: 3_000,
    personalCashSgd: 0,
    cashSgd: 0,
    ...overrides,
  };
}

function metrics(overrides: Partial<PortfolioMetrics> = {}): PortfolioMetrics {
  return {
    usStocksEtfSgd: 0,
    usStocksEtfUsd: 0,
    sgStocksSgd: 0,
    cryptoSgd: 0,
    cryptoHoldingCount: 0,
    totalCashSgd: 0,
    personalCashSgd: 0,
    clientCashSgd: 0,
    usdTradingCashUsd: 0,
    usdTradingCashSgd: 0,
    sgdTradingCashSgd: 0,
    cryptoCashSgd: 0,
    clientPortfolio: 0,
    clientPortfolioUsd: 0,
    totalPortfolio: 12_000,
    clientOwnershipPercent: 0,
    usStockContributionSgd: 0,
    sgStockContributionSgd: 0,
    totalStockContributionSgd: 0,
    totalStockValueSgd: 0,
    stockHoldingsValueSgd: 0,
    stockProfitLossSgd: 0,
    stockAvailableTradingCashSgd: 0,
    cryptoContributionSgd: 0,
    totalCryptoValueSgd: 0,
    cryptoHoldingsValueSgd: 0,
    cryptoProfitLossSgd: 0,
    cryptoAvailableTradingCashSgd: 0,
    personalCashContributionSgd: 0,
    optionsValueSgd: 0,
    totalContribution: 8_000,
    totalPortfolioValue: 10_000,
    totalPL: 2_000,
    totalPLPercent: 25,
    ownPL: 2_000,
    ownPLPercent: 25,
    ownPortfolio: 10_000,
    ...overrides,
  };
}

describe("growth reporting read-only analytics", () => {
  it("requires at least 2 snapshots", () => {
    expect(hasSufficientSnapshotData(0)).toBe(false);
    expect(hasSufficientSnapshotData(1)).toBe(false);
    expect(hasSufficientSnapshotData(2)).toBe(true);
  });

  it("calculates growth $ and % from snapshot values", () => {
    const result = calculateGrowthDelta(12_000, 10_000);
    expect(result.dollars).toBe(2_000);
    expect(result.percent).toBe(20);
    expect(result.insufficientData).toBe(false);
  });

  it("returns insufficient data when historical snapshot missing", () => {
    const result = calculateGrowthDelta(10_000, null);
    expect(result.insufficientData).toBe(true);
  });

  it("reads snapshot total P/L from stored fields only", () => {
    expect(
      readSnapshotTotalPl(
        snapshot({ date: "2026-01-01", ownPortfolio: 15_000, totalContribution: 10_000 })
      )
    ).toBe(5_000);
  });

  it("builds growth summary from dashboard metrics and snapshots", () => {
    const snapshots = [
      snapshot({ date: "2025-01-01", ownPortfolio: 8_000 }),
      snapshot({ date: "2026-06-01", ownPortfolio: 9_500 }),
    ];
    const summary = buildGrowthSummary(snapshots, metrics());

    expect(summary?.currentOwnPortfolio).toBe(10_000);
    expect(summary?.totalPL).toBe(2_000);
    expect(summary?.periodGrowth.sinceStart.dollars).toBe(2_000);
  });

  it("groups monthly performance from snapshots", () => {
    const rows = buildMonthlyPerformanceTable([
      snapshot({
        date: "2026-01-05",
        ownPortfolio: 10_000,
        totalContribution: 8_000,
      }),
      snapshot({
        date: "2026-01-20",
        ownPortfolio: 10_500,
        totalContribution: 9_000,
      }),
      snapshot({
        date: "2026-02-10",
        ownPortfolio: 10_500,
        totalContribution: 9_000,
      }),
      snapshot({
        date: "2026-02-28",
        ownPortfolio: 11_000,
        totalContribution: 9_500,
      }),
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0].monthlyGrowthDollars).toBe(500);
    expect(rows[0].monthlyContributionAdded).toBe(1_000);
    expect(rows[0].monthlyPLChange).toBe(-500);
    expect(rows[0].monthlyGrowthPercent).toBe(5);
    expect(rows[1].startingOwnPortfolio).toBe(10_500);
  });

  it("uses SGD contribution transaction amounts only", () => {
    const contributions: ContributionTransaction[] = [
      {
        id: "1",
        date: "2026-01-10",
        type: "deposit",
        category: "stock",
        amountSgd: 1_000,
      },
      {
        id: "2",
        date: "2026-01-15",
        type: "deposit",
        category: "crypto",
        amountSgd: 500,
      },
      {
        id: "3",
        date: "2026-02-01",
        type: "deposit",
        category: "stock",
        amountSgd: 1_000,
        fxRate: 1.3,
      },
    ];

    const analytics = buildContributionAnalytics(contributions);
    expect(analytics.totalContributionSgd).toBe(2_500);
    expect(analytics.stockContributionSgd).toBe(2_000);
    expect(analytics.cryptoContributionSgd).toBe(500);
    expect(analytics.monthlyBars).toHaveLength(2);
  });

  it("builds portfolio growth chart series from snapshots", () => {
    const chart = buildPortfolioGrowthChartData([
      snapshot({ date: "2026-01-01", ownPortfolio: 10_000, totalContribution: 8_000 }),
      snapshot({ date: "2026-02-01", ownPortfolio: 11_000, totalContribution: 9_000 }),
    ]);

    expect(chart).toHaveLength(2);
    expect(chart[0].totalPL).toBe(2_000);
    expect(chart[1].ownPortfolio).toBe(11_000);
  });

  it("finds snapshot at or before target date", () => {
    const snapshots = [
      snapshot({ date: "2026-01-01" }),
      snapshot({ date: "2026-03-01" }),
    ];
    expect(findSnapshotAtOrBefore(snapshots, "2026-02-15")?.date).toBe(
      "2026-01-01"
    );
  });

  it("identifies best and worst months", () => {
    const rows = buildMonthlyPerformanceTable([
      snapshot({ date: "2026-01-05", ownPortfolio: 10_000, totalContribution: 8_000 }),
      snapshot({ date: "2026-01-25", ownPortfolio: 10_800, totalContribution: 8_500 }),
      snapshot({ date: "2026-02-05", ownPortfolio: 10_500, totalContribution: 9_000 }),
      snapshot({ date: "2026-02-25", ownPortfolio: 10_200, totalContribution: 9_200 }),
    ]);
    const bestWorst = buildBestWorstMonths(rows);

    expect(bestWorst.bestByDollars?.value).toBe(800);
    expect(bestWorst.worstByDollars?.value).toBe(-300);
  });

  it("builds portfolio journey milestones", () => {
    const journey = buildPortfolioJourney(
      [snapshot({ date: "2025-06-01", ownPortfolio: 7_000 })],
      [
        {
          id: "c1",
          date: "2025-05-01",
          type: "deposit",
          category: "stock",
          amountSgd: 5_000,
        },
      ],
      metrics({ totalPortfolioValue: 10_000 })
    );

    expect(journey.firstSnapshotDate).toBe("2025-06-01");
    expect(journey.firstContributionDate).toBe("2025-05-01");
    expect(journey.totalGrowthSinceStart).toBe(3_000);
    expect(journey.totalContributionsSgd).toBe(5_000);
  });
});
