import { describe, expect, it } from "vitest";
import type { OptionsTrade } from "@/core/domain/types/options";
import {
  buildOptionsCashEngineAudit,
  computeCashFromPremiumFormulaUsd,
  detectOptionsCashDoubleCount,
} from "./options-cash-engine-audit";
import { summarizeOptionsReconciliationUsd } from "./options-cash-flow";

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

describe("options-cash-engine-audit", () => {
  it("matches premium formula to engine for normal open and close flows", () => {
    const trades = [
      creditTrade({ status: "open" }),
      creditTrade({
        id: "credit-2",
        status: "closed",
        closeDate: "2025-06-15",
        closeMethod: "normal",
        closePremiumUsd: 25,
        closeFeesUsd: 3,
        realizedPlUsd: 69,
      }),
    ];

    const audit = buildOptionsCashEngineAudit(trades);
    expect(audit.cashFromPremiumFormulaUsd).toBe(200 - 25 - 6 - 3);
    expect(audit.engineNetOptionsCashUsd).toBe(97 + 69);
    expect(audit.engineMatchesPremiumFormula).toBe(true);
    expect(audit.optionCashDoubleCountDetected).toBe(false);
  });

  it("does not flag double count when engine uses premium path only", () => {
    const closed = creditTrade({
      status: "closed",
      closeDate: "2025-06-15",
      closeMethod: "normal",
      closePremiumUsd: 25,
      closeFeesUsd: 3,
      realizedPlUsd: 69,
    });

    const audit = buildOptionsCashEngineAudit([closed]);
    expect(audit.cashFromPremiumFormulaUsd).toBe(69);
    expect(audit.cashFromRealizedPlSumUsd).toBe(69);
    expect(audit.engineNetOptionsCashUsd).toBe(69);
    expect(audit.optionCashDoubleCountDetected).toBe(false);
  });

  it("detects when premium path and realized P/L are both stacked into cash", () => {
    const detection = detectOptionsCashDoubleCount({
      engineNetOptionsCashUsd: 138,
      cashFromPremiumFormulaUsd: 69,
      totalManualPlAdjustmentsUsd: 0,
      cashFromRealizedPlSumUsd: 69,
    });

    expect(detection.detected).toBe(true);
    expect(detection.amountUsd).toBe(69);
  });

  it("computes premium formula from reconciliation totals", () => {
    const closed = creditTrade({
      status: "closed",
      closeDate: "2025-06-15",
      closeMethod: "normal",
      closePremiumUsd: 25,
      closeFeesUsd: 3,
      realizedPlUsd: 69,
    });
    const totals = summarizeOptionsReconciliationUsd([closed]);
    expect(computeCashFromPremiumFormulaUsd(totals)).toBe(69);
  });
});
