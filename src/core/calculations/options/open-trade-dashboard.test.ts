import { describe, expect, it } from "vitest";
import type { OptionsTrade } from "@/core/domain/types/options";
import {
  calculateDashboardBreakevenDistancePct,
  deriveBreakevenDistanceStatus,
  deriveDashboardDteStatus,
  deriveTradeHealth,
  buildDeltaHealth,
  buildTrendHealth,
  calculateUnrealizedPlPercent,
} from "./open-trade-dashboard";

describe("open-trade-dashboard", () => {
  describe("deriveDashboardDteStatus", () => {
    it("returns green when DTE > 14", () => {
      expect(deriveDashboardDteStatus(15)).toBe("green");
      expect(deriveDashboardDteStatus(30)).toBe("green");
    });

    it("returns yellow when DTE is 8 to 14", () => {
      expect(deriveDashboardDteStatus(8)).toBe("yellow");
      expect(deriveDashboardDteStatus(14)).toBe("yellow");
    });

    it("returns red when DTE <= 7", () => {
      expect(deriveDashboardDteStatus(7)).toBe("red");
      expect(deriveDashboardDteStatus(0)).toBe("red");
    });
  });

  describe("calculateDashboardBreakevenDistancePct", () => {
    it("computes (current - breakeven) / breakeven × 100", () => {
      expect(calculateDashboardBreakevenDistancePct(105, 100)).toBeCloseTo(5);
      expect(calculateDashboardBreakevenDistancePct(97.5, 100)).toBeCloseTo(-2.5);
    });
  });

  describe("deriveBreakevenDistanceStatus", () => {
    it("maps thresholds correctly", () => {
      expect(deriveBreakevenDistanceStatus(6)).toBe("green");
      expect(deriveBreakevenDistanceStatus(2)).toBe("yellow");
      expect(deriveBreakevenDistanceStatus(-1)).toBe("orange");
      expect(deriveBreakevenDistanceStatus(-3)).toBe("red");
    });
  });

  describe("deriveTradeHealth", () => {
    it("returns HEALTHY when DTE > 14 and distance > 0", () => {
      expect(deriveTradeHealth(20, 3)).toBe("HEALTHY");
    });

    it("returns THREATENED when DTE <= 7", () => {
      expect(deriveTradeHealth(5, 10)).toBe("THREATENED");
    });

    it("returns THREATENED when distance below -2.5%", () => {
      expect(deriveTradeHealth(20, -3)).toBe("THREATENED");
    });

    it("returns REVIEW when DTE 8-14", () => {
      expect(deriveTradeHealth(10, 3)).toBe("REVIEW");
    });

    it("returns REVIEW when distance between 0 and -2.5%", () => {
      expect(deriveTradeHealth(20, -1)).toBe("REVIEW");
    });
  });

  describe("buildDeltaHealth", () => {
    it("derives put side risk direction for bull put", () => {
      const health = buildDeltaHealth({
        strategy: "bullPut",
        openingShortPutDelta: -0.2,
        currentShortPutDelta: -0.35,
      } as Pick<
        OptionsTrade,
        "strategy" | "openingShortPutDelta" | "currentShortPutDelta"
      >);
      expect(health?.putSide?.deltaChange).toBeCloseTo(-0.15);
      expect(health?.putSide?.riskDirection).toBe("increasing");
    });

    it("derives call side risk direction for bear call", () => {
      const health = buildDeltaHealth({
        strategy: "bearCall",
        openingShortCallDelta: 0.2,
        currentShortCallDelta: 0.35,
      } as Pick<
        OptionsTrade,
        "strategy" | "openingShortCallDelta" | "currentShortCallDelta"
      >);
      expect(health?.callSide?.riskDirection).toBe("increasing");
    });

    it("shows both sides for iron condor", () => {
      const health = buildDeltaHealth({
        strategy: "ironCondor",
        openingPutSideDelta: -0.15,
        currentPutSideDelta: -0.1,
        openingCallSideDelta: 0.15,
        currentCallSideDelta: 0.2,
      } as Pick<
        OptionsTrade,
        | "strategy"
        | "openingPutSideDelta"
        | "currentPutSideDelta"
        | "openingCallSideDelta"
        | "currentCallSideDelta"
      >);
      expect(health?.putSide?.riskDirection).toBe("decreasing");
      expect(health?.callSide?.riskDirection).toBe("increasing");
    });
  });

  describe("buildTrendHealth", () => {
    it("detects rising EMA20 and widening gap", () => {
      const trend = buildTrendHealth({
        ema20: 110,
        ema20Prev: 105,
        sma50: 108,
        sma50Prev: 106,
        sma200: 100,
        sma200Prev: 99,
      } as never);
      expect(trend?.shortTrend?.label).toBe("Rising EMA20");
      expect(trend?.longTrend?.label).toBe("Gap Widening");
    });
  });

  describe("calculateUnrealizedPlPercent", () => {
    it("returns percent of max risk", () => {
      expect(calculateUnrealizedPlPercent(50, 500)).toBe(10);
      expect(calculateUnrealizedPlPercent(null, 500)).toBeNull();
    });
  });
});
