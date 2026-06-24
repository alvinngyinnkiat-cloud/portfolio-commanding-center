import { describe, expect, it } from "vitest";
import {
  deriveMarketStructure,
  deriveMomentum,
  isValidSellCallSetup,
  isValidSellPutSetup,
} from "./structure-momentum";

describe("deriveMarketStructure", () => {
  it("Test C: EMA20 > SMA50 > SMA200 → Bullish", () => {
    expect(deriveMarketStructure(290, 283, 259)).toBe("Bullish");
  });

  it("Test D: EMA20 < SMA50 → Neutral (stack not aligned)", () => {
    expect(deriveMarketStructure(250, 283, 259)).toBe("Neutral");
  });

  it("returns Bearish when EMA20 < SMA50 < SMA200", () => {
    expect(deriveMarketStructure(240, 250, 260)).toBe("Bearish");
  });

  it("returns Neutral when any MA is missing", () => {
    expect(deriveMarketStructure(null, 283, 259)).toBe("Neutral");
  });
});

describe("deriveMomentum", () => {
  it("Test A: Average Price > EMA20 → Above EMA", () => {
    expect(deriveMomentum(295, 290)).toBe("Above EMA");
  });

  it("Test B: Average Price < EMA20 → Below EMA", () => {
    expect(deriveMomentum(285, 290)).toBe("Below EMA");
  });

  it("returns At EMA when average price equals EMA20", () => {
    expect(deriveMomentum(290, 290)).toBe("At EMA");
  });
});

describe("Module 4.1 QA scenarios", () => {
  const ema20 = 290;
  const sma50 = 283;
  const sma200 = 259;

  it("Test A: Bullish structure + Above EMA — Sell Put can pass", () => {
    const marketStructure = deriveMarketStructure(ema20, sma50, sma200);
    const momentum = deriveMomentum(295, ema20);

    expect(marketStructure).toBe("Bullish");
    expect(momentum).toBe("Above EMA");
    expect(
      isValidSellPutSetup({
        marketStructure,
        momentum,
        soStatus: "Rolling Up",
        avgPrice: 295,
        avgPricePrev: 290,
      })
    ).toBe(true);
  });

  it("Test B: Bullish structure + Below EMA — Sell Put and Sell Call fail", () => {
    const marketStructure = deriveMarketStructure(ema20, sma50, sma200);
    const momentum = deriveMomentum(285, ema20);

    expect(marketStructure).toBe("Bullish");
    expect(momentum).toBe("Below EMA");
    expect(
      isValidSellPutSetup({
        marketStructure,
        momentum,
        soStatus: "Rolling Up",
        avgPrice: 285,
        avgPricePrev: 280,
      })
    ).toBe(false);
    expect(
      isValidSellCallSetup({
        marketStructure,
        momentum,
        soStatus: "Rolling Down",
        avgPrice: 285,
        avgPricePrev: 290,
      })
    ).toBe(false);
  });
});
