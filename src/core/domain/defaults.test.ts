import { describe, expect, it } from "vitest";
import type { ContributionTransaction, DailySnapshot, Goal } from "./types";
import {
  DEFAULT_CONTRIBUTIONS,
  DEFAULT_DASHBOARD_SETTINGS,
  DEFAULT_GOALS,
  DEFAULT_MANUAL_VALUES,
  DEFAULT_SNAPSHOTS,
  generateDefaultContributions,
  generateDefaultSnapshots,
  isDemoContributions,
  isDemoGoals,
  isDemoManualValues,
  isDemoSnapshots,
} from "./defaults";

describe("production defaults", () => {
  it("starts with zero manual portfolio values", () => {
    expect(DEFAULT_MANUAL_VALUES).toEqual({
      usStocksEtfUsd: 0,
      sgStocksSgd: 0,
      cryptoSgd: 0,
      clientPortfolioUsd: 0,
    });
    expect(DEFAULT_DASHBOARD_SETTINGS.manualValues).toEqual(DEFAULT_MANUAL_VALUES);
  });

  it("starts with empty contributions, goals, and snapshots", () => {
    expect(DEFAULT_CONTRIBUTIONS).toEqual([]);
    expect(DEFAULT_GOALS).toEqual([]);
    expect(DEFAULT_SNAPSHOTS).toEqual([]);
    expect(generateDefaultContributions()).toEqual([]);
    expect(generateDefaultSnapshots()).toEqual([]);
  });

  it("detects legacy demo seed fingerprints", () => {
    const demoContributions: ContributionTransaction[] = [
      {
        id: "contrib-1",
        date: "2026-01-01",
        type: "deposit",
        category: "stock",
        amountSgd: 10_000,
      },
      {
        id: "contrib-2",
        date: "2026-01-02",
        type: "deposit",
        category: "crypto",
        amountSgd: 5_000,
      },
      {
        id: "contrib-3",
        date: "2026-01-03",
        type: "deposit",
        category: "stock",
        amountSgd: 8_000,
      },
    ];
    const demoGoals: Goal[] = [
      {
        id: "goal-1",
        name: "First $100K",
        targetAmountSgd: 100_000,
        active: true,
      },
      {
        id: "goal-2",
        name: "Retirement Fund",
        targetAmountSgd: 500_000,
        active: true,
      },
    ];
    const demoSnapshots: DailySnapshot[] = Array.from({ length: 12 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, "0")}`,
      createdAt: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
      snapshotType: "manual" as const,
      ownPortfolio: 95_000,
      totalPortfolio: 115_000,
      clientPortfolio: 20_000,
      totalContribution: 20_000,
      usStocksEtfSgd: 50_000,
      sgStocksSgd: 30_000,
      cryptoSgd: 15_000,
      personalCashSgd: 0,
      cashSgd: 0,
    }));

    expect(isDemoContributions(demoContributions)).toBe(true);
    expect(isDemoGoals(demoGoals)).toBe(true);
    expect(isDemoSnapshots(demoSnapshots)).toBe(true);
    expect(
      isDemoManualValues({
        usStocksEtfUsd: 50_000,
        sgStocksSgd: 30_000,
        cryptoSgd: 15_000,
        clientPortfolioUsd: 15_000,
      })
    ).toBe(true);
  });
});
