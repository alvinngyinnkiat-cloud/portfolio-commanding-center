import { describe, expect, it } from "vitest";
import type { OptionsTrade } from "@/core/domain/types/options";
import {
  computeCloseEventCashFlowUsd,
  computeOptionOpenCashFlowUsd,
  summarizeOptionsCashFlowUsd,
  summarizeOptionsReconciliationUsd,
} from "./options-cash-flow";

function creditTrade(
  overrides: Partial<OptionsTrade> = {}
): OptionsTrade {
  return {
    id: "credit-1",
    status: "open",
    tradeType: "shared",
    userSharePercent: 55,
    clientSharePercent: 45,
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

function debitTrade(overrides: Partial<OptionsTrade> = {}): OptionsTrade {
  return {
    ...creditTrade(),
    id: "debit-1",
    strategy: "buyCall",
    longStrikeUsd: 500,
    openPremiumUsd: 100,
    openFeesUsd: 3,
    maxRiskUsd: 103,
    ...overrides,
  };
}

describe("options cash flow — broker reconciliation", () => {
  it("Test 1: open credit option increases cash by premium minus fees", () => {
    const trade = creditTrade();
    expect(computeOptionOpenCashFlowUsd(trade)).toBe(97);

    const summary = summarizeOptionsCashFlowUsd([trade]);
    expect(summary.optionOpenCashFlowUsd).toBe(97);
    expect(summary.netOptionsCashFlowUsd).toBe(97);
  });

  it("Test 2: close credit option net cash impact equals realized P/L", () => {
    const trade = creditTrade({
      status: "closed",
      closeDate: "2025-06-15",
      closeMethod: "normal",
      closePremiumUsd: 25,
      closeFeesUsd: 3,
      realizedPlUsd: 69,
    });

    const closeEvent = {
      id: "close-1",
      closeDate: "2025-06-15",
      contractsClosed: 1,
      closePremiumUsd: 25,
      closeFeesUsd: 3,
      closeMethod: "normal" as const,
      realizedPlUsd: 69,
      createdAt: "2025-06-15T00:00:00.000Z",
    };

    expect(computeCloseEventCashFlowUsd(trade, closeEvent)).toBe(-28);

    const summary = summarizeOptionsCashFlowUsd([trade]);
    expect(summary.optionOpenCashFlowUsd).toBe(97);
    expect(summary.optionNormalCloseCashFlowUsd).toBe(-28);
    expect(summary.netOptionsCashFlowUsd).toBe(69);
  });

  it("Test 3: open debit option decreases cash by premium plus fees", () => {
    const trade = debitTrade();
    expect(computeOptionOpenCashFlowUsd(trade)).toBe(-103);

    const summary = summarizeOptionsCashFlowUsd([trade]);
    expect(summary.netOptionsCashFlowUsd).toBe(-103);
  });

  it("Test 4: close debit option net cash impact equals realized P/L", () => {
    const trade = debitTrade({
      status: "closed",
      closeDate: "2025-06-15",
      closeMethod: "normal",
      closePremiumUsd: 175,
      closeFeesUsd: 3,
      realizedPlUsd: 69,
    });

    const closeEvent = {
      id: "close-1",
      closeDate: "2025-06-15",
      contractsClosed: 1,
      closePremiumUsd: 175,
      closeFeesUsd: 3,
      closeMethod: "normal" as const,
      realizedPlUsd: 69,
      createdAt: "2025-06-15T00:00:00.000Z",
    };

    expect(computeCloseEventCashFlowUsd(trade, closeEvent)).toBe(172);

    const summary = summarizeOptionsCashFlowUsd([trade]);
    expect(summary.optionOpenCashFlowUsd).toBe(-103);
    expect(summary.optionNormalCloseCashFlowUsd).toBe(172);
    expect(summary.netOptionsCashFlowUsd).toBe(69);
  });

  it("Test 5: manual P/L close total cash impact equals manual realized P/L", () => {
    const trade = creditTrade({
      status: "closed",
      closeDate: "2025-06-15",
      closeMethod: "manual_pl",
      manualRealizedPlUsd: -1190.59,
      closePremiumUsd: 0,
      closeFeesUsd: 0,
      realizedPlUsd: -1190.59,
      openPremiumUsd: 500,
      openFeesUsd: 5,
    });

    const summary = summarizeOptionsCashFlowUsd([trade]);
    expect(summary.optionOpenCashFlowUsd).toBe(495);
    expect(summary.optionManualCloseCashFlowUsd).toBeCloseTo(-1685.59, 2);
    expect(summary.netOptionsCashFlowUsd).toBeCloseTo(-1190.59, 2);

    const reconciliation = summarizeOptionsReconciliationUsd([trade]);
    expect(reconciliation.totalPremiumReceivedUsd).toBe(500);
    expect(reconciliation.totalOptionFeesUsd).toBe(5);
    expect(reconciliation.totalManualPlAdjustmentsUsd).toBeCloseTo(-1685.59, 2);
    expect(
      reconciliation.totalPremiumReceivedUsd -
        reconciliation.totalCloseDebitsUsd -
        reconciliation.totalOptionFeesUsd +
        reconciliation.totalManualPlAdjustmentsUsd
    ).toBeCloseTo(-1190.59, 2);
  });

  it("open credit trades contribute open cash even before close", () => {
    const openTrade = creditTrade({ status: "open" });
    const closedTrade = creditTrade({
      id: "credit-2",
      status: "closed",
      closeDate: "2025-06-10",
      closeMethod: "normal",
      closePremiumUsd: 10,
      closeFeesUsd: 1,
      realizedPlUsd: 86,
    });

    const summary = summarizeOptionsCashFlowUsd([openTrade, closedTrade]);
    expect(summary.optionOpenCashFlowUsd).toBe(97 + 97);
    expect(summary.netOptionsCashFlowUsd).toBe(97 + 86);
  });
});
