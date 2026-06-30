import { describe, expect, it } from "vitest";
import {
  buildIronCondorChecklistReasons,
  buildIronCondorReasons,
  buildNoTradeReasons,
  buildSellCallChecklistReasons,
  buildSellPutChecklistReasons,
  buildSellCallReasons,
  buildSellPutReasons,
} from "./display-reasons";
import { evaluateMainSystemDisplay } from "./main-system-display";
import { scoreBearCall, scoreBullPut, scoreIronCondor } from "./scoring";

describe("display reasons", () => {
  it("builds Sell Put checklist reasons", () => {
    const reasons = buildSellPutChecklistReasons({
      so: 18.5,
      soStatus: "Rolling Up",
      marketStructure: "Bullish",
      momentum: "Above EMA",
      avgPrice: 298.5,
      avgPricePrev: 295.0,
    });

    expect(reasons[0]).toBe("Bullish Structure = Yes");
    expect(reasons[1]).toBe("Momentum Above EMA = Yes");
    expect(reasons[2]).toContain("Current Average Price > Previous Average Price = Yes");
    expect(reasons[3]).toBe("SO Rolling Up = Yes");
    expect(reasons[4]).toBe("SO Value = 18.5");
  });

  it("builds Sell Call checklist reasons", () => {
    const reasons = buildSellCallChecklistReasons({
      so: 82.0,
      soStatus: "Rolling Down",
      marketStructure: "Bearish",
      momentum: "Below EMA",
      avgPrice: 350,
      avgPricePrev: 355,
    });

    expect(reasons[0]).toBe("Bearish Structure = Yes");
    expect(reasons[1]).toBe("Momentum Below EMA = Yes");
    expect(reasons[2]).toContain("Current Average Price < Previous Average Price = Yes");
    expect(reasons[3]).toBe("SO Rolling Down = Yes");
    expect(reasons[4]).toBe("SO Value = 82.0");
  });

  it("builds Iron Condor checklist reasons", () => {
    const reasons = buildIronCondorChecklistReasons({
      so: 52.4,
      avgPrice: 322.86,
      midPrice: 324.18,
      atr14: 10.15,
      icMidZone: { low: 314.18, high: 334.18 },
      sellPutSetupValid: false,
      sellCallSetupValid: false,
    });

    expect(reasons).toEqual([
      "SO 40–60 = Yes (52.4)",
      "Average Price inside Adjusted Mid Zone = Yes (314.18 - 334.18)",
      "Sell Put conditions not fully satisfied = Yes",
      "Sell Call conditions not fully satisfied = Yes",
    ]);
  });

  it("builds no-trade reasons with failed conditions", () => {
    const reasons = buildNoTradeReasons({
      so: 52.4,
      soStatus: "Strong",
      marketStructure: "Neutral",
      momentum: "At EMA",
      avgPrice: 322.86,
      avgPricePrev: 320.0,
      midPrice: 324.18,
      atr14: 10,
      icMidZone: { low: 314.18, high: 334.18 },
    });

    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons.join(" ")).toMatch(/Bullish Structure|Bearish Structure|Momentum/);
  });

  it("builds quantitative Iron Condor reasons (deprecated alias)", () => {
    const reasons = buildIronCondorReasons({
      so: 52.4,
      trend: "Neutral",
      avgPrice: 322.86,
      icMidZone: { low: 314.18, high: 334.18 },
      rangeWidth: 60.57,
      atr14: 10.15,
    });

    expect(reasons[0]).toBe("SO = 52.4");
    expect(reasons[1]).toBe("Structure = Neutral");
  });

  it("builds quantitative Sell Put reasons (deprecated alias)", () => {
    const reasons = buildSellPutReasons({
      avgPrice: 298.5,
      sellPutRange: { low: 293.89, high: 303.89 },
      primarySupport: 293.89,
      atr14: 10,
    });

    expect(reasons[0]).toBe("Avg Price = 298.50");
    expect(reasons[2]).toBe("Avg Price inside zone = Yes");
  });

  it("builds quantitative Sell Call reasons (deprecated alias)", () => {
    const reasons = buildSellCallReasons({
      avgPrice: 350,
      sellCallRange: { low: 344.46, high: 354.46 },
      primaryResistance: 354.46,
      atr14: 10,
    });

    expect(reasons[0]).toBe("Avg Price = 350.00");
    expect(reasons[2]).toBe("Avg Price inside zone = Yes");
  });
});

