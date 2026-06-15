import { describe, expect, it, vi } from "vitest";
import type { CryptoHoldingRepository } from "@/core/database/repositories/crypto-holding-repository";
import type { CryptoTradeRepository } from "@/core/database/repositories/crypto-trade-repository";
import type { CryptoHolding, CryptoTrade } from "@/core/domain/types";
import { CryptoTradeService } from "./crypto-trade-service";

function createMocks() {
  const trades: CryptoTrade[] = [];
  const holdings: CryptoHolding[] = [];

  const tradeRepo: CryptoTradeRepository = {
    list: () => [...trades],
    upsert: (trade) => {
      const idx = trades.findIndex((row) => row.id === trade.id);
      if (idx >= 0) trades[idx] = trade;
      else trades.push(trade);
      return true;
    },
    delete: (id) => {
      const idx = trades.findIndex((row) => row.id === id);
      if (idx >= 0) trades.splice(idx, 1);
    },
    replaceAll: (rows) => {
      trades.splice(0, trades.length, ...rows);
    },
  };

  const holdingRepo: CryptoHoldingRepository = {
    list: () => [...holdings],
    upsert: vi.fn(),
    delete: vi.fn(),
    replaceAll: (rows) => {
      holdings.splice(0, holdings.length, ...rows);
    },
  };

  return { tradeRepo, holdingRepo, trades, holdings };
}

describe("CryptoTradeService", () => {
  it("persists trade before rebuilding holdings", () => {
    const { tradeRepo, holdingRepo, trades, holdings } = createMocks();
    const service = new CryptoTradeService(tradeRepo, holdingRepo);

    const saved = service.upsertFromDraft({
      date: "2026-06-15",
      assetName: "BTC",
      type: "buy",
      amountSgd: "1000",
      feesSgd: "5",
      notes: "test",
    });

    expect(saved).not.toBeNull();
    expect(trades).toHaveLength(1);
    expect(trades[0]?.date).toBe("2026-06-15");
    expect(holdings).toHaveLength(1);
    expect(holdings[0]?.assetName).toBe("BTC");
  });

  it("does not rebuild holdings when trade upsert fails", () => {
    const { tradeRepo, holdingRepo, holdings } = createMocks();
    tradeRepo.upsert = () => false;
    const service = new CryptoTradeService(tradeRepo, holdingRepo);

    const saved = service.upsertFromDraft({
      date: "2026-06-15",
      assetName: "BTC",
      type: "buy",
      amountSgd: "1000",
      feesSgd: "0",
      notes: "",
    });

    expect(saved).toBeNull();
    expect(holdings).toHaveLength(0);
  });

  it("rebuilds holdings when an existing trade amount is edited", () => {
    const { tradeRepo, holdingRepo, trades, holdings } = createMocks();
    const service = new CryptoTradeService(tradeRepo, holdingRepo);

    service.upsertFromDraft({
      date: "2026-06-15",
      assetName: "BTC",
      type: "buy",
      amountSgd: "250",
      feesSgd: "0",
      notes: "",
    });

    const existing = trades[0]!;
    const updated = service.upsertFromDraft(
      {
        date: "2026-06-15",
        assetName: "BTC",
        type: "buy",
        amountSgd: "500",
        feesSgd: "0",
        notes: "",
      },
      existing.id
    );

    expect(updated?.amountSgd).toBe(500);
    expect(holdings[0]?.investedSgd).toBe(500);
  });

  it("removes trade and rebuilds holdings on delete", () => {
    const { tradeRepo, holdingRepo, trades, holdings } = createMocks();
    const service = new CryptoTradeService(tradeRepo, holdingRepo);

    service.upsertFromDraft({
      date: "2026-06-15",
      assetName: "BTC",
      type: "buy",
      amountSgd: "250",
      feesSgd: "0",
      notes: "",
    });

    const id = trades[0]!.id;
    expect(service.delete(id)).toBe(true);
    expect(trades).toHaveLength(0);
    expect(holdings).toHaveLength(0);
  });

  it("supports partial profit taking when sell exceeds cost basis", () => {
    const { tradeRepo, holdingRepo, trades, holdings } = createMocks();
    const service = new CryptoTradeService(tradeRepo, holdingRepo);

    service.upsertFromDraft({
      date: "2026-01-01",
      assetName: "HYPE",
      type: "buy",
      amountSgd: "300",
      feesSgd: "0",
      notes: "",
    });

    holdings[0]!.currentValueSgd = 700;

    service.upsertFromDraft({
      date: "2026-02-01",
      assetName: "HYPE",
      type: "sell",
      amountSgd: "400",
      feesSgd: "0",
      notes: "",
    });

    expect(holdings).toHaveLength(1);
    expect(holdings[0]?.assetName).toBe("HYPE");
    expect(holdings[0]?.investedSgd).toBe(0);
    expect(holdings[0]?.currentValueSgd).toBe(700);
    expect(trades).toHaveLength(2);
  });
});
