import { describe, expect, it } from "vitest";
import {
  calculateAggregateReturnPercent,
  calculateTradeReturnPercent,
} from "./return-percent";
import { buildTradeTypePerformanceDetail } from "./summary";
import type { OptionsTrade } from "@/core/domain/types/options";

describe("return percent calculations", () => {
  it("per-trade return = realized ÷ max risk × 100", () => {
    expect(calculateTradeReturnPercent(80, 400)).toBe(20);
    expect(calculateTradeReturnPercent(-61.2, 400)).toBeCloseTo(-15.3, 1);
  });

  it("aggregate return sums realized and max risk across trades", () => {
    expect(calculateAggregateReturnPercent(250, 2000)).toBe(12.5);
  });
});

describe("buildTradeTypePerformanceDetail", () => {
  it("computes personal return from closed personal trades only", () => {
    const trades: OptionsTrade[] = [
      {
        id: "1",
        status: "closed",
        tradeType: "personal",
        realizedPlUsd: 80,
        maxRiskUsd: 400,
        openDate: "2025-01-01",
        closeDate: "2025-01-10",
      } as OptionsTrade,
      {
        id: "2",
        status: "closed",
        tradeType: "shared",
        realizedPlUsd: 500,
        maxRiskUsd: 1000,
        openDate: "2025-01-01",
        closeDate: "2025-01-10",
      } as OptionsTrade,
    ];

    const personal = buildTradeTypePerformanceDetail(trades, "personal");
    expect(personal.closedCount).toBe(1);
    expect(personal.totalRealizedPlUsd).toBe(80);
    expect(personal.returnPercent).toBe(20);

    const shared = buildTradeTypePerformanceDetail(trades, "shared");
    expect(shared.closedCount).toBe(1);
    expect(shared.returnPercent).toBe(50);
  });
});
