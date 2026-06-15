import { describe, expect, it } from "vitest";
import type { OptionsTrade } from "@/core/domain/types/options";
import {
  getClosedContracts,
  getOriginalContracts,
  getRemainingContracts,
  getTradeTotalRealizedPlUsd,
  tradeForRemainingContracts,
} from "./contract-tracking";
import { resolvePartialCloseRealizedPlUsd } from "./partial-close";
import { sumRealizedOptionsPlUsd } from "./helpers";
import { buildOpenTradeRows } from "./summary";
import { validateCloseTradeDraft } from "./validation";
import { OptionsTradeService } from "@/core/services/options-trade-service";
import type {
  OptionsSettingsRepository,
  OptionsTradeRepository,
} from "@/core/database/repositories/options-repository";

function creditOpenTrade(overrides: Partial<OptionsTrade> = {}): OptionsTrade {
  return {
    id: "t1",
    status: "open",
    tradeType: "personal",
    userSharePercent: 100,
    clientSharePercent: 0,
    strategy: "bullPut",
    underlying: "AAPL",
    expirationDate: "2026-12-18",
    contracts: 2,
    remainingContracts: 2,
    closedContracts: 0,
    closeEvents: [],
    shortStrikeUsd: 100,
    longStrikeUsd: 95,
    openDate: "2026-01-10",
    openPremiumUsd: 200,
    openFeesUsd: 2,
    maxRiskUsd: 1000,
    currentValueUsd: 100,
    createdAt: "2026-01-10T00:00:00.000Z",
    updatedAt: "2026-01-10T00:00:00.000Z",
    ...overrides,
  };
}

class MemoryTradeRepo implements OptionsTradeRepository {
  private trades = new Map<string, OptionsTrade>();

  constructor(seed: OptionsTrade[] = []) {
    for (const trade of seed) this.trades.set(trade.id, trade);
  }

  list() {
    return [...this.trades.values()];
  }

  getById(id: string) {
    return this.trades.get(id) ?? null;
  }

  append(trade: OptionsTrade) {
    this.trades.set(trade.id, trade);
  }

  update(trade: OptionsTrade) {
    this.trades.set(trade.id, trade);
  }

  remove(id: string) {
    this.trades.delete(id);
  }
}

const settingsRepo: OptionsSettingsRepository = {
  get: () => ({
    clientName: "Client",
    clientStartingCapitalUsd: 10_000,
    defaultSharedUserPercent: 60,
    defaultSharedClientPercent: 40,
    updatedAt: "2026-01-01T00:00:00.000Z",
  }),
  save: () => {},
};

describe("partial close contract tracking", () => {
  it("migrates legacy open trades without explicit remaining fields", () => {
    const trade = creditOpenTrade({
      remainingContracts: undefined,
      closedContracts: undefined,
      closeEvents: undefined,
    });
    expect(getOriginalContracts(trade)).toBe(2);
    expect(getRemainingContracts(trade)).toBe(2);
    expect(getClosedContracts(trade)).toBe(0);
  });

  it("allocates open premium/fees to remaining contracts for unrealized", () => {
    const trade = creditOpenTrade({
      remainingContracts: 1,
      closedContracts: 1,
    });
    const effective = tradeForRemainingContracts(trade);
    expect(effective.contracts).toBe(1);
    expect(effective.openPremiumUsd).toBe(100);
    expect(effective.openFeesUsd).toBe(1);
    expect(effective.maxRiskUsd).toBe(500);

    const rows = buildOpenTradeRows([trade]);
    expect(rows[0].unrealizedPlUsd).toBe(-1);
  });

  it("calculates proportional realized P/L for partial close (credit)", () => {
    const realized = resolvePartialCloseRealizedPlUsd({
      strategy: "bullPut",
      originalOpenPremiumUsd: 200,
      originalOpenFeesUsd: 2,
      originalContracts: 2,
      contractsClosed: 1,
      closePremiumUsd: 50,
      closeFeesUsd: 1,
    });
    expect(realized).toBe(48);
  });

  it("rejects closing more contracts than remaining", () => {
    const trade = creditOpenTrade({ remainingContracts: 1 });
    const errors = validateCloseTradeDraft(trade, {
      closeDate: "2026-02-01",
      contractsToClose: 2,
      closeMethod: "normal",
      closePremiumUsd: 50,
      closeFeesUsd: 0,
    });
    expect(errors.some((e) => e.field === "contractsToClose")).toBe(true);
  });
});

describe("partial close service flow", () => {
  it("keeps trade open after partial close and moves to closed when remainder is closed", () => {
    const repo = new MemoryTradeRepo([creditOpenTrade()]);
    const service = new OptionsTradeService(repo, settingsRepo);

    const first = service.closeTrade("t1", {
      closeDate: "2026-02-01",
      contractsToClose: 1,
      closeMethod: "normal",
      closePremiumUsd: 50,
      closeFeesUsd: 1,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    expect(first.trade.status).toBe("open");
    expect(getRemainingContracts(first.trade)).toBe(1);
    expect(getClosedContracts(first.trade)).toBe(1);
    expect(first.trade.closeEvents).toHaveLength(1);
    expect(first.trade.closeEvents![0].realizedPlUsd).toBe(48);

    const second = service.closeTrade("t1", {
      closeDate: "2026-03-01",
      contractsToClose: 1,
      closeMethod: "normal",
      closePremiumUsd: 40,
      closeFeesUsd: 1,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    expect(second.trade.status).toBe("closed");
    expect(getRemainingContracts(second.trade)).toBe(0);
    expect(second.trade.closeEvents).toHaveLength(2);
    expect(second.trade.realizedPlUsd).toBe(48 + 58);
  });

  it("includes partial close realized in US cash sum while trade stays open", () => {
    const openWithPartial = creditOpenTrade({
      remainingContracts: 1,
      closedContracts: 1,
      closeEvents: [
        {
          id: "e1",
          closeDate: "2026-02-01",
          contractsClosed: 1,
          closePremiumUsd: 50,
          closeFeesUsd: 1,
          closeMethod: "normal",
          realizedPlUsd: 48,
          createdAt: "2026-02-01T00:00:00.000Z",
        },
      ],
    });

    expect(getTradeTotalRealizedPlUsd(openWithPartial)).toBe(48);
    expect(sumRealizedOptionsPlUsd([openWithPartial])).toBe(48);
  });
});
