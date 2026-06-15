import { describe, expect, it } from "vitest";
import type { CryptoHolding, CryptoTrade } from "@/core/domain/types";
import {
  calculateAvailableTradingCashFromTrades,
  rebuildHoldingsFromTrades,
} from "./trades";

describe("calculateAvailableTradingCashFromTrades", () => {
  it("subtracts buys and adds sell proceeds", () => {
    const trades: CryptoTrade[] = [
      {
        id: "1",
        date: "2025-01-01",
        assetName: "BTC",
        type: "buy",
        amountSgd: 3000,
        feesSgd: 20,
      },
      {
        id: "2",
        date: "2025-02-01",
        assetName: "BTC",
        type: "sell",
        amountSgd: 1500,
        feesSgd: 5,
      },
    ];

    expect(calculateAvailableTradingCashFromTrades(5000, trades)).toBe(3500);
  });
});

describe("rebuildHoldingsFromTrades", () => {
  it("aggregates buys and preserves manual current value", () => {
    const existing: CryptoHolding[] = [
      {
        id: "h1",
        assetName: "BTC",
        investedSgd: 0,
        currentValueSgd: 3200,
      },
    ];
    const trades: CryptoTrade[] = [
      {
        id: "1",
        date: "2025-01-01",
        assetName: "BTC",
        type: "buy",
        amountSgd: 3000,
        feesSgd: 20,
      },
    ];

    const rebuilt = rebuildHoldingsFromTrades(trades, existing);
    expect(rebuilt).toHaveLength(1);
    expect(rebuilt[0].investedSgd).toBe(3000);
    expect(rebuilt[0].feesSgd).toBe(20);
    expect(rebuilt[0].currentValueSgd).toBe(3200);
  });

  it("reduces cost basis on sell", () => {
    const trades: CryptoTrade[] = [
      {
        id: "1",
        date: "2025-01-01",
        assetName: "ETH",
        type: "buy",
        amountSgd: 1000,
        feesSgd: 10,
      },
      {
        id: "2",
        date: "2025-02-01",
        assetName: "ETH",
        type: "sell",
        amountSgd: 400,
      },
    ];

    const rebuilt = rebuildHoldingsFromTrades(trades, []);
    expect(rebuilt[0].investedSgd).toBe(600);
    expect(rebuilt[0].feesSgd).toBe(10);
  });
});
