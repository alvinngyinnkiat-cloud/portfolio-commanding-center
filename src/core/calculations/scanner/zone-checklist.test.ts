import { describe, expect, it } from "vitest";
import { scoreBearCall, scoreBullPut } from "./scoring";
import { evaluateMainSystemDisplay } from "./main-system-display";
import { scoreIronCondor } from "./scoring";

describe("Main System zone validation — Module 4.4 QA", () => {
  const sellPutRange = { low: 102.1, high: 128.81 };
  const sellCallRange = { low: 170, high: 200 };

  const basePutInput = {
    soStatus: "Rolling Up" as const,
    marketStructure: "Bullish" as const,
    momentum: "Above EMA" as const,
    avgPricePrev: 115,
    primarySupport: 102.1,
    atr14: 26.71,
    sellPutRange,
  };

  const baseCallInput = {
    soStatus: "Rolling Down" as const,
    marketStructure: "Bearish" as const,
    momentum: "Below EMA" as const,
    avgPricePrev: 190,
    primaryResistance: 200,
    atr14: 30,
    sellCallRange,
  };

  it("Test A: rejects SELL PUT when average price is outside Sell Put Zone", () => {
    const bullPut = scoreBullPut({
      ...basePutInput,
      avgPrice: 259.74,
    });

    expect(bullPut.eligible).toBe(false);
    expect(bullPut.checklist).toHaveLength(5);

    const zoneItem = bullPut.checklist[4];
    expect(zoneItem.label).toBe("Average Price outside Sell Put Zone");
    expect(zoneItem.passed).toBe(false);
    expect(zoneItem.detail).toBe("259.74 ∉ 102.10 → 128.81");

    const mainSystem = evaluateMainSystemDisplay({
      bullPut,
      bearCall: scoreBearCall({ ...baseCallInput, avgPrice: 259.74 }),
      ironCondor: scoreIronCondor({
        so: 50,
        marketStructure: "Neutral",
        momentum: "At EMA",
        soStatus: "Strong",
        avgPrice: 259.74,
        avgPricePrev: 255,
        midPrice: 180,
        atr14: 26.71,
        icMidZone: { low: 153.29, high: 206.71 },
        rangeWidth: 60,
      }),
      marketStructure: "Bullish",
      momentum: "Above EMA",
      so: 20,
      soStatus: "Rolling Up",
      avgPrice: 259.74,
      avgPricePrev: 115,
      midPrice: 180,
      atr14: 26.71,
      icMidZone: { low: 153.29, high: 206.71 },
    });

    expect(mainSystem.output).toBe("NO TRADE");
    expect(mainSystem.reasons).toContain("Average Price outside Sell Put Zone");
  });

  it("Test B: accepts SELL PUT when average price is inside Sell Put Zone", () => {
    const bullPut = scoreBullPut({
      ...basePutInput,
      avgPrice: 118.2,
    });

    expect(bullPut.eligible).toBe(true);

    const zoneItem = bullPut.checklist[4];
    expect(zoneItem.label).toBe("Average Price inside Sell Put Zone");
    expect(zoneItem.passed).toBe(true);
    expect(zoneItem.detail).toBe("118.20 ∈ 102.10 → 128.81");

    const mainSystem = evaluateMainSystemDisplay({
      bullPut,
      bearCall: scoreBearCall({ ...baseCallInput, avgPrice: 118.2 }),
      ironCondor: scoreIronCondor({
        so: 50,
        marketStructure: "Neutral",
        momentum: "At EMA",
        soStatus: "Strong",
        avgPrice: 118.2,
        avgPricePrev: 115,
        midPrice: 180,
        atr14: 26.71,
        icMidZone: { low: 153.29, high: 206.71 },
        rangeWidth: 60,
      }),
      marketStructure: "Bullish",
      momentum: "Above EMA",
      so: 20,
      soStatus: "Rolling Up",
      avgPrice: 118.2,
      avgPricePrev: 115,
      midPrice: 180,
      atr14: 26.71,
      icMidZone: { low: 153.29, high: 206.71 },
    });

    expect(mainSystem.output).toBe("SELL PUT");
    expect(mainSystem.reasons).toContain("Average Price inside Sell Put Zone");
  });

  it("Test C: accepts SELL CALL when average price is inside Sell Call Zone", () => {
    const bearCall = scoreBearCall({
      ...baseCallInput,
      avgPrice: 185,
    });

    expect(bearCall.eligible).toBe(true);

    const zoneItem = bearCall.checklist[4];
    expect(zoneItem.label).toBe("Average Price inside Sell Call Zone");
    expect(zoneItem.passed).toBe(true);
    expect(zoneItem.detail).toBe("185.00 ∈ 170.00 → 200.00");

    const mainSystem = evaluateMainSystemDisplay({
      bullPut: scoreBullPut({ ...basePutInput, avgPrice: 185 }),
      bearCall,
      ironCondor: scoreIronCondor({
        so: 50,
        marketStructure: "Neutral",
        momentum: "At EMA",
        soStatus: "Strong",
        avgPrice: 185,
        avgPricePrev: 190,
        midPrice: 180,
        atr14: 30,
        icMidZone: { low: 150, high: 210 },
        rangeWidth: 60,
      }),
      marketStructure: "Bearish",
      momentum: "Below EMA",
      so: 80,
      soStatus: "Rolling Down",
      avgPrice: 185,
      avgPricePrev: 190,
      midPrice: 180,
      atr14: 30,
      icMidZone: { low: 150, high: 210 },
    });

    expect(mainSystem.output).toBe("SELL CALL");
    expect(mainSystem.reasons).toContain("Average Price inside Sell Call Zone");
  });
});
