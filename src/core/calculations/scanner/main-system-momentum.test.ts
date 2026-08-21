import { describe, expect, it } from "vitest";
import { evaluateMainSystemDisplay } from "./main-system-display";
import { scoreBearCall, scoreBullPut, scoreIronCondor } from "./scoring";

describe("Main System EMA20 momentum — Module 4.6 QA", () => {
  const sellPutRange = { low: 90, high: 110 };
  const sellCallRange = { low: 190, high: 210 };

  function baseIronCondor(overrides: Record<string, unknown> = {}) {
    return scoreIronCondor({
      so: 50,
      marketStructure: "Neutral",
      ema20: 100,
      soStatus: "Strong",
      avgPrice: 95,
      avgPricePrev: 96,
      midPrice: 100,
      atr14: 5,
      icMidZone: { low: 95, high: 105 },
      rangeWidth: 10,
      ...overrides,
    });
  }

  it("Test A — Sell Put passes when EMA20 is rising even if avg price is below EMA20", () => {
    const bullPut = scoreBullPut({
      soStatus: "Rolling Up",
      marketStructure: "Bearish",
      momentum: "Rising",
      ema20: 101,
      ema20Prev: 100,
      avgPrice: 95,
      avgPricePrev: 94,
      primarySupport: 90,
      atr14: 20,
      sellPutRange,
    });

    expect(bullPut.eligible).toBe(true);

    const result = evaluateMainSystemDisplay({
      bullPut,
      bearCall: scoreBearCall({
        soStatus: "Rolling Down",
        marketStructure: "Bearish",
        momentum: "Dropping",
        ema20: 101,
        ema20Prev: 100,
        avgPrice: 95,
        avgPricePrev: 96,
        primaryResistance: 210,
        atr14: 20,
        sellCallRange,
      }),
      ironCondor: baseIronCondor(),
      marketStructure: "Bearish",
      momentum: "Rising",
      so: 20,
      soStatus: "Rolling Up",
      avgPrice: 95,
      avgPricePrev: 94,
      midPrice: 100,
      atr14: 5,
      icMidZone: { low: 95, high: 105 },
    });

    expect(result.output).toBe("SELL PUT");
    expect(result.reasons).toContain("EMA20 Momentum Rising");
  });

  it("Test B — Sell Put fails when EMA20 is not rising", () => {
    const bullPut = scoreBullPut({
      soStatus: "Rolling Up",
      marketStructure: "Bullish",
      momentum: "Dropping",
      ema20: 100,
      ema20Prev: 101,
      avgPrice: 95,
      avgPricePrev: 94,
      primarySupport: 90,
      atr14: 20,
      sellPutRange,
    });

    expect(bullPut.eligible).toBe(false);
    expect(bullPut.checklist.some((item) => item.label === "EMA20 not Rising")).toBe(
      true
    );
  });

  it("Test C — Sell Call passes when EMA20 is dropping even if avg price is above EMA20", () => {
    const bearCall = scoreBearCall({
      soStatus: "Rolling Down",
      marketStructure: "Bullish",
      momentum: "Dropping",
      ema20: 198,
      ema20Prev: 200,
      avgPrice: 205,
      avgPricePrev: 206,
      primaryResistance: 210,
      atr14: 20,
      sellCallRange,
    });

    expect(bearCall.eligible).toBe(true);

    const result = evaluateMainSystemDisplay({
      bullPut: scoreBullPut({
        soStatus: "Rolling Up",
        marketStructure: "Bullish",
        momentum: "Rising",
        ema20: 198,
        ema20Prev: 200,
        avgPrice: 205,
        avgPricePrev: 204,
        primarySupport: 90,
        atr14: 20,
        sellPutRange,
      }),
      bearCall,
      ironCondor: baseIronCondor(),
      marketStructure: "Bullish",
      momentum: "Dropping",
      so: 80,
      soStatus: "Rolling Down",
      avgPrice: 205,
      avgPricePrev: 206,
      midPrice: 200,
      atr14: 5,
      icMidZone: { low: 195, high: 205 },
    });

    expect(result.output).toBe("SELL CALL");
    expect(result.reasons).toContain("EMA20 Momentum Dropping");
  });

  it("Test D — Sell Call fails when EMA20 is not dropping", () => {
    const bearCall = scoreBearCall({
      soStatus: "Rolling Down",
      marketStructure: "Bearish",
      momentum: "Rising",
      ema20: 200,
      ema20Prev: 198,
      avgPrice: 205,
      avgPricePrev: 206,
      primaryResistance: 210,
      atr14: 20,
      sellCallRange,
    });

    expect(bearCall.eligible).toBe(false);
    expect(bearCall.checklist.some((item) => item.label === "EMA20 not Dropping")).toBe(
      true
    );
  });
});
