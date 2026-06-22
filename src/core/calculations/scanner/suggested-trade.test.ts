import { describe, expect, it } from "vitest";
import {
  buildSuggestedTrade,
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
  it("rounds sell put from weighted support × 0.75", () => {
    expect(calculateSellPutStrikes(100, 15)).toEqual({
      sellPut: 75,
      buyPut: 60,
    });
  });

  it("rounds sell call from weighted resistance × 1.25", () => {
    expect(calculateSellCallStrikes(100, 15)).toEqual({
      sellCall: 125,
      buyCall: 140,
    });
  });

  it("formats iron condor as buy/sell put + sell/buy call", () => {
    expect(formatIronCondorTradeDisplay(60, 75, 125, 140)).toBe(
      "60/75 + 125/140"
    );
  });
});

describe("buildSuggestedTrade", () => {
  it("builds sell put trade from price and support", () => {
    const result = buildSuggestedTrade({
      strategy: "bullPut",
      currentPrice: 220,
      weightedSupport: 200,
      weightedResistance: 250,
    });

    expect(result.width).toBe(10);
    expect(result.targetPremium).toBe(2.5);
    expect(result.maxRiskUsd).toBe(1000);
    expect(result.tradeDisplay).toBe("150 / 140");
  });

  it("builds iron condor trade with both structure levels", () => {
    const result = buildSuggestedTrade({
      strategy: "ironCondor",
      currentPrice: 280,
      weightedSupport: 200,
      weightedResistance: 320,
    });

    expect(result.width).toBe(15);
    expect(result.targetPremium).toBe(3.75);
    expect(result.maxRiskUsd).toBe(1500);
    expect(result.tradeDisplay).toBe("135/150 + 400/415");
  });

  it("shows dashes for trade when structure is missing", () => {
    const result = buildSuggestedTrade({
      strategy: "bullPut",
      currentPrice: 95,
      weightedSupport: null,
      weightedResistance: null,
    });

    expect(result.width).toBe(5);
    expect(result.tradeDisplay).toBe("—");
  });
});
