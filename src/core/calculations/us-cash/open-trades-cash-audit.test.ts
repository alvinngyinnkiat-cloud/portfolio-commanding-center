import { describe, expect, it } from "vitest";
import type { OptionsTrade } from "@/core/domain/types/options";
import {
  buildOpenTradeCashRow,
  buildOpenTradesCashRows,
  computeRemainingOpenCashFlowUsd,
  summarizeOpenTradesCash,
} from "./open-trades-cash-audit";

function creditTrade(overrides: Partial<OptionsTrade> = {}): OptionsTrade {
  return {
    id: "credit-1",
    status: "open",
    tradeType: "personal",
    userSharePercent: 100,
    clientSharePercent: 0,
    strategy: "sellPut",
    underlying: "SPY",
    expirationDate: "2026-12-18",
    contracts: 1,
    openDate: "2025-06-01",
    openPremiumUsd: 100,
    openFeesUsd: 3,
    maxRiskUsd: 500,
    createdAt: "2025-06-01T00:00:00.000Z",
    updatedAt: "2025-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("open-trades-cash-audit", () => {
  it("computes cash already received as premium minus fees for credit trades", () => {
    const trade = creditTrade();
    expect(computeRemainingOpenCashFlowUsd(trade)).toBe(97);
  });

  it("builds per-trade rows with premium, market value, and cash received", () => {
    const row = buildOpenTradeCashRow(
      creditTrade({
        currentValueUsd: 25,
      })
    );

    expect(row).not.toBeNull();
    expect(row!.premiumReceivedUsd).toBe(100);
    expect(row!.currentValueUsd).toBe(-25);
    expect(row!.cashAlreadyReceivedUsd).toBe(97);
  });

  it("summarizes open trades count, premium, market value, and net cash", () => {
    const rows = buildOpenTradesCashRows([
      creditTrade({ id: "a", underlying: "SPY", currentValueUsd: 25 }),
      creditTrade({
        id: "b",
        underlying: "AAPL",
        openPremiumUsd: 200,
        openFeesUsd: 5,
        currentValueUsd: 50,
      }),
    ]);

    const summary = summarizeOpenTradesCash(rows);
    expect(summary.openTradesCount).toBe(2);
    expect(summary.premiumReceivedUsd).toBe(300);
    expect(summary.currentMarketValueUsd).toBe(-75);
    expect(summary.netOpenCashContributionUsd).toBe(292);
  });
});
