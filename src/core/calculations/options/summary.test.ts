import { describe, expect, it } from "vitest";
import { buildOpenTradeRows, buildOptionsTrackerSummary } from "./summary";
import { summarizeOpenTradesHeader } from "./open-trade-display";
import type { OptionsTrade } from "@/core/domain/types/options";

function openTrade(overrides: Partial<OptionsTrade>): OptionsTrade {
  return {
    id: "t1",
    status: "open",
    tradeType: "personal",
    userSharePercent: 100,
    clientSharePercent: 0,
    strategy: "bullPut",
    underlying: "SPY",
    expirationDate: "2026-12-18",
    contracts: 1,
    openDate: "2026-01-01",
    openPremiumUsd: 200,
    openFeesUsd: 0,
    maxRiskUsd: 300,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildOptionsTrackerSummary ownership unrealized P/L", () => {
  it("splits personal and shared unrealized legs from marked trades", () => {
    const trades: OptionsTrade[] = [
      openTrade({
        id: "personal",
        currentValueUsd: 150,
      }),
      openTrade({
        id: "shared",
        tradeType: "shared",
        userSharePercent: 60,
        clientSharePercent: 40,
        currentValueUsd: 100,
        openPremiumUsd: 300,
        openFeesUsd: 0,
      }),
      openTrade({
        id: "unmarked",
        tradeType: "shared",
        userSharePercent: 55,
        clientSharePercent: 45,
      }),
    ];

    const summary = buildOptionsTrackerSummary({
      contributions: [],
      stockTransactions: [],
      optionsTrades: trades,
      fxRate: null,
    });

    expect(summary.totalUnrealizedPlUsd).toBe(250);
    expect(summary.userUnrealizedPlUsd).toBe(170);
    expect(summary.clientUnrealizedPlUsd).toBe(80);
    expect(summary.markedOpenCount).toBe(2);
    expect(summary.netOptionsMarketValueUsd).toBe(-250);
  });

  it("returns null unrealized legs when no open trades are marked", () => {
    const summary = buildOptionsTrackerSummary({
      contributions: [],
      stockTransactions: [],
      optionsTrades: [openTrade({ id: "unmarked" })],
      fxRate: null,
    });

    expect(summary.totalUnrealizedPlUsd).toBeNull();
    expect(summary.userUnrealizedPlUsd).toBeNull();
    expect(summary.clientUnrealizedPlUsd).toBeNull();
  });
});

describe("inline current value updates", () => {
  it("recalculates unrealized P/L and summary when mark moves from 0.50 to 0.25", () => {
    const tradeAt50 = openTrade({
      contracts: 1,
      openPremiumUsd: 50,
      openFeesUsd: 0,
      currentValueUsd: 50,
    });
    const tradeAt25 = openTrade({
      contracts: 1,
      openPremiumUsd: 50,
      openFeesUsd: 0,
      currentValueUsd: 25,
    });

    const rowsBefore = buildOpenTradeRows([tradeAt50]);
    const rowsAfter = buildOpenTradeRows([tradeAt25]);

    expect(rowsBefore[0].unrealizedPlUsd).toBe(0);
    expect(rowsAfter[0].unrealizedPlUsd).toBe(25);

    const summaryBefore = summarizeOpenTradesHeader(rowsBefore);
    const summaryAfter = summarizeOpenTradesHeader(rowsAfter);

    expect(summaryBefore.totalUnrealizedPlUsd).toBe(0);
    expect(summaryAfter.totalUnrealizedPlUsd).toBe(25);
  });
});
