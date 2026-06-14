import { describe, expect, it } from "vitest";

import { deriveSoStatus, evaluateEmaStrategy } from "./ema-strategy";



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

    expect(deriveSoStatus(30, 40)).toBe("Strong");

    expect(deriveSoStatus(85, 80)).toBe("Strong");

    expect(deriveSoStatus(18, 20)).toBe("Strong");

    expect(deriveSoStatus(86, 80)).toBe("Strong");

    expect(deriveSoStatus(null, 50)).toBe("Strong");

    expect(deriveSoStatus(50, null)).toBe("Strong");

  });

});



describe("evaluateEmaStrategy", () => {

  it("never outputs Iron Condor", () => {

    const result = evaluateEmaStrategy({

      so: 50,

      soPrev: 50,

      soStatus: "Strong",

      trend: "Neutral",

      avgPrice: 100,

      avgPricePrev: 99,

      ema20: 100,

      ema20Prev: 99,

      emaDiffPct: 0.5,

      primarySupport: 95,

      primaryResistance: 105,

      atr14: 5,

    });



    expect(result.output).not.toBe("IRON CONDOR");

  });



  it("outputs SELL PUT when all put rules pass including avg price rising", () => {

    const result = evaluateEmaStrategy({

      so: 30,

      soPrev: 20,

      soStatus: "Rolling Up",

      trend: "Bullish",

      avgPrice: 98,

      avgPricePrev: 96,

      ema20: 97,

      ema20Prev: 96,

      emaDiffPct: 1.2,

      primarySupport: 95,

      primaryResistance: 105,

      atr14: 5,

    });



    expect(result.output).toBe("SELL PUT");

    expect(result.checklist.map((item) => item.label)).toEqual([

      "SO Rolling Up",

      "Trend Bullish",

      "Average Price in Sell Put Zone",

      "Average Price > Previous Average Price",

      "EMA Difference Rule Passed",

      "EMA20 Rising",

    ]);

  });

});


