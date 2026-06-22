import { describe, expect, it } from "vitest";
import type { OptionsTrade } from "@/core/domain/types/options";
import {
  buildIronCondorBreakevenDisplay,
  calculateBearCallBreakevenDistancePct,
  calculateBullPutBreakevenDistancePct,
  calculateDashboardBreakevenDistancePct,
  calculateIronCondorCallSideDistancePct,
  calculateIronCondorPutSideDistancePct,
  deriveBreakevenDistanceStatus,
  deriveDashboardDteStatus,
  deriveTradeHealth,
  buildDeltaHealth,
  buildTrendHealth,
  calculateUnrealizedPlPercent,
  calculateRiskUsedPercent,
  classifyOpenTradeHealthCategory,
  summarizeOpenTradeHealthCategories,
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

  describe("bull put breakeven distance", () => {
    it("is positive when price is above breakeven", () => {
      expect(calculateBullPutBreakevenDistancePct(105, 100)).toBeCloseTo(5);
    });

    it("is negative when price is below breakeven", () => {
      expect(calculateBullPutBreakevenDistancePct(97.5, 100)).toBeCloseTo(-2.5);
    });
  });

  describe("bear call breakeven distance", () => {
    it("is positive when price is below breakeven", () => {
      expect(calculateBearCallBreakevenDistancePct(580, 605)).toBeCloseTo(4.13, 1);
    });

    it("is negative when price is above breakeven", () => {
      expect(calculateBearCallBreakevenDistancePct(620, 605)).toBeCloseTo(-2.48, 1);
    });
  });

  describe("iron condor breakeven distances", () => {
    it("computes put and call side distances from spec example", () => {
      const lower = 572.72;
      const upper = 697.28;
      const current = 577.19;

      expect(calculateIronCondorPutSideDistancePct(current, lower)).toBeCloseTo(
        0.78,
        1
      );
      expect(calculateIronCondorCallSideDistancePct(current, upper)).toBeCloseTo(
        17.22,
        1
      );
    });

    it("identifies closest side as put when put distance is smaller", () => {
      const display = buildIronCondorBreakevenDisplay(577.19, 572.72, 697.28);
      expect(display.closestSide).toBe("put");
      expect(display.putSideDistancePct).toBeLessThan(
        display.callSideDistancePct
      );
    });
  });

  describe("calculateDashboardBreakevenDistancePct", () => {
    it("matches bull put formula", () => {
      expect(calculateDashboardBreakevenDistancePct(105, 100)).toBeCloseTo(5);
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

    it("uses closest iron condor side distance for trade health", () => {
      expect(deriveTradeHealth(20, 0.78)).toBe("HEALTHY");
      expect(deriveTradeHealth(10, 0.78)).toBe("REVIEW");
      expect(deriveBreakevenDistanceStatus(0.78)).toBe("yellow");
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

  describe("calculateRiskUsedPercent", () => {
    it("returns abs P/L over max risk as percent", () => {
      expect(calculateRiskUsedPercent(-280.6, 798.08)).toBeCloseTo(35.2, 0);
      expect(calculateRiskUsedPercent(105.25, 201.5)).toBeCloseTo(52.2, 0);
      expect(calculateRiskUsedPercent(null, 500)).toBeNull();
    });
  });

  describe("classifyOpenTradeHealthCategory", () => {
    it("classifies threatened when DTE <= 7 regardless of breakeven", () => {
      expect(classifyOpenTradeHealthCategory(5, 2)).toBe("threatened");
      expect(classifyOpenTradeHealthCategory(3, -5)).toBe("threatened");
      expect(classifyOpenTradeHealthCategory(7, 10)).toBe("threatened");
    });

    it("classifies review when DTE 8-14 and breakeven <= -2.5%", () => {
      expect(classifyOpenTradeHealthCategory(12, -3)).toBe("review");
      expect(classifyOpenTradeHealthCategory(10, -4)).toBe("review");
      expect(classifyOpenTradeHealthCategory(8, -2.5)).toBe("review");
    });

    it("classifies healthy for remaining cases", () => {
      expect(classifyOpenTradeHealthCategory(10, -1)).toBe("healthy");
      expect(classifyOpenTradeHealthCategory(20, -10)).toBe("healthy");
      expect(classifyOpenTradeHealthCategory(45, 5)).toBe("healthy");
      expect(classifyOpenTradeHealthCategory(12, null)).toBe("healthy");
    });

    it("sums to total open trades", () => {
      const cases = [
        [5, 2],
        [3, -5],
        [12, -3],
        [10, -4],
        [10, -1],
        [20, -10],
        [45, 5],
      ] as const;
      let threatened = 0;
      let review = 0;
      let healthy = 0;
      for (const [dte, be] of cases) {
        const cat = classifyOpenTradeHealthCategory(dte, be);
        if (cat === "threatened") threatened += 1;
        else if (cat === "review") review += 1;
        else healthy += 1;
      }
      expect(threatened + review + healthy).toBe(cases.length);
    });
  });
});
