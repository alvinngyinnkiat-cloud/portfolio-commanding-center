import { describe, expect, it } from "vitest";
import { calculateNakedCreditMetrics } from "./naked-credit";
import { calculateDebitOptionMetrics } from "./debit-option";
import { buildTradeEconomicsFromTrade } from "./trade-economics";
import { calculateRealizedPlUsd, resolveClosedTradeRealizedPlUsd } from "./realized-pl";
import { calculateUnrealizedPlUsd } from "./unrealized-pl";
import { resolveOpenTradeDraft, validateOpenTradeDraft } from "./validation";
import { buildStrategyBreakdown } from "./performance-analytics";
import { calculateTradeReturnPercent } from "./return-percent";
import { formatOptionsStrategy } from "./helpers";
import type { OptionsSettings, OptionsTrade } from "@/core/domain/types/options";

const settings: OptionsSettings = {
  clientName: "Client",
  clientStartingCapitalUsd: 10_000,
  defaultSharedUserPercent: 55,
  defaultSharedClientPercent: 45,
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function baseTrade(overrides: Partial<OptionsTrade> = {}): OptionsTrade {
  return {
    id: "t1",
    status: "open",
    tradeType: "personal",
    userSharePercent: 100,
    clientSharePercent: 0,
    strategy: "sellPut",
    underlying: "AAPL",
    expirationDate: "2026-07-18",
    contracts: 2,
    shortStrikeUsd: 180,
    openDate: "2026-06-01",
    openPremiumUsd: 250,
    openFeesUsd: 2.5,
    maxRiskUsd: 35_747.5,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("strategy expansion calculations", () => {
  it("SELL PUT — net credit, breakeven, max profit", () => {
    const metrics = calculateNakedCreditMetrics({
      strategy: "sellPut",
      strikeUsd: 180,
      contracts: 2,
      openPremiumUsd: 250,
      openFeesUsd: 2.5,
    });
    expect(metrics.netCreditUsd).toBe(247.5);
    expect(metrics.maxProfitUsd).toBe(247.5);
    expect(metrics.breakevenUsd).toBeCloseTo(178.7625, 4);
    expect(metrics.maxRiskUsd).toBe(35_752.5);
  });

  it("SELL CALL — net credit and breakeven with manual max risk", () => {
    const metrics = calculateNakedCreditMetrics({
      strategy: "sellCall",
      strikeUsd: 200,
      contracts: 1,
      openPremiumUsd: 125,
      openFeesUsd: 1.25,
      manualMaxRiskUsd: 5000,
    });
    expect(metrics.netCreditUsd).toBe(123.75);
    expect(metrics.breakevenUsd).toBeCloseTo(201.2375, 4);
    expect(metrics.maxRiskUsd).toBe(5000);
  });

  it("BUY CALL — premium cost, breakeven, 75% TP", () => {
    const metrics = calculateDebitOptionMetrics({
      strategy: "buyCall",
      strikeUsd: 150,
      contracts: 1,
      openPremiumUsd: 150,
      openFeesUsd: 1.5,
    });
    expect(metrics.premiumCostUsd).toBe(151.5);
    expect(metrics.maxRiskUsd).toBe(151.5);
    expect(metrics.breakevenUsd).toBeCloseTo(151.5, 4);
    expect(metrics.tpExitPrice75Usd).toBe(262.5);
    expect(metrics.premiumPaidPerShare).toBe(1.5);
  });

  it("BUY PUT — premium cost and breakeven", () => {
    const metrics = calculateDebitOptionMetrics({
      strategy: "buyPut",
      strikeUsd: 100,
      contracts: 1,
      openPremiumUsd: 200,
      openFeesUsd: 2,
    });
    expect(metrics.premiumCostUsd).toBe(202);
    expect(metrics.breakevenUsd).toBeCloseTo(98, 4);
    expect(metrics.tpExitPrice75Usd).toBe(350);
  });

  it("debit unrealized and realized P/L", () => {
    expect(
      calculateUnrealizedPlUsd({
        strategy: "buyCall",
        openPremiumUsd: 150,
        openFeesUsd: 1.5,
        currentValueUsd: 262.5,
      })
    ).toBe(111);
    expect(
      calculateRealizedPlUsd({
        strategy: "buyCall",
        openPremiumUsd: 150,
        openFeesUsd: 1.5,
        closePremiumUsd: 262.5,
        closeFeesUsd: 1.5,
      })
    ).toBe(109.5);
  });

  it("credit unrealized and realized P/L unchanged", () => {
    expect(
      calculateUnrealizedPlUsd({
        strategy: "sellPut",
        openPremiumUsd: 250,
        openFeesUsd: 2.5,
        currentValueUsd: 62.5,
      })
    ).toBe(185);
    expect(
      calculateRealizedPlUsd({
        strategy: "sellPut",
        openPremiumUsd: 250,
        openFeesUsd: 2.5,
        closePremiumUsd: 62.5,
        closeFeesUsd: 2.5,
      })
    ).toBe(182.5);
  });
});

describe("strategy expansion workflows", () => {
  it("opens SELL PUT with auto max risk", () => {
    const draft = resolveOpenTradeDraft({
      tradeType: "personal",
      strategy: "sellPut",
      underlying: "AAPL",
      contracts: 1,
      shortStrikeUsd: 100,
      expirationDate: "2026-08-15",
      openDate: "2026-06-01",
      openPremiumUsd: 125,
      openFeesUsd: 1.25,
    });
    expect(draft.maxRiskUsd).toBe(9876.25);
    expect(validateOpenTradeDraft(draft, settings)).toHaveLength(0);
  });

  it("requires manual max risk for SELL CALL", () => {
    const errors = validateOpenTradeDraft(
      {
        tradeType: "personal",
        strategy: "sellCall",
        underlying: "AAPL",
        contracts: 1,
        shortStrikeUsd: 200,
        expirationDate: "2026-08-15",
        openDate: "2026-06-01",
        openPremiumUsd: 125,
        openFeesUsd: 1.25,
      },
      settings
    );
    expect(errors.some((e) => e.field === "maxRiskUsd")).toBe(true);
  });

  it("opens BUY CALL shared trade and closes with profit", () => {
    const openDraft = resolveOpenTradeDraft({
      tradeType: "shared",
      strategy: "buyCall",
      underlying: "NVDA",
      contracts: 1,
      longStrikeUsd: 150,
      expirationDate: "2026-08-15",
      openDate: "2026-06-01",
      openPremiumUsd: 150,
      openFeesUsd: 1.5,
      userSharePercent: 55,
      clientSharePercent: 45,
    });
    expect(openDraft.maxRiskUsd).toBe(151.5);

    const realized = resolveClosedTradeRealizedPlUsd({
      strategy: "buyCall",
      closeMethod: "normal",
      openPremiumUsd: 150,
      openFeesUsd: 1.5,
      closePremiumUsd: 262.5,
      closeFeesUsd: 1.5,
    });
    expect(realized).toBe(109.5);
    expect(calculateTradeReturnPercent(realized, openDraft.maxRiskUsd)).toBeCloseTo(
      72.28,
      1
    );
  });

  it("CUSTOM strategy uses strategy label in display", () => {
    const trade = baseTrade({
      strategy: "custom",
      strategyLabel: "Risk Reversal",
      maxRiskUsd: 1000,
    });
    expect(formatOptionsStrategy(trade.strategy, trade.strategyLabel)).toBe(
      "Risk Reversal"
    );
    expect(buildTradeEconomicsFromTrade(trade)).toBeNull();
  });

  it("includes new strategies in performance breakdown", () => {
    const closed: OptionsTrade[] = [
      baseTrade({
        status: "closed",
        strategy: "sellPut",
        closeDate: "2026-06-10",
        realizedPlUsd: 100,
        returnPercent: 5,
      }),
      baseTrade({
        id: "t2",
        status: "closed",
        strategy: "buyCall",
        longStrikeUsd: 150,
        shortStrikeUsd: undefined,
        closeDate: "2026-06-12",
        realizedPlUsd: 50,
        returnPercent: 33,
        maxRiskUsd: 151.5,
      }),
      baseTrade({
        id: "t3",
        status: "closed",
        strategy: "custom",
        strategyLabel: "Collar",
        closeDate: "2026-06-14",
        realizedPlUsd: -25,
        returnPercent: -2.5,
        maxRiskUsd: 1000,
      }),
    ];
    const rows = buildStrategyBreakdown(closed, "total");
    expect(rows.find((r) => r.strategy === "sellPut")?.closedCount).toBe(1);
    expect(rows.find((r) => r.strategy === "buyCall")?.closedCount).toBe(1);
    expect(rows.find((r) => r.strategy === "custom")?.strategyDisplay).toBe("Collar");
  });
});
