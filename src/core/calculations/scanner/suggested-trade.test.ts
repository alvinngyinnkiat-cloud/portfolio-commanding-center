import { describe, expect, it } from "vitest";
import {
  buildSuggestedTrade,
  buildSuggestedTradeFromResult,
  calculateIronCondorStrikes,
  calculateSellCallStrikes,
  calculateSellPutStrikes,
  calculateSuggestedMaxRisk,
  calculateTargetPremium,
  determineSpreadWidth,
  formatIronCondorTradeDisplay,
} from "./suggested-trade";

describe("determineSpreadWidth", () => {
  it("uses width 5 below 100", () => {
    expect(determineSpreadWidth(95)).toBe(5);
  });

  it("uses width 10 from 100 through 250", () => {
    expect(determineSpreadWidth(100)).toBe(10);
    expect(determineSpreadWidth(220)).toBe(10);
    expect(determineSpreadWidth(250)).toBe(10);
  });

  it("uses width 15 above 250 through 500", () => {
    expect(determineSpreadWidth(280)).toBe(15);
    expect(determineSpreadWidth(323)).toBe(15);
    expect(determineSpreadWidth(370)).toBe(15);
    expect(determineSpreadWidth(500)).toBe(15);
  });

  it("uses width 25 above 500", () => {
    expect(determineSpreadWidth(580)).toBe(25);
  });
});

describe("target premium and max risk", () => {
  it("computes premium as width × 0.25", () => {
    expect(calculateTargetPremium(5)).toBe(1.25);
    expect(calculateTargetPremium(10)).toBe(2.5);
    expect(calculateTargetPremium(15)).toBe(3.75);
    expect(calculateTargetPremium(25)).toBe(6.25);
  });

  it("computes max risk as width × 100", () => {
    expect(calculateSuggestedMaxRisk(5)).toBe(500);
    expect(calculateSuggestedMaxRisk(10)).toBe(1000);
    expect(calculateSuggestedMaxRisk(15)).toBe(1500);
    expect(calculateSuggestedMaxRisk(25)).toBe(2500);
  });
});

describe("strike calculations", () => {
  it("rounds short put from weighted support - 2.5 × ATR14", () => {
    expect(calculateSellPutStrikes(100, 10, 15)).toEqual({
      sellPut: 75,
      buyPut: 60,
    });
  });

  it("rounds short call from weighted resistance + 2.5 × ATR14", () => {
    expect(calculateSellCallStrikes(100, 10, 15)).toEqual({
      sellCall: 125,
      buyCall: 140,
    });
  });

  it("formats iron condor as buy/sell put + sell/buy call", () => {
    expect(formatIronCondorTradeDisplay(60, 75, 125, 140)).toBe(
      "60/75 + 125/140"
    );
  });

  it("uses adjusted mid zone bounds for iron condor strikes", () => {
    expect(calculateIronCondorStrikes(317.16, 331.19, 7, 15)).toEqual({
      sellPut: 300,
      buyPut: 285,
      sellCall: 349,
      buyCall: 364,
    });
    expect(
      formatIronCondorTradeDisplay(285, 300, 349, 364)
    ).toBe("285/300 + 349/364");
  });
});

describe("buildSuggestedTrade", () => {
  it("builds sell put trade from price, support, and ATR14", () => {
    const result = buildSuggestedTrade({
      strategy: "bullPut",
      currentPrice: 220,
      weightedSupport: 200,
      weightedResistance: 250,
      adjustedMidZone: null,
      atr14: 20,
    });

    expect(result.width).toBe(10);
    expect(result.targetPremium).toBe(2.5);
    expect(result.maxRiskUsd).toBe(1000);
    expect(result.tradeDisplay).toBe("150 / 140");
  });

  it("builds iron condor trade from adjusted mid zone and ATR14", () => {
    const result = buildSuggestedTrade({
      strategy: "ironCondor",
      currentPrice: 280,
      weightedSupport: 200,
      weightedResistance: 320,
      adjustedMidZone: { low: 317.16, high: 331.19 },
      atr14: 7,
    });

    expect(result.width).toBe(15);
    expect(result.targetPremium).toBe(3.75);
    expect(result.maxRiskUsd).toBe(1500);
    expect(result.tradeDisplay).toBe("285/300 + 349/364");
  });

  it("shows dashes for trade when structure is missing", () => {
    const result = buildSuggestedTrade({
      strategy: "bullPut",
      currentPrice: 95,
      weightedSupport: null,
      weightedResistance: null,
      adjustedMidZone: null,
      atr14: 5,
    });

    expect(result.width).toBe(5);
    expect(result.tradeDisplay).toBe("—");
  });

  it("shows dashes for trade when ATR14 is missing", () => {
    const result = buildSuggestedTrade({
      strategy: "bullPut",
      currentPrice: 220,
      weightedSupport: 200,
      weightedResistance: 250,
      adjustedMidZone: null,
      atr14: null,
    });

    expect(result.width).toBe(10);
    expect(result.tradeDisplay).toBe("—");
  });

  it("derives adjusted mid zone from scan result for iron condor", () => {
    const result = buildSuggestedTradeFromResult(
      {
        ticker: "V",
        currentPrice: null,
        indicators: { avgPrice: 280, atr14: 7 },
        structure: {
          icMidZone: { low: 317.16, high: 331.19 },
        },
      } as never,
      "ironCondor"
    );

    expect(result.width).toBe(15);
    expect(result.tradeDisplay).toBe("285/300 + 349/364");
    expect(result.targetPremium).toBe(3.75);
    expect(result.maxRiskUsd).toBe(1500);
  });
});
