import { describe, expect, it } from "vitest";
import type { OptionsTrade } from "@/core/domain/types/options";
import {
  buildOptionCashAuditRow,
  buildOptionCashAuditRows,
  computeOptionAuditCashImpactUsd,
  summarizeOptionCashAudit,
} from "./option-cash-audit";
import { buildUsCashDiagnosticsReport } from "./diagnostics";

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

describe("option-cash-audit", () => {
  it("computes cash impact as premium minus fees and close debit", () => {
    expect(
      computeOptionAuditCashImpactUsd({
        premiumReceivedUsd: 100,
        openFeesUsd: 3,
        closeDebitUsd: 25,
        closeFeesUsd: 2,
      })
    ).toBe(70);
  });

  it("flags mismatch when cash impact differs from realized P/L", () => {
    const row = buildOptionCashAuditRow(
      creditTrade({
        status: "closed",
        closeDate: "2025-06-15",
        closeMethod: "normal",
        closePremiumUsd: 25,
        closeFeesUsd: 2,
        realizedPlUsd: 70,
      })
    );

    expect(row).not.toBeNull();
    expect(row!.cashImpactUsd).toBe(70);
    expect(row!.cashImpactMatchesPl).toBe(true);
  });

  it("summarizes premium vs realized P/L across closed trades", () => {
    const rows = buildOptionCashAuditRows([
      creditTrade({
        id: "a",
        status: "closed",
        closeDate: "2025-06-15",
        closeMethod: "normal",
        closePremiumUsd: 25,
        closeFeesUsd: 2,
        realizedPlUsd: 70,
      }),
      creditTrade({
        id: "b",
        status: "closed",
        closeDate: "2025-07-01",
        openPremiumUsd: 200,
        openFeesUsd: 5,
        closeMethod: "normal",
        closePremiumUsd: 50,
        closeFeesUsd: 3,
        realizedPlUsd: 142,
      }),
    ]);

    const summary = summarizeOptionCashAudit(rows);
    expect(summary.totalPremiumReceivedUsd).toBe(300);
    expect(summary.totalRealizedPlUsd).toBe(212);
    expect(summary.differenceUsd).toBe(88);
  });
});

describe("buildUsCashDiagnosticsReport", () => {
  it("includes expected vs actual cash and option audit rows", () => {
    const closed = creditTrade({
      status: "closed",
      closeDate: "2025-06-15",
      closeMethod: "normal",
      closePremiumUsd: 25,
      closeFeesUsd: 2,
      realizedPlUsd: 70,
    });

    const report = buildUsCashDiagnosticsReport({
      contributions: [],
      fxConversions: [],
      stockTransactions: [],
      fxRate: 1.35,
      optionsTrades: [closed],
    });

    expect(report.expectedUsdCash).toBeCloseTo(report.actualUsdCash, 2);
    expect(report.optionAudit).toHaveLength(1);
    expect(report.openTradesCash).toHaveLength(0);
    expect(report.optionAuditSummary.totalPremiumReceivedUsd).toBe(100);
  });
});
