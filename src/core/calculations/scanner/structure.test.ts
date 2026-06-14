import { describe, expect, it } from "vitest";
import { computeStructure } from "./structure";
import { scoreIronCondor } from "./scoring";

function makeDailyCandles(count: number): Array<{
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}> {
  return Array.from({ length: count }, (_, index) => ({
    date: `2024-03-${String((index % 28) + 1).padStart(2, "0")}`,
    open: 100,
    high: index === 35 ? 130 : 105,
    low: index === 30 ? 70 : 95,
    close: 100,
  }));
}

function makeWeeklyCandles(count: number): Array<{
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}> {
  return Array.from({ length: count }, (_, index) => ({
    date: `2024-01-${String((index + 1) * 7).padStart(2, "0")}`,
    open: 100,
    high: index === 15 ? 140 : 110,
    low: index === 10 ? 60 : 90,
    close: 100,
  }));
}

describe("computeStructure", () => {
  it("computes weighted primary support and resistance", () => {
    const structure = computeStructure(makeDailyCandles(60), makeWeeklyCandles(30), 5);
    expect(structure.primarySupport).not.toBeNull();
    expect(structure.primaryResistance).not.toBeNull();
    expect(structure.midPrice).not.toBeNull();
  });
});

describe("scoreIronCondor", () => {
  it("passes when average price is within 1 ATR of mid price", () => {
    const result = scoreIronCondor({
      so: 50,
      trend: "Neutral",
      avgPrice: 100,
      midPrice: 102,
      atr14: 5,
      icMidZone: { low: 97, high: 107 },
      rangeWidth: 10,
    });

    expect(result.eligible).toBe(true);
    expect(result.checklist.every((item) => item.passed)).toBe(true);
  });
});
