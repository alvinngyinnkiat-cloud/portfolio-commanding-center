import { describe, expect, it } from "vitest";
import type { OptionsTrade } from "@/core/domain/types/options";
import type { StockTransaction } from "@/core/domain/types";
import {
  buildUsCashReconciliationFormula,
  buildUsCashReconciliationReport,
  reconcileUsCashFromReport,
} from "./reconciliation";
import { summarizeOptionsReconciliationUsd } from "./options-cash-flow";

function fxToUsd(sgd: number, usd: number, id = "fx-1") {
  return {
    id,
    date: "2025-01-01",
    direction: "sgd_to_usd" as const,
    sgdAmount: sgd,
    usdAmount: usd,
    notes: undefined,
    createdAt: "2025-01-01T00:00:00.000Z",
  };
}

function stockTx(
  overrides: Partial<StockTransaction> & Pick<StockTransaction, "transactionType">
): StockTransaction {
  return {
    id: "tx-1",
    date: "2025-01-01",
    market: "US",
    ticker: "NVDA",
    assetName: "NVIDIA",
    transactionType: overrides.transactionType,
    quantity: 0,
    price: 0,
    grossAmount: overrides.grossAmount ?? 0,
    fees: overrides.fees ?? 0,
    netAmount: overrides.netAmount ?? 0,
    currency: "USD",
    createdAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

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

describe("buildUsCashReconciliationReport", () => {
  it("reconciles FX, stock, and options components to current USD cash", () => {
    const openCredit = creditTrade();
    const closedCredit = creditTrade({
      id: "credit-2",
      status: "closed",
      closeDate: "2025-06-15",
      closeMethod: "normal",
      closePremiumUsd: 25,
      closeFeesUsd: 3,
      realizedPlUsd: 69,
    });

    const report = buildUsCashReconciliationReport({
      contributions: [],
      fxConversions: [fxToUsd(1_000, 750)],
      stockTransactions: [
        stockTx({
          id: "buy-1",
          transactionType: "buy",
          grossAmount: 1_000,
          fees: 5,
          netAmount: -1_005,
        }),
        stockTx({
          id: "sell-1",
          transactionType: "sell",
          grossAmount: 600,
          fees: 2,
          netAmount: 598,
        }),
        stockTx({
          id: "div-1",
          transactionType: "dividend",
          grossAmount: 50,
          netAmount: 50,
        }),
      ],
      fxRate: 1.35,
      optionsTrades: [openCredit, closedCredit],
    });

    expect(report.fxConversionsUsd).toBe(750);
    expect(report.stockBuysUsd).toBe(1_005);
    expect(report.stockSellsUsd).toBe(598);
    expect(report.stockDividendsUsd).toBe(50);
    expect(report.options.totalPremiumReceivedUsd).toBe(200);
    expect(report.options.totalCloseDebitsUsd).toBe(25);
    expect(report.options.totalOptionFeesUsd).toBe(9);
    expect(reconcileUsCashFromReport(report)).toBeCloseTo(
      report.currentUsdCash,
      2
    );
    expect(buildUsCashReconciliationFormula(report)).toHaveLength(10);
  });

  it("matches shared USD cash engine for manual P/L closes", () => {
    const manualClose = creditTrade({
      status: "closed",
      closeDate: "2025-06-15",
      closeMethod: "manual_pl",
      manualRealizedPlUsd: -1190.59,
      openPremiumUsd: 500,
      openFeesUsd: 5,
    });

    const report = buildUsCashReconciliationReport({
      contributions: [],
      fxConversions: [],
      stockTransactions: [],
      fxRate: 1.35,
      optionsTrades: [manualClose],
    });

    const options = summarizeOptionsReconciliationUsd([manualClose]);
    expect(options.totalManualPlAdjustmentsUsd).toBeCloseTo(-1685.59, 2);
    expect(reconcileUsCashFromReport(report)).toBeCloseTo(-1190.59, 2);
    expect(report.currentUsdCash).toBeCloseTo(-1190.59, 2);
  });
});
