import { describe, expect, it } from "vitest";
import type { CryptoHoldingRepository } from "@/core/database/repositories/crypto-holding-repository";
import type { CryptoTradeRepository } from "@/core/database/repositories/crypto-trade-repository";
import type { CryptoAllocationRepository } from "@/core/database/repositories/crypto-allocation-repository";
import type { ContributionRepository } from "@/core/database/repositories/contribution-repository";
import type {
  ContributionTransaction,
  CryptoAllocationSettings,
  CryptoHolding,
  CryptoTrade,
} from "@/core/domain/types";
import { DEFAULT_CRYPTO_ALLOCATION } from "@/core/calculations/crypto/allocation";
import { CryptoTradeService } from "@/core/services/crypto-trade-service";
import { CryptoHoldingService } from "@/core/services/crypto-holding-service";
import { CryptoAllocationService } from "@/core/services/crypto-allocation-service";
import { ContributionService } from "@/core/services/contribution-service";
import { CryptoTrackerService } from "@/core/services/crypto-tracker-service";

function createInMemoryCryptoStores() {
  const trades: CryptoTrade[] = [];
  const holdings: CryptoHolding[] = [];
  let contributions: ContributionTransaction[] = [];
  let allocation: CryptoAllocationSettings = { ...DEFAULT_CRYPTO_ALLOCATION };

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
    upsert: (holding) => {
      const idx = holdings.findIndex((row) => row.id === holding.id);
      if (idx >= 0) holdings[idx] = holding;
      else holdings.push(holding);
    },
    delete: (id) => {
      const idx = holdings.findIndex((row) => row.id === id);
      if (idx >= 0) holdings.splice(idx, 1);
    },
    replaceAll: (rows) => {
      holdings.splice(0, holdings.length, ...rows);
    },
  };

  const contributionRepo: ContributionRepository = {
    list: () => [...contributions],
    upsert: (entry) => {
      const idx = contributions.findIndex((row) => row.id === entry.id);
      if (idx >= 0) contributions[idx] = entry;
      else contributions.push(entry);
    },
    delete: (id) => {
      contributions = contributions.filter((row) => row.id !== id);
    },
    replaceAll: (rows) => {
      contributions = [...rows];
    },
  };

  const allocationRepo: CryptoAllocationRepository = {
    get: () => ({ ...allocation }),
    save: (settings) => {
      allocation = { ...settings };
    },
  };

  const cryptoTrades = new CryptoTradeService(tradeRepo, holdingRepo);
  const cryptoHoldings = new CryptoHoldingService(holdingRepo);
  const contributionsService = new ContributionService(contributionRepo);
  const cryptoAllocation = new CryptoAllocationService(allocationRepo);
  const cryptoTracker = new CryptoTrackerService(
    holdingRepo,
    tradeRepo,
    allocationRepo,
    contributionRepo
  );

  const reload = () => cryptoTracker.getData();

  return {
    stores: { trades, holdings, contributions, allocation },
    services: {
      cryptoTrades,
      cryptoHoldings,
      contributions: contributionsService,
      cryptoAllocation,
      cryptoTracker,
    },
    reload,
  };
}

