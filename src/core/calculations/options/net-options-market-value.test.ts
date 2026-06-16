import { describe, expect, it } from "vitest";
import type { OptionsTrade } from "@/core/domain/types/options";
import {
  calculateNetOptionsMarketValueUsd,
  calculateOpenOptionMarketValueUsd,
} from "./net-options-market-value";

function openTrade(overrides: Partial<OptionsTrade>): OptionsTrade {
  return {
    id: "t1",
    status: "open",
    tradeType: "personal",
    userSharePercent: 100,
    clientSharePercent: 0,
    strategy: "sellPut",
    underlying: "SPY",
    expirationDate: "2026-12-18",
    contracts: 1,
    openDate: "2026-01-01",
    openPremiumUsd: 100,
    openFeesUsd: 0,
    maxRiskUsd: 500,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("calculateOpenOptionMarketValueUsd", () => {
  it("values short option: 0.50 × 100 × 1 × −1 = −50", () => {
    const trade = openTrade({
      strategy: "sellPut",
      contracts: 1,
      currentValueUsd: 50,
    });
    expect(calculateOpenOptionMarketValueUsd(trade)).toBe(-50);
  });

  it("values long option: 1.20 × 100 × 2 = +240", () => {
    const trade = openTrade({
      strategy: "buyCall",
      contracts: 2,
      currentValueUsd: 240,
    });
    expect(calculateOpenOptionMarketValueUsd(trade)).toBe(240);
  });

  it("returns null when current value is not marked", () => {
    expect(calculateOpenOptionMarketValueUsd(openTrade({}))).toBeNull();
  });
});

describe("calculateNetOptionsMarketValueUsd", () => {
  it("sums short put, bear call, and buy call to +90", () => {
    const trades: OptionsTrade[] = [
      openTrade({
        id: "sp",
        strategy: "sellPut",
        contracts: 1,
        currentValueUsd: 50,
      }),
      openTrade({
        id: "bc",
        strategy: "bearCall",
        contracts: 1,
        currentValueUsd: 100,
      }),
      openTrade({
        id: "bcall",
        strategy: "buyCall",
        contracts: 2,
        currentValueUsd: 240,
      }),
    ];

    expect(calculateNetOptionsMarketValueUsd(trades)).toBe(90);
  });

  it("QA: short 0.50 × 1 and long 1.20 × 2 nets to +190", () => {
    const trades: OptionsTrade[] = [
      openTrade({
        id: "short",
        strategy: "bullPut",
        contracts: 1,
        currentValueUsd: 50,
      }),
      openTrade({
        id: "long",
        strategy: "buyPut",
        contracts: 2,
        currentValueUsd: 240,
      }),
    ];

    expect(calculateNetOptionsMarketValueUsd(trades)).toBe(190);
  });

  it("returns null when no open trades are marked", () => {
    expect(
      calculateNetOptionsMarketValueUsd([openTrade({ id: "unmarked" })])
    ).toBeNull();
  });

  it("excludes closed trades from net market value", () => {
    const trades: OptionsTrade[] = [
      openTrade({
        id: "open-short",
        strategy: "sellPut",
        contracts: 1,
        currentValueUsd: 50,
      }),
      openTrade({
        id: "closed-short",
        status: "closed",
        closeDate: "2026-01-15",
        strategy: "bearCall",
        contracts: 1,
        currentValueUsd: 100,
        realizedPlUsd: 50,
      }),
      openTrade({
        id: "open-long",
        strategy: "buyCall",
        contracts: 2,
        currentValueUsd: 240,
      }),
    ];

    expect(calculateOpenOptionMarketValueUsd(trades[1])).toBeNull();
    expect(calculateNetOptionsMarketValueUsd(trades)).toBe(190);
  });
});
