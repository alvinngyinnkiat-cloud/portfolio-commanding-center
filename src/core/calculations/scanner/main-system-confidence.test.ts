import { describe, expect, it } from "vitest";
import { evaluateMainSystemDisplay } from "./main-system-display";
import { scoreBearCall, scoreBullPut, scoreIronCondor } from "./scoring";

describe("Main System structure confidence — Module 4.5 QA", () => {
  const sellPutRange = { low: 293.89, high: 303.89 };
  const sellCallRange = { low: 344.46, high: 354.46 };
  const icMidZone = { low: 314.18, high: 334.18 };

  function evaluateSellPut(marketStructure: "Bullish" | "Neutral" | "Bearish") {
    const bullPut = scoreBullPut({
      soStatus: "Rolling Up",
      marketStructure,
      momentum: "Above EMA",
      avgPrice: 298.5,
      avgPricePrev: 295.0,
      primarySupport: 293.89,
      atr14: 10,
      sellPutRange,
    });

    return evaluateMainSystemDisplay({
      bullPut,
      bearCall: scoreBearCall({
        soStatus: "Rolling Down",
        marketStructure,
        momentum: "Below EMA",
        avgPrice: 350,
        avgPricePrev: 355,
        primaryResistance: 354.46,
        atr14: 10,
        sellCallRange,
      }),
      ironCondor: scoreIronCondor({
        so: 52,
        marketStructure,
        momentum: "At EMA",
        soStatus: "Strong",
        avgPrice: 322.86,
        avgPricePrev: 320,
        midPrice: 324.18,
        atr14: 10,
        icMidZone,
        rangeWidth: 60,
      }),
      marketStructure,
      momentum: "Above EMA",
      so: 18.5,
      soStatus: "Rolling Up",
      avgPrice: 298.5,
      avgPricePrev: 295,
      midPrice: 324.18,
      atr14: 10,
      icMidZone,
    });
  }

  function evaluateSellCall(marketStructure: "Bullish" | "Neutral" | "Bearish") {
    const bearCall = scoreBearCall({
      soStatus: "Rolling Down",
      marketStructure,
      momentum: "Below EMA",
      avgPrice: 350,
      avgPricePrev: 355,
      primaryResistance: 354.46,
      atr14: 10,
      sellCallRange,
    });

    return evaluateMainSystemDisplay({
      bullPut: scoreBullPut({
        soStatus: "Rolling Up",
        marketStructure,
        momentum: "Above EMA",
        avgPrice: 350,
        avgPricePrev: 355,
        primarySupport: 293.89,
        atr14: 10,
        sellPutRange,
      }),
      bearCall,
      ironCondor: scoreIronCondor({
        so: 52,
        marketStructure,
        momentum: "At EMA",
        soStatus: "Strong",
        avgPrice: 322.86,
        avgPricePrev: 320,
        midPrice: 324.18,
        atr14: 10,
        icMidZone,
        rangeWidth: 60,
      }),
      marketStructure,
      momentum: "Below EMA",
      so: 82,
      soStatus: "Rolling Down",
      avgPrice: 350,
      avgPricePrev: 355,
      midPrice: 324.18,
      atr14: 10,
      icMidZone,
    });
  }

  it("Test A: SELL PUT with Bullish structure → HIGH confidence", () => {
    const result = evaluateSellPut("Bullish");
    expect(result.output).toBe("SELL PUT");
    expect(result.confidence).toBe("HIGH");
    expect(result.structureWarning).toBeNull();
  });

  it("Test B: SELL PUT with Neutral structure → MEDIUM confidence", () => {
    const result = evaluateSellPut("Neutral");
    expect(result.output).toBe("SELL PUT");
    expect(result.confidence).toBe("MEDIUM");
  });

  it("Test C: SELL PUT with Bearish structure → LOW / COUNTER-STRUCTURE", () => {
    const result = evaluateSellPut("Bearish");
    expect(result.output).toBe("SELL PUT");
    expect(result.confidence).toBe("LOW / COUNTER-STRUCTURE");
    expect(result.structureWarning).toContain("Bearish Structure");
  });

  it("Test D: SELL CALL with Bearish structure → HIGH confidence", () => {
    const result = evaluateSellCall("Bearish");
    expect(result.output).toBe("SELL CALL");
    expect(result.confidence).toBe("HIGH");
  });

  it("Test E: SELL CALL with Bullish structure → LOW / COUNTER-STRUCTURE", () => {
    const result = evaluateSellCall("Bullish");
    expect(result.output).toBe("SELL CALL");
    expect(result.confidence).toBe("LOW / COUNTER-STRUCTURE");
    expect(result.structureWarning).toContain("Bullish Structure");
  });

  it("Test F: IRON CONDOR with Neutral structure and mid-range SO", () => {
    const result = evaluateMainSystemDisplay({
      bullPut: scoreBullPut({
        soStatus: "Strong",
        marketStructure: "Neutral",
        momentum: "At EMA",
        avgPrice: 322.86,
        avgPricePrev: 320,
        primarySupport: 293.89,
        atr14: 10,
        sellPutRange,
      }),
      bearCall: scoreBearCall({
        soStatus: "Strong",
        marketStructure: "Neutral",
        momentum: "At EMA",
        avgPrice: 322.86,
        avgPricePrev: 320,
        primaryResistance: 354.46,
        atr14: 10,
        sellCallRange,
      }),
      ironCondor: scoreIronCondor({
        so: 52,
        marketStructure: "Neutral",
        momentum: "At EMA",
        soStatus: "Strong",
        avgPrice: 322.86,
        avgPricePrev: 320,
        midPrice: 324.18,
        atr14: 10,
        icMidZone,
        rangeWidth: 60,
      }),
      marketStructure: "Neutral",
      momentum: "At EMA",
      so: 52,
      soStatus: "Strong",
      avgPrice: 322.86,
      avgPricePrev: 320,
      midPrice: 324.18,
      atr14: 10,
      icMidZone,
    });

    expect(result.output).toBe("IRON CONDOR");
    expect(result.confidence).toBeNull();
  });
});
