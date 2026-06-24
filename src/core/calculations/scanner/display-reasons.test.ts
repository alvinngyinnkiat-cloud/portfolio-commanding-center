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
  const baseInput = {
    bullPutEligible: false,
    bearCallEligible: false,
    ironCondorEligible: false,
    marketStructure: "Neutral" as const,
    momentum: "At EMA" as const,
    so: 52.4,
    soStatus: "Strong" as const,
    avgPrice: 322.86,
    avgPricePrev: 320.0,
    midPrice: 324.18,
    atr14: 10,
    icMidZone: { low: 314.18, high: 334.18 },
  };

  it("Case A: SELL PUT reasons only contain Sell Put criteria", () => {
    const result = evaluateMainSystemDisplay({
      ...baseInput,
      bullPutEligible: true,
      so: 18.5,
      soStatus: "Rolling Up",
      marketStructure: "Bullish",
      momentum: "Above EMA",
      avgPrice: 298.5,
      avgPricePrev: 295.0,
    });

    expect(result.output).toBe("SELL PUT");
    expect(result.strategy).toBe("bullPut");
    expect(result.reasons.join(" ")).toMatch(/Bullish Structure/);
    expect(result.reasons.join(" ")).toMatch(/Momentum Above EMA/);
    expect(result.reasons.join(" ")).toMatch(/SO Rolling Up/);
    expect(result.reasons.join(" ")).not.toMatch(/Iron Condor|Sell Call|40–60|Mid Zone/);
  });

  it("Case B: SELL CALL reasons only contain Sell Call criteria", () => {
    const result = evaluateMainSystemDisplay({
      ...baseInput,
      bearCallEligible: true,
      so: 82.0,
      soStatus: "Rolling Down",
      marketStructure: "Bearish",
      momentum: "Below EMA",
      avgPrice: 350,
      avgPricePrev: 355,
    });

    expect(result.output).toBe("SELL CALL");
    expect(result.strategy).toBe("bearCall");
    expect(result.reasons.join(" ")).toMatch(/Bearish Structure/);
    expect(result.reasons.join(" ")).toMatch(/Momentum Below EMA/);
    expect(result.reasons.join(" ")).not.toMatch(/Iron Condor|Sell Put|40–60/);
  });

  it("Case C: IRON CONDOR reasons only contain Iron Condor criteria", () => {
    const result = evaluateMainSystemDisplay({
      ...baseInput,
      ironCondorEligible: true,
    });

    expect(result.output).toBe("IRON CONDOR");
    expect(result.strategy).toBe("ironCondor");
    expect(result.reasons.join(" ")).toMatch(/40–60/);
    expect(result.reasons.join(" ")).toMatch(/Adjusted Mid Zone/);
    expect(result.reasons.join(" ")).toMatch(/Sell Put conditions not fully satisfied/);
    expect(result.reasons.join(" ")).not.toMatch(/Bullish Structure|Bearish Structure|Momentum/);
  });

  it("Case D: NO TRADE reasons explain failed conditions", () => {
    const result = evaluateMainSystemDisplay(baseInput);

    expect(result.output).toBe("NO TRADE");
    expect(result.strategy).toBeNull();
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("prefers SELL PUT over IRON CONDOR when both are eligible", () => {
    const result = evaluateMainSystemDisplay({
      ...baseInput,
      bullPutEligible: true,
      ironCondorEligible: true,
      so: 18.5,
      soStatus: "Rolling Up",
      marketStructure: "Bullish",
      momentum: "Above EMA",
      avgPrice: 298.5,
      avgPricePrev: 295.0,
    });

    expect(result.output).toBe("SELL PUT");
    expect(result.strategy).toBe("bullPut");
  });
});