describe("evaluateMainSystemDisplay Cases A-D", () => {
  const sellPutRange = { low: 293.89, high: 303.89 };
  const sellCallRange = { low: 344.46, high: 354.46 };
  const icMidZone = { low: 314.18, high: 334.18 };

  const baseStrategies = {
    bullPut: scoreBullPut({
      soStatus: "Strong",
      marketStructure: "Neutral",
      momentum: "At EMA",
      avgPrice: 322.86,
      avgPricePrev: 320.0,
      primarySupport: 293.89,
      atr14: 10,
      sellPutRange,
    }),
    bearCall: scoreBearCall({
      soStatus: "Strong",
      marketStructure: "Neutral",
      momentum: "At EMA",
      avgPrice: 322.86,
      avgPricePrev: 320.0,
      primaryResistance: 354.46,
      atr14: 10,
      sellCallRange,
    }),
    ironCondor: scoreIronCondor({
      so: 52.4,
      marketStructure: "Neutral",
      momentum: "At EMA",
      soStatus: "Strong",
      avgPrice: 322.86,
      avgPricePrev: 320.0,
      midPrice: 324.18,
      atr14: 10,
      icMidZone,
      rangeWidth: 60.57,
    }),
  };

  const baseInput = {
    ...baseStrategies,
    marketStructure: "Neutral" as const,
    momentum: "At EMA" as const,
    so: 52.4,
    soStatus: "Strong" as const,
    avgPrice: 322.86,
    avgPricePrev: 320.0,
    midPrice: 324.18,
    atr14: 10,
    icMidZone,
  };

  it("Case A: SELL PUT reasons only contain passed Sell Put criteria", () => {
    const bullPut = scoreBullPut({
      soStatus: "Rolling Up",
      marketStructure: "Bullish",
      momentum: "Above EMA",
      avgPrice: 298.5,
      avgPricePrev: 295.0,
      primarySupport: 293.89,
      atr14: 10,
      sellPutRange: { low: 293.89, high: 303.89 },
    });

    const result = evaluateMainSystemDisplay({
      ...baseInput,
      bullPut,
      marketStructure: "Bullish",
      momentum: "Above EMA",
      so: 18.5,
      soStatus: "Rolling Up",
      avgPrice: 298.5,
      avgPricePrev: 295.0,
    });

    expect(result.output).toBe("SELL PUT");
    expect(result.strategy).toBe("bullPut");
    expect(result.reasons).toContain("Average Price inside Sell Put Zone");
    expect(result.reasons).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Iron Condor|40–60|Mid Zone/),
      ])
    );
  });

  it("Case B: SELL CALL reasons only contain passed Sell Call criteria", () => {
    const bearCall = scoreBearCall({
      soStatus: "Rolling Down",
      marketStructure: "Bearish",
      momentum: "Below EMA",
      avgPrice: 350,
      avgPricePrev: 355,
      primaryResistance: 354.46,
      atr14: 10,
      sellCallRange: { low: 344.46, high: 354.46 },
    });

    const result = evaluateMainSystemDisplay({
      ...baseInput,
      bearCall,
      marketStructure: "Bearish",
      momentum: "Below EMA",
      so: 82.0,
      soStatus: "Rolling Down",
      avgPrice: 350,
      avgPricePrev: 355,
    });

    expect(result.output).toBe("SELL CALL");
    expect(result.strategy).toBe("bearCall");
    expect(result.reasons).toContain("Average Price inside Sell Call Zone");
  });

  it("Case C: IRON CONDOR reasons only contain passed Iron Condor criteria", () => {
    const result = evaluateMainSystemDisplay({
      ...baseInput,
      ironCondor: baseStrategies.ironCondor,
    });

    expect(result.output).toBe("IRON CONDOR");
    expect(result.strategy).toBe("ironCondor");
    expect(result.reasons.join(" ")).toMatch(/SO 40-60/);
    expect(result.reasons.join(" ")).toMatch(/Adjusted Mid Zone/);
  });

  it("Case D: NO TRADE reasons explain failed conditions only", () => {
    const result = evaluateMainSystemDisplay({
      ...baseInput,
      so: 75,
      ironCondor: scoreIronCondor({
        so: 75,
        marketStructure: "Neutral",
        momentum: "At EMA",
        soStatus: "Strong",
        avgPrice: 322.86,
        avgPricePrev: 320.0,
        midPrice: 324.18,
        atr14: 10,
        icMidZone,
        rangeWidth: 60.57,
      }),
    });

    expect(result.output).toBe("NO TRADE");
    expect(result.strategy).toBeNull();
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons.every((reason) => !reason.includes("= Yes"))).toBe(
      true
    );
  });

  it("prefers SELL PUT over IRON CONDOR when both are eligible", () => {
    const bullPut = scoreBullPut({
      soStatus: "Rolling Up",
      marketStructure: "Bullish",
      momentum: "Above EMA",
      avgPrice: 298.5,
      avgPricePrev: 295.0,
      primarySupport: 293.89,
      atr14: 10,
      sellPutRange: { low: 293.89, high: 303.89 },
    });

    const result = evaluateMainSystemDisplay({
      ...baseInput,
      bullPut,
      ironCondor: baseStrategies.ironCondor,
      marketStructure: "Bullish",
      momentum: "Above EMA",
      so: 18.5,
      soStatus: "Rolling Up",
      avgPrice: 298.5,
      avgPricePrev: 295.0,
    });

    expect(result.output).toBe("SELL PUT");
    expect(result.strategy).toBe("bullPut");
  });
});
