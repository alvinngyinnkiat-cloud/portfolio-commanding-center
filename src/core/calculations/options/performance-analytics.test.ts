import { describe, expect, it } from "vitest";
import {
  buildMonthlyPerformance,
  buildPerformanceScopeDetail,
  buildStrategyBreakdown,
  scopeTradePerformanceAmounts,
} from "./performance-analytics";
import type { OptionsTrade } from "@/core/domain/types/options";

function closedTrade(overrides: Partial<OptionsTrade>): OptionsTrade {
  return {
    id: "t1",
    status: "closed",
    tradeType: "personal",
    userSharePercent: 100,
    clientSharePercent: 0,
    strategy: "bullPut",
    underlying: "SPY",
    expirationDate: "2025-06-20",
    contracts: 1,
    openDate: "2025-01-01",
    closeDate: "2025-01-15",
    openPremiumUsd: 200,
    openFeesUsd: 0,
    maxRiskUsd: 400,
    realizedPlUsd: 80,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-15T00:00:00.000Z",
    ...overrides,
  };
}

describe("scopeTradePerformanceAmounts", () => {
  it("client scope uses client leg on shared trades only", () => {
    const shared = closedTrade({
      tradeType: "shared",
      userSharePercent: 60,
      clientSharePercent: 40,
      realizedPlUsd: 100,
      maxRiskUsd: 500,
    });

    expect(scopeTradePerformanceAmounts(shared, "client")).toEqual({
      realizedUsd: 40,
      maxRiskUsd: 200,
    });
    expect(scopeTradePerformanceAmounts(shared, "personal")).toBeNull();
  });
});

describe("buildPerformanceScopeDetail", () => {
  it("total includes all closed trades", () => {
    const trades = [
      closedTrade({ id: "1", realizedPlUsd: 80, maxRiskUsd: 400 }),
      closedTrade({
        id: "2",
        tradeType: "shared",
        userSharePercent: 50,
        clientSharePercent: 50,
        realizedPlUsd: 100,
        maxRiskUsd: 200,
      }),
    ];

    const total = buildPerformanceScopeDetail(trades, "total");
    expect(total.closedCount).toBe(2);
    expect(total.totalRealizedPlUsd).toBe(180);
    expect(total.returnPercent).toBeCloseTo(30, 4);
  });

  it("client scope aggregates client legs from shared trades", () => {
    const trades = [
      closedTrade({
        tradeType: "shared",
        userSharePercent: 60,
        clientSharePercent: 40,
        realizedPlUsd: 100,
        maxRiskUsd: 500,
      }),
    ];

    const client = buildPerformanceScopeDetail(trades, "client");
    expect(client.closedCount).toBe(1);
    expect(client.totalRealizedPlUsd).toBe(40);
    expect(client.returnPercent).toBe(20);
  });

  it("computes profit factor per scope with split legs", () => {
    const trades = [
      closedTrade({ id: "w1", realizedPlUsd: 100 }),
      closedTrade({ id: "w2", realizedPlUsd: 150 }),
      closedTrade({ id: "l1", realizedPlUsd: -100 }),
      closedTrade({
        id: "shared-win",
        tradeType: "shared",
        userSharePercent: 55,
        clientSharePercent: 45,
        realizedPlUsd: 100,
      }),
      closedTrade({
        id: "shared-loss",
        tradeType: "shared",
        userSharePercent: 55,
        clientSharePercent: 45,
        realizedPlUsd: -100,
      }),
    ];

    const total = buildPerformanceScopeDetail(trades, "total");
    expect(total.grossProfitUsd).toBe(350);
    expect(total.grossLossUsd).toBe(200);
    expect(total.profitFactorLabel).toBe("1.75");

    const personal = buildPerformanceScopeDetail(trades, "personal");
    expect(personal.grossProfitUsd).toBe(250);
    expect(personal.grossLossUsd).toBe(100);
    expect(personal.profitFactorLabel).toBe("2.50");

    const client = buildPerformanceScopeDetail(trades, "client");
    expect(client.grossProfitUsd).toBe(45);
    expect(client.grossLossUsd).toBe(45);
    expect(client.profitFactorLabel).toBe("1.00");
  });

  it("handles profit factor edge cases", () => {
    expect(buildPerformanceScopeDetail([], "total").profitFactorLabel).toBe("—");

    const allWins = buildPerformanceScopeDetail(
      [closedTrade({ realizedPlUsd: 80 }), closedTrade({ id: "2", realizedPlUsd: 50 })],
      "total"
    );
    expect(allWins.profitFactorLabel).toBe("∞");

    const allLosses = buildPerformanceScopeDetail(
      [closedTrade({ realizedPlUsd: -80 })],
      "total"
    );
    expect(allLosses.profitFactorLabel).toBe("0.00");
  });
});

describe("buildStrategyBreakdown", () => {
  it("returns all four strategies", () => {
    const rows = buildStrategyBreakdown([closedTrade({ strategy: "bullPut" })], "total");
    expect(rows).toHaveLength(4);
    expect(rows.find((r) => r.strategy === "bullPut")?.closedCount).toBe(1);
    expect(rows.find((r) => r.strategy === "bearCall")?.closedCount).toBe(0);
  });
});

describe("buildMonthlyPerformance", () => {
  it("groups scoped realized by month", () => {
    const rows = buildMonthlyPerformance(
      [
        closedTrade({ closeDate: "2025-01-10", realizedPlUsd: 50 }),
        closedTrade({ id: "2", closeDate: "2025-02-10", realizedPlUsd: 30 }),
      ],
      "total"
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].realizedPlUsd).toBe(50);
    expect(rows[1].realizedPlUsd).toBe(30);
  });
});
