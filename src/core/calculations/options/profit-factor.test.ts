import { describe, expect, it } from "vitest";
import {
  calculateProfitFactorMetrics,
  profitFactorColorClass,
} from "./profit-factor";

describe("calculateProfitFactorMetrics", () => {
  it("computes profit factor from gross profit and gross loss", () => {
    const result = calculateProfitFactorMetrics(500, 250, 5);
    expect(result.label).toBe("2.00");
    expect(result.value).toBe(2);
    expect(result.kind).toBe("value");
    expect(result.grossProfitUsd).toBe(500);
    expect(result.grossLossUsd).toBe(250);
  });

  it("returns infinity when there are wins but no losses", () => {
    const result = calculateProfitFactorMetrics(500, 0, 3);
    expect(result.label).toBe("∞");
    expect(result.value).toBeNull();
    expect(result.kind).toBe("infinity");
  });

  it("returns zero when there are no winning trades", () => {
    const result = calculateProfitFactorMetrics(0, 250, 2);
    expect(result.label).toBe("0.00");
    expect(result.value).toBe(0);
    expect(result.kind).toBe("zero");
  });

  it("returns dash when there are no closed trades", () => {
    const result = calculateProfitFactorMetrics(0, 0, 0);
    expect(result.label).toBe("—");
    expect(result.kind).toBe("none");
  });
});

describe("profitFactorColorClass", () => {
  it("maps value ranges to color classes", () => {
    expect(profitFactorColorClass("value", 0.5)).toContain("red");
    expect(profitFactorColorClass("value", 1.2)).toContain("amber");
    expect(profitFactorColorClass("value", 1.75)).toContain("emerald-400");
    expect(profitFactorColorClass("value", 2.5)).toContain("emerald-300");
  });

  it("maps edge cases", () => {
    expect(profitFactorColorClass("none", null)).toContain("slate");
    expect(profitFactorColorClass("infinity", null)).toContain("emerald-300");
    expect(profitFactorColorClass("zero", 0)).toContain("red");
  });
});
