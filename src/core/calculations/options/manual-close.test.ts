import { describe, expect, it } from "vitest";
import type { OptionsTrade } from "@/core/domain/types/options";
import { DEFAULT_OPTIONS_SETTINGS } from "@/core/domain/defaults-options";
import { buildOptionsClientSummary } from "./client-summary";
import { buildClosedTradeRows, buildTradeTypePerformanceDetail } from "./summary";
import { buildPerformanceScopeDetail } from "./performance-analytics";
import { resolveClosedTradeRealizedPlUsd } from "./realized-pl";
import { splitForTrade } from "./split";
import { sumRealizedOptionsPlUsd } from "./helpers";
import { calculateUsAvailableCashUsd } from "@/core/calculations/us-cash";
import { validateCloseTradeDraft } from "./validation";

function sharedOpenTrade(): OptionsTrade {
  return {
    id: "open-intu",
    status: "open",
    tradeType: "shared",
    userSharePercent: 55,
    clientSharePercent: 45,
    strategy: "bullPut",
    underlying: "INTU",
    expirationDate: "2025-06-20",
    contracts: 2,
    shortStrikeUsd: 600,
    longStrikeUsd: 590,
    openDate: "2025-05-01",
    openPremiumUsd: 500,
    openFeesUsd: 5,
    maxRiskUsd: 1505,
    createdAt: "2025-05-01T00:00:00.000Z",
    updatedAt: "2025-05-01T00:00:00.000Z",
  };
}

function manualClosedTrade(): OptionsTrade {
  return {
    ...sharedOpenTrade(),
    id: "closed-intu",
    status: "closed",
    closeDate: "2025-06-15",
    closeMethod: "manual_pl",
    manualRealizedPlUsd: -1190.59,
    closePremiumUsd: 0,
    closeFeesUsd: 0,
    realizedPlUsd: -1190.59,
    returnPercent: (-1190.59 / 1505) * 100,
    updatedAt: "2025-06-15T00:00:00.000Z",
  };
}

function normalClosedTrade(): OptionsTrade {
  return {
    ...sharedOpenTrade(),
    id: "closed-normal",
    status: "closed",
    closeDate: "2025-06-10",
    closeMethod: "normal",
    closePremiumUsd: 48,
    closeFeesUsd: 2.5,
    realizedPlUsd: resolveClosedTradeRealizedPlUsd({
      closeMethod: "normal",
      openPremiumUsd: 500,
      openFeesUsd: 5,
      closePremiumUsd: 48,
      closeFeesUsd: 2.5,
    }),
    returnPercent: (444.5 / 1505) * 100,
    updatedAt: "2025-06-10T00:00:00.000Z",
  };
}

describe("manual realized P/L close method", () => {
  it("Test 1: normal close still works", () => {
    const realized = resolveClosedTradeRealizedPlUsd({
      closeMethod: "normal",
      openPremiumUsd: 500,
      openFeesUsd: 5,
      closePremiumUsd: 48,
      closeFeesUsd: 2.5,
    });
    expect(realized).toBe(444.5);

    const errors = validateCloseTradeDraft(sharedOpenTrade(), {
      closeDate: "2025-06-10",
      closeMethod: "normal",
      closePremiumUsd: 48,
      closeFeesUsd: 2.5,
    });
    expect(errors).toHaveLength(0);
  });

  it("Test 2: manual P/L -1190.59 splits 55/45 correctly", () => {
    const trade = manualClosedTrade();
    const legs = splitForTrade(trade, -1190.59);
    expect(legs.userLegUsd).toBe(-654.82);
    expect(legs.clientLegUsd).toBe(-535.77);
  });

  it("Test 3: US Available Cash reflects open premium plus manual close reconciliation", () => {
    const trades = [manualClosedTrade()];
    expect(sumRealizedOptionsPlUsd(trades)).toBe(-1190.59);

    const cash = calculateUsAvailableCashUsd({
      contributions: [],
      fxConversions: [],
      stockTransactions: [],
      fxRate: 1.35,
      optionsTrades: trades,
    });
    expect(cash).toBe(-1190.59);
  });

  it("Test 4: client equity decreases by client portion only", () => {
    const settings = {
      ...DEFAULT_OPTIONS_SETTINGS,
      clientStartingCapitalUsd: 3000,
    };
    const closedRows = buildClosedTradeRows([manualClosedTrade()]);
    const clientSummary = buildOptionsClientSummary(settings, [], closedRows);

    expect(clientSummary.clientRealizedPlUsd).toBe(-535.77);
    expect(clientSummary.clientEquityUsd).toBeCloseTo(3000 - 535.77, 2);
  });

  it("Test 5: performance analytics includes manual P/L trades", () => {
    const detail = buildPerformanceScopeDetail([manualClosedTrade()], "total");
    expect(detail.totalRealizedPlUsd).toBe(-1190.59);
    expect(detail.closedCount).toBe(1);
    expect(detail.lossCount).toBe(1);
  });

  it("Test 6: profit factor includes manual P/L trades", () => {
    const detail = buildPerformanceScopeDetail(
      [normalClosedTrade(), manualClosedTrade()],
      "total"
    );
    expect(detail.grossProfitUsd).toBe(444.5);
    expect(detail.grossLossUsd).toBe(1190.59);
    expect(detail.profitFactorKind).toBe("value");
    expect(detail.profitFactorValue).toBeCloseTo(444.5 / 1190.59, 4);
  });

  it("Test 7: return % includes manual P/L trades", () => {
    const detail = buildTradeTypePerformanceDetail([manualClosedTrade()], "shared");
    expect(detail.returnPercent).toBeCloseTo((-1190.59 / 1505) * 100, 4);
  });

  it("Test 8: editing manual P/L recalculates closed row reporting", () => {
    const original = manualClosedTrade();
    const edited: OptionsTrade = {
      ...original,
      manualRealizedPlUsd: -1300,
      realizedPlUsd: -1300,
      returnPercent: (-1300 / 1505) * 100,
    };

    const [row] = buildClosedTradeRows([edited]);
    expect(row.trade.realizedPlUsd).toBe(-1300);
    expect(row.userRealizedPlUsd).toBe(-715);
    expect(row.clientRealizedPlUsd).toBe(-585);
    expect(row.returnPercent).toBeCloseTo((-1300 / 1505) * 100, 4);
  });
});
