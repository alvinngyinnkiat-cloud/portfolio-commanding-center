import { describe, expect, it } from "vitest";
import type { CryptoHolding, CryptoTrade } from "@/core/domain/types";
import {
  calculateAvailableTradingCashFromTrades,
  isCryptoHoldingOpen,
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

  it("reduces cost basis on sell without changing manual current value", () => {
    const existing: CryptoHolding[] = [
      {
        id: "h1",
        assetName: "ETH",
        investedSgd: 1000,
        currentValueSgd: 1500,
      },
    ];
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

    const rebuilt = rebuildHoldingsFromTrades(trades, existing);
    expect(rebuilt[0].investedSgd).toBe(600);
    expect(rebuilt[0].feesSgd).toBe(10);
    expect(rebuilt[0].currentValueSgd).toBe(1500);
  });

  it("keeps holding open when sell exceeds cost basis but manual current value remains", () => {
    const existing: CryptoHolding[] = [
      {
        id: "h1",
        assetName: "HYPE",
        investedSgd: 300,
        currentValueSgd: 700,
      },
    ];
    const trades: CryptoTrade[] = [
      {
        id: "1",
        date: "2025-01-01",
        assetName: "HYPE",
        type: "buy",
        amountSgd: 300,
      },
      {
        id: "2",
        date: "2025-02-01",
        assetName: "HYPE",
        type: "sell",
        amountSgd: 400,
      },
    ];

    const rebuilt = rebuildHoldingsFromTrades(trades, existing);

    expect(rebuilt).toHaveLength(1);
    expect(rebuilt[0]?.assetName).toBe("HYPE");
    expect(rebuilt[0]?.investedSgd).toBe(0);
    expect(rebuilt[0]?.currentValueSgd).toBe(700);
    expect(isCryptoHoldingOpen(rebuilt[0]!)).toBe(true);
  });

  it("materializes holding from trades when persisted row is missing", () => {
    const trades: CryptoTrade[] = [
      {
        id: "1",
        date: "2025-01-01",
        assetName: "HYPE",
        type: "buy",
        amountSgd: 300,
      },
      {
        id: "2",
        date: "2025-02-01",
        assetName: "HYPE",
        type: "sell",
        amountSgd: 400,
      },
    ];

    const rebuilt = rebuildHoldingsFromTrades(trades, []);

    expect(rebuilt).toHaveLength(1);
    expect(rebuilt[0]?.assetName).toBe("HYPE");
    expect(rebuilt[0]?.investedSgd).toBe(0);
    expect(rebuilt[0]?.currentValueSgd).toBe(0);
  });

  it("restores open holding when trades exist and manual current value is preserved", () => {
    const existing: CryptoHolding[] = [
      {
        id: "h1",
        assetName: "HYPE",
        investedSgd: 0,
        currentValueSgd: 700,
        notes: "Recovered holding after migration issue",
      },
    ];
    const trades: CryptoTrade[] = [
      {
        id: "1",
        date: "2025-01-01",
        assetName: "HYPE",
        type: "buy",
        amountSgd: 300,
      },
      {
        id: "2",
        date: "2025-02-01",
        assetName: "HYPE",
        type: "sell",
        amountSgd: 400,
      },
    ];

    const rebuilt = rebuildHoldingsFromTrades(trades, existing);

    expect(rebuilt).toHaveLength(1);
    expect(rebuilt[0]?.currentValueSgd).toBe(700);
    expect(rebuilt[0]?.notes).toBe("Recovered holding after migration issue");
    expect(isCryptoHoldingOpen(rebuilt[0]!)).toBe(true);
  });

  it("removes holding only when manual current value and cost basis are both zero", () => {
    const existing: CryptoHolding[] = [
      {
        id: "h1",
        assetName: "HYPE",
        investedSgd: 0,
        currentValueSgd: 0,
      },
    ];
    const trades: CryptoTrade[] = [
      {
        id: "1",
        date: "2025-01-01",
        assetName: "HYPE",
        type: "buy",
        amountSgd: 300,
      },
      {
        id: "2",
        date: "2025-02-01",
        assetName: "HYPE",
        type: "sell",
        amountSgd: 300,
      },
    ];

    const rebuilt = rebuildHoldingsFromTrades(trades, existing);

    expect(rebuilt).toHaveLength(0);
    expect(isCryptoHoldingOpen(existing[0]!)).toBe(false);
  });
});
