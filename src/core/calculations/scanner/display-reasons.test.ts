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
      trend: "Bullish",
      avgPrice: 298.5,
      avgPricePrev: 295.0,
      primarySupport: 293.89,
      atr14: 10,
      sellPutRange: { low: 293.89, high: 303.89 },
    });

    expect(reasons[0]).toBe("SO = 18.5");
    expect(reasons[1]).toBe("SO Rolling Up = Yes");
    expect(reasons[2]).toBe("Trend Bullish = Yes");
    expect(reasons[3]).toContain("Avg Price inside Sell Put Zone = Yes");
    expect(reasons[4]).toContain("Avg Price > Previous Avg Price = Yes");
  });

  it("builds Sell Call checklist reasons", () => {
    const reasons = buildSellCallChecklistReasons({
      so: 82.0,
      soStatus: "Rolling Down",
      trend: "Bearish",
      avgPrice: 350,
      avgPricePrev: 355,
      primaryResistance: 354.46,
      atr14: 10,
      sellCallRange: { low: 344.46, high: 354.46 },
    });

    expect(reasons[0]).toBe("SO = 82.0");
    expect(reasons[1]).toBe("SO Rolling Down = Yes");
    expect(reasons[2]).toBe("Trend Bearish = Yes");
    expect(reasons[3]).toContain("Avg Price inside Sell Call Zone = Yes");
    expect(reasons[4]).toContain("Avg Price < Previous Avg Price = Yes");
  });

  it("builds Iron Condor checklist reasons", () => {
    const reasons = buildIronCondorChecklistReasons({
      so: 52.4,
      trend: "Neutral",
      avgPrice: 322.86,
      midPrice: 324.18,
      atr14: 10.15,
      icMidZone: { low: 314.18, high: 334.18 },
    });

    expect(reasons).toEqual([
      "SO = 52.4",
      "SO in range 40-60 = Yes",
      "Trend Neutral = Yes",
      "Avg Price inside Mid Zone = Yes (314.18 - 334.18)",
    ]);
  });

  it("builds no-trade reasons with eligibility failures", () => {
    const reasons = buildNoTradeReasons({
      so: 52.4,
      trend: "Neutral",
      avgPrice: 322.86,
      midPrice: 324.18,
      atr14: 10,
      bullPutEligible: false,
      bearCallEligible: false,
      ironCondorEligible: false,
    });

    expect(reasons[0]).toBe("No eligible strategy");
    expect(reasons).toContain("Sell Put: not eligible");
    expect(reasons).toContain("Sell Call: not eligible");
    expect(reasons).toContain("Iron Condor: not eligible");
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

    expect(reasons).toEqual([
      "SO = 52.4",
      "Trend = Neutral",
      "Avg Price = 322.86",
      "Mid Zone = 314.18 - 334.18",
      "Range Width = 60.57",
      "Range Width = 5.97 ATR",
    ]);
  });

  it("builds quantitative Sell Put reasons (deprecated alias)", () => {
    const reasons = buildSellPutReasons({
      avgPrice: 298.5,
      sellPutRange: { low: 293.89, high: 303.89 },
      primarySupport: 293.89,
      atr14: 10,
    });

    expect(reasons[0]).toBe("Avg Price = 298.50");
    expect(reasons[1]).toBe("Support Zone = 293.89 - 303.89");
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
    expect(reasons[1]).toBe("Resistance Zone = 344.46 - 354.46");
    expect(reasons[2]).toBe("Avg Price inside zone = Yes");
  });
});

describe("evaluateMainSystemDisplay Cases A-D", () => {
  const baseInput = {
    bullPutEligible: false,
    bearCallEligible: false,
    ironCondorEligible: false,
    trend: "Neutral" as const,
    so: 52.4,
    soStatus: "Strong" as const,
    avgPrice: 322.86,
    avgPricePrev: 320.0,
    midPrice: 324.18,
    atr14: 10,
    primarySupport: 293.89,
    primaryResistance: 354.46,
    sellPutRange: { low: 293.89, high: 303.89 },
    sellCallRange: { low: 344.46, high: 354.46 },
    icMidZone: { low: 314.18, high: 334.18 },
  };

  it("Case A: SELL PUT reasons only contain Sell Put criteria", () => {
    const result = evaluateMainSystemDisplay({
      ...baseInput,
      bullPutEligible: true,
      so: 18.5,
      soStatus: "Rolling Up",
      trend: "Bullish",
      avgPrice: 298.5,
      avgPricePrev: 295.0,
    });

    expect(result.output).toBe("SELL PUT");
    expect(result.strategy).toBe("bullPut");
    expect(result.reasons.join(" ")).toMatch(/SO Rolling Up/);
    expect(result.reasons.join(" ")).toMatch(/Trend Bullish/);
    expect(result.reasons.join(" ")).toMatch(/Sell Put Zone/);
    expect(result.reasons.join(" ")).not.toMatch(/Iron Condor|Sell Call|Mid Zone|40-60/);
  });

  it("Case B: SELL CALL reasons only contain Sell Call criteria", () => {
    const result = evaluateMainSystemDisplay({
      ...baseInput,
      bearCallEligible: true,
      so: 82.0,
      soStatus: "Rolling Down",
      trend: "Bearish",
      avgPrice: 350,
      avgPricePrev: 355,
    });

    expect(result.output).toBe("SELL CALL");
    expect(result.strategy).toBe("bearCall");
    expect(result.reasons.join(" ")).toMatch(/SO Rolling Down/);
    expect(result.reasons.join(" ")).toMatch(/Trend Bearish/);
    expect(result.reasons.join(" ")).toMatch(/Sell Call Zone/);
    expect(result.reasons.join(" ")).not.toMatch(/Iron Condor|Sell Put|40-60/);
  });

  it("Case C: IRON CONDOR reasons only contain Iron Condor criteria", () => {
    const result = evaluateMainSystemDisplay({
      ...baseInput,
      ironCondorEligible: true,
    });

    expect(result.output).toBe("IRON CONDOR");
    expect(result.strategy).toBe("ironCondor");
    expect(result.reasons.join(" ")).toMatch(/40-60/);
    expect(result.reasons.join(" ")).toMatch(/Trend Neutral/);
    expect(result.reasons.join(" ")).toMatch(/Mid Zone/);
    expect(result.reasons.join(" ")).not.toMatch(/Support exists|Resistance exists|Sell Put|Sell Call/);
  });

  it("Case D: NO TRADE reasons explain why no strategy passed", () => {
    const result = evaluateMainSystemDisplay(baseInput);

    expect(result.output).toBe("NO TRADE");
    expect(result.strategy).toBeNull();
    expect(result.reasons[0]).toBe("No eligible strategy");
    expect(result.reasons).toContain("Sell Put: not eligible");
    expect(result.reasons).toContain("Sell Call: not eligible");
    expect(result.reasons).toContain("Iron Condor: not eligible");
  });

  it("prefers SELL PUT over IRON CONDOR when both are eligible", () => {
    const result = evaluateMainSystemDisplay({
      ...baseInput,
      bullPutEligible: true,
      ironCondorEligible: true,
      so: 18.5,
      soStatus: "Rolling Up",
      trend: "Bullish",
      avgPrice: 298.5,
      avgPricePrev: 295.0,
    });

    expect(result.output).toBe("SELL PUT");
    expect(result.strategy).toBe("bullPut");
  });
});