describe("Crypto persistence validation", () => {
  it("1. add holding survives reload", () => {
    const { services, reload } = createInMemoryCryptoStores();

    services.cryptoTrades.upsertFromDraft({
      date: "2026-06-01",
      assetName: "ETH",
      type: "buy",
      amountSgd: "500",
      feesSgd: "2",
      notes: "",
    });

    const data = reload();
    expect(data.rows).toHaveLength(1);
    expect(data.rows[0]?.assetName).toBe("ETH");
  });

  it("2. edit holding valuation survives reload", () => {
    const { services, reload } = createInMemoryCryptoStores();

    services.cryptoTrades.upsertFromDraft({
      date: "2026-06-01",
      assetName: "ETH",
      type: "buy",
      amountSgd: "500",
      feesSgd: "0",
      notes: "",
    });

    const holdingId = reload().rows[0]!.id;
    services.cryptoHoldings.updateValuation(holdingId, {
      currentValueSgd: "750",
      notes: "manual",
    });

    expect(reload().rows[0]?.currentValueSgd).toBe(750);
    expect(reload().rows[0]?.notes).toBe("manual");
  });

  it("3. delete holding stays deleted after reload", () => {
    const { services, reload } = createInMemoryCryptoStores();

    services.cryptoTrades.upsertFromDraft({
      date: "2026-06-01",
      assetName: "SOL",
      type: "buy",
      amountSgd: "200",
      feesSgd: "0",
      notes: "",
    });

    const row = reload().rows[0]!;
    services.cryptoTrades.replaceAll([]);
    services.cryptoHoldings.delete(row.id);

    expect(reload().rows).toHaveLength(0);
  });

  it("4. contribution changes survive reload", () => {
    const { services, reload } = createInMemoryCryptoStores();

    services.contributions.upsert({
      id: "dep-1",
      date: "2026-06-01",
      type: "deposit",
      category: "crypto",
      amountSgd: 1000,
    });

    expect(reload().summary.totalCryptoCashContributed).toBe(1000);

    services.contributions.upsert({
      id: "dep-1",
      date: "2026-06-01",
      type: "deposit",
      category: "crypto",
      amountSgd: 1500,
    });

    expect(reload().summary.totalCryptoCashContributed).toBe(1500);
  });

  it("5. allocation settings survive reload", () => {
    const { services, reload } = createInMemoryCryptoStores();

    services.cryptoAllocation.save({
      topHolding: 40,
      secondToFifth: 30,
      sixthToTenth: 20,
      others: 10,
    });

    expect(reload().allocationSettings).toEqual({
      topHolding: 40,
      secondToFifth: 30,
      sixthToTenth: 20,
      others: 10,
    });
  });

  it("6. data remains after simulated navigation reload", () => {
    const first = createInMemoryCryptoStores();
    first.services.cryptoTrades.upsertFromDraft({
      date: "2026-06-01",
      assetName: "BTC",
      type: "buy",
      amountSgd: "1000",
      feesSgd: "0",
      notes: "",
    });

    const second = createInMemoryCryptoStores();
    second.stores.trades.push(...first.stores.trades);
    second.stores.holdings.push(...first.stores.holdings);

    expect(second.reload().rows[0]?.assetName).toBe("BTC");
  });

  it("7. rapid edits keep final holding value", () => {
    const { services, reload } = createInMemoryCryptoStores();

    services.cryptoTrades.upsertFromDraft({
      date: "2026-06-01",
      assetName: "BTC",
      type: "buy",
      amountSgd: "1000",
      feesSgd: "0",
      notes: "",
    });

    const id = reload().rows[0]!.id;
    services.cryptoHoldings.updateValuation(id, {
      currentValueSgd: "1100",
      notes: "",
    });
    services.cryptoHoldings.updateValuation(id, {
      currentValueSgd: "1200",
      notes: "",
    });
    services.cryptoHoldings.updateValuation(id, {
      currentValueSgd: "1300",
      notes: "final",
    });

    expect(reload().rows[0]?.currentValueSgd).toBe(1300);
    expect(reload().rows[0]?.notes).toBe("final");
  });

  it("8. hard refresh simulation reloads same stored rows", () => {
    const { services, stores, reload } = createInMemoryCryptoStores();

    services.cryptoTrades.upsertFromDraft({
      date: "2026-06-01",
      assetName: "BTC",
      type: "buy",
      amountSgd: "1000",
      feesSgd: "0",
      notes: "",
    });

    const snapshot = {
      trades: structuredClone(stores.trades),
      holdings: structuredClone(stores.holdings),
    };

    stores.trades.length = 0;
    stores.holdings.length = 0;

    stores.trades.push(...snapshot.trades);
    stores.holdings.push(...snapshot.holdings);

    expect(reload().rows).toHaveLength(1);
  });

  it("9. duplicate holdings are not created for same asset trades", () => {
    const { services, reload } = createInMemoryCryptoStores();

    services.cryptoTrades.upsertFromDraft({
      date: "2026-06-01",
      assetName: "BTC",
      type: "buy",
      amountSgd: "500",
      feesSgd: "0",
      notes: "",
    });
    services.cryptoTrades.upsertFromDraft({
      date: "2026-06-02",
      assetName: "BTC",
      type: "buy",
      amountSgd: "300",
      feesSgd: "0",
      notes: "",
    });

    expect(reload().rows).toHaveLength(1);
    expect(reload().rows[0]?.investedSgd).toBe(800);
  });

  it("10. summary cards recalculate from saved data", () => {
    const { services, reload } = createInMemoryCryptoStores();

    services.contributions.upsert({
      id: "dep-1",
      date: "2026-06-01",
      type: "deposit",
      category: "crypto",
      amountSgd: 2000,
    });

    services.cryptoTrades.upsertFromDraft({
      date: "2026-06-02",
      assetName: "BTC",
      type: "buy",
      amountSgd: "800",
      feesSgd: "0",
      notes: "",
    });

    const id = reload().rows[0]!.id;
    services.cryptoHoldings.updateValuation(id, {
      currentValueSgd: "1000",
      notes: "",
    });

    const summary = reload().summary;
    expect(summary.cryptoHoldingsValueSgd).toBe(1000);
    expect(summary.totalCryptoCashContributed).toBe(2000);
    expect(summary.cryptoContributionSgd).toBe(2000);
  });
});
