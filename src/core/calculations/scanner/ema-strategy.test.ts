import { describe, expect, it } from "vitest";
import {
  deriveEmaConfidence,
  deriveSoStatus,
  emaDiffRulePassesCall,
  emaDiffRulePassesPut,
  evaluateEmaStrategy,
} from "./ema-strategy";
import { buildEmaSuggestedTrade } from "./ema-suggested-trade";

describe("deriveSoStatus", () => {
  it("returns Rolling Up when previous SO < 25 and current SO rises", () => {
    expect(deriveSoStatus(30, 20)).toBe("Rolling Up");
    expect(deriveSoStatus(24.5, 24)).toBe("Rolling Up");
  });

  it("returns Rolling Down when previous SO > 75 and current SO falls", () => {
    expect(deriveSoStatus(70, 80)).toBe("Rolling Down");
    expect(deriveSoStatus(75.5, 76)).toBe("Rolling Down");
  });

  it("returns Strong otherwise", () => {
    expect(deriveSoStatus(50, 45)).toBe("Strong");
    expect(deriveSoStatus(null, 50)).toBe("Strong");
  });
});

describe("emaDiffRulePassesPut", () => {
  it("passes Fresh Reversal Zone 0% to +2.5%", () => {
    expect(emaDiffRulePassesPut(0)).toBe(true);
    expect(emaDiffRulePassesPut(1.8)).toBe(true);
    expect(emaDiffRulePassesPut(2.5)).toBe(true);
  });

  it("passes Extreme Reversal Zone below -7.5%", () => {
    expect(emaDiffRulePassesPut(-8)).toBe(true);
  });

  it("fails mid-range values", () => {
    expect(emaDiffRulePassesPut(5)).toBe(false);
    expect(emaDiffRulePassesPut(-5)).toBe(false);
  });
});

describe("emaDiffRulePassesCall", () => {
  it("passes Fresh Reversal Zone 0% to -2.5%", () => {
    expect(emaDiffRulePassesCall(-1.5)).toBe(true);
    expect(emaDiffRulePassesCall(-2.5)).toBe(true);
  });

  it("passes Extreme Reversal Zone above +7.5%", () => {
    expect(emaDiffRulePassesCall(8)).toBe(true);
  });
});

describe("deriveEmaConfidence", () => {
  it("returns High confidence when SELL PUT is above SMA200", () => {
    const result = deriveEmaConfidence("SELL PUT", 102, 95);
    expect(result.confidence).toBe("High");
    expect(result.contextNote).toMatch(/long-term trend support/);
  });

  it("returns Medium confidence when SELL PUT is below SMA200", () => {
    const result = deriveEmaConfidence("SELL PUT", 95, 102);
    expect(result.confidence).toBe("Medium");
    expect(result.contextNote).toMatch(/counter-trend/);
  });

  it("returns High confidence when SELL CALL is below SMA200", () => {
    const result = deriveEmaConfidence("SELL CALL", 95, 102);
    expect(result.confidence).toBe("High");
    expect(result.contextNote).toMatch(/long-term trend support/);
  });

  it("returns Medium confidence when SELL CALL is above SMA200", () => {
    const result = deriveEmaConfidence("SELL CALL", 102, 95);
    expect(result.confidence).toBe("Medium");
    expect(result.contextNote).toMatch(/counter-trend/);
  });
});

describe("evaluateEmaStrategy — Module 4.3 QA", () => {
  const baseInput = {
    primarySupport: 80,
    primaryResistance: 120,
    atr14: 5,
    marketStructure: "Bullish" as const,
  };

  it("Case A: SELL PUT when reversal rules pass", () => {
    const result = evaluateEmaStrategy({
      ...baseInput,
      soStatus: "Rolling Up",
      avgPrice: 102,
      avgPricePrev: 100,
      ema20: 100,
      sma200: 95,
      emaDiffPct: 1.8,
    });

    expect(result.output).toBe("SELL PUT");
    expect(result.checklist.map((item) => item.label)).toEqual([
      "Primary Suggested Strategy",
      "Average Price vs EMA20",
      "Current vs Previous Average Price",
      "SO Status",
      "EMA Difference",
    ]);
    expect(
      result.checklist.some((item) => item.label.includes("SMA200"))
    ).toBe(false);
    expect(result.confidence).toBe("High");
    expect(result.marketContext?.map((item) => item.label)).toEqual([
      "Average Price vs SMA200 (Information Only)",
      "Structure",
      "Trend Bias (SMA200)",
    ]);
  });

  it("Case B: SELL CALL when all reversal rules pass", () => {
    const result = evaluateEmaStrategy({
      ...baseInput,
      marketStructure: "Bearish",
      soStatus: "Rolling Down",
      avgPrice: 98,
      avgPricePrev: 100,
      ema20: 100,
      sma200: 105,
      emaDiffPct: -1.5,
    });

    expect(result.output).toBe("SELL CALL");
    expect(result.checklist[0].primaryStrategy).toBe("SELL CALL");
    expect(result.confidence).toBe("High");
  });

  it("allows SELL PUT below SMA200 when other rules pass", () => {
    const result = evaluateEmaStrategy({
      ...baseInput,
      soStatus: "Rolling Up",
      avgPrice: 102,
      avgPricePrev: 100,
      ema20: 100,
      sma200: 110,
      emaDiffPct: 1.8,
    });

    expect(result.output).toBe("SELL PUT");
    expect(result.confidence).toBe("Medium");
    expect(result.contextNote).toMatch(/below SMA200/);
  });

  it("never outputs Iron Condor", () => {
    const result = evaluateEmaStrategy({
      ...baseInput,
      soStatus: "Strong",
      avgPrice: 100,
      avgPricePrev: 99,
      ema20: 100,
      sma200: 95,
      emaDiffPct: 0.5,
      primarySupport: 95,
      primaryResistance: 105,
    });

    expect(result.output).not.toBe("IRON CONDOR");
  });

  it("does not reject SELL PUT when outside Sell Put Zone", () => {
    const result = evaluateEmaStrategy({
      ...baseInput,
      soStatus: "Rolling Up",
      avgPrice: 150,
      avgPricePrev: 148,
      ema20: 145,
      sma200: 140,
      emaDiffPct: 1.2,
      primarySupport: 100,
      primaryResistance: 200,
    });

    expect(result.output).toBe("SELL PUT");
  });
});

describe("buildEmaSuggestedTrade", () => {
  it("Case A: Short Put = EMA20 - (2.5 × ATR14)", () => {
    const trade = buildEmaSuggestedTrade({
      output: "SELL PUT",
      ema20: 100,
      atr14: 4,
      currentPrice: 102,
    });

    expect(trade.shortStrike).toBe(90);
    expect(trade.longStrike).toBe(80);
    expect(trade.width).toBe(10);
    expect(trade.estimatedPremium).toBe(2.5);
    expect(trade.tradeDisplay).toBe("90 / 80");
  });

  it("Case B: Short Call = EMA20 + (2.5 × ATR14)", () => {
    const trade = buildEmaSuggestedTrade({
      output: "SELL CALL",
      ema20: 100,
      atr14: 4,
      currentPrice: 150,
    });

    expect(trade.shortStrike).toBe(110);
    expect(trade.longStrike).toBe(120);
    expect(trade.width).toBe(10);
    expect(trade.tradeDisplay).toBe("110 / 120");
  });
});
