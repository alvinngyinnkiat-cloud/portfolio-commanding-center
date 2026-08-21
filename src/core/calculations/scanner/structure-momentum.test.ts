import { describe, expect, it } from "vitest";
import {
  deriveMainSystemMomentum,
  deriveMarketStructure,
  derivePriceEmaPosition,
  isValidSellCallSetup,
  isValidSellPutSetup,
} from "./structure-momentum";

describe("deriveMarketStructure", () => {
  it("Test A: EMA20 > SMA50 > SMA200 → Bullish", () => {
    expect(deriveMarketStructure(290, 283, 259)).toBe("Bullish");
  });

  it("Test D: EMA20 < SMA50 → Neutral (stack not aligned)", () => {
    expect(deriveMarketStructure(250, 283, 259)).toBe("Neutral");
  });

  it("Test E: EMA20 < SMA50 < SMA200 → Bearish", () => {
    expect(deriveMarketStructure(240, 250, 260)).toBe("Bearish");
  });

  it("returns Neutral when any MA is missing", () => {
    expect(deriveMarketStructure(null, 283, 259)).toBe("Neutral");
  });
});

describe("deriveMainSystemMomentum", () => {
  it("returns Rising when current EMA20 is above previous", () => {
    expect(deriveMainSystemMomentum(101, 100)).toBe("Rising");
  });

  it("returns Dropping when current EMA20 is below previous", () => {
    expect(deriveMainSystemMomentum(100, 101)).toBe("Dropping");
  });

  it("returns Flat when EMA20 is unchanged", () => {
    expect(deriveMainSystemMomentum(100, 100)).toBe("Flat");
  });
});

describe("derivePriceEmaPosition", () => {
  it("returns Above EMA when average price is above EMA20", () => {
    expect(derivePriceEmaPosition(295, 290)).toBe("Above EMA");
  });

  it("returns Below EMA when average price is below EMA20", () => {
    expect(derivePriceEmaPosition(285, 290)).toBe("Below EMA");
  });
});

describe("Iron Condor directional guards", () => {
  it("Sell Put IC guard still requires price above EMA20", () => {
    expect(
      isValidSellPutSetup({
        marketStructure: "Bullish",
        ema20: 290,
        avgPrice: 295,
        avgPricePrev: 294,
        soStatus: "Rolling Up",
      })
    ).toBe(true);

    expect(
      isValidSellPutSetup({
        marketStructure: "Bullish",
        ema20: 290,
        avgPrice: 285,
        avgPricePrev: 294,
        soStatus: "Rolling Up",
      })
    ).toBe(false);
  });

  it("Sell Call IC guard still requires price below EMA20", () => {
    expect(
      isValidSellCallSetup({
        marketStructure: "Bearish",
        ema20: 290,
        avgPrice: 285,
        avgPricePrev: 286,
        soStatus: "Rolling Down",
      })
    ).toBe(true);
  });
});
