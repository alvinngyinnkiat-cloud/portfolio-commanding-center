import { summarizeMarketTradingCashFlow } from "@/core/calculations/stocks/trading-cash";
import { buildFxPerformanceMetrics } from "@/core/calculations/stocks/fx-performance";
import type { FxPerformanceMetrics } from "@/core/calculations/stocks/fx-performance";
import { buildUsAvailableCashResult } from "./ledger";
import { summarizeOptionsReconciliationUsd } from "./options-cash-flow";
import type { UsCashLedgerInput } from "./types";
import type { OptionsReconciliationTotals } from "./options-cash-flow";

export interface UsCashReconciliationReport {
  /** A) Net USD received from FX conversions. */
  fxConversionsUsd: number;
  /** B) US stock buys (amount + fees). */
  stockBuysUsd: number;
  /** B) US stock sells (proceeds − fees). */
  stockSellsUsd: number;
  /** B) US dividends. */
  stockDividendsUsd: number;
  /** Standalone US stock fee transactions. */
  stockStandaloneFeesUsd: number;
  /** C) Options activity buckets. */
  options: OptionsReconciliationTotals;
  /** D) Current USD cash (shared engine). */
  currentUsdCash: number;
  /** E) FX performance — informational only, not in portfolio P/L. */
  fxPerformance: FxPerformanceMetrics;
}

export interface UsCashReconciliationFormulaLine {
  label: string;
  amountUsd: number;
  operator: "+" | "−" | "=";
}

export function buildUsCashReconciliationReport(
  input: UsCashLedgerInput
): UsCashReconciliationReport {
  const result = buildUsAvailableCashResult(input);
  const flow = summarizeMarketTradingCashFlow(input.stockTransactions, "US");
  const options = summarizeOptionsReconciliationUsd(input.optionsTrades ?? []);

  return {
    fxConversionsUsd: result.breakdown.usNetStockCashUsd,
    stockBuysUsd: flow.netBuySpend,
    stockSellsUsd: flow.sellProceeds,
    stockDividendsUsd: flow.dividends,
    stockStandaloneFeesUsd: flow.fees,
    options,
    currentUsdCash: result.usAvailableCashUsd,
    fxPerformance: buildFxPerformanceMetrics(
      input.fxConversions ?? [],
      input.fxRate
    ),
  };
}

/** Recompute USD cash from displayed reconciliation components. */
export function reconcileUsCashFromReport(
  report: UsCashReconciliationReport
): number {
  return (
    report.fxConversionsUsd +
    report.stockSellsUsd +
    report.stockDividendsUsd +
    report.options.totalPremiumReceivedUsd -
    report.stockBuysUsd -
    report.options.totalCloseDebitsUsd -
    report.stockStandaloneFeesUsd -
    report.options.totalOptionFeesUsd +
    report.options.totalManualPlAdjustmentsUsd
  );
}

export function buildUsCashReconciliationFormula(
  report: UsCashReconciliationReport
): UsCashReconciliationFormulaLine[] {
  return [
    { label: "FX Inflows", amountUsd: report.fxConversionsUsd, operator: "+" },
    { label: "Stock Sales", amountUsd: report.stockSellsUsd, operator: "+" },
    { label: "Dividends", amountUsd: report.stockDividendsUsd, operator: "+" },
    {
      label: "Option Premiums",
      amountUsd: report.options.totalPremiumReceivedUsd,
      operator: "+",
    },
    { label: "Stock Buys", amountUsd: report.stockBuysUsd, operator: "−" },
    {
      label: "Close Debits",
      amountUsd: report.options.totalCloseDebitsUsd,
      operator: "−",
    },
    {
      label: "Stock Fees",
      amountUsd: report.stockStandaloneFeesUsd,
      operator: "−",
    },
    {
      label: "Option Fees",
      amountUsd: report.options.totalOptionFeesUsd,
      operator: "−",
    },
    {
      label: "Manual Cash Adjustments",
      amountUsd: report.options.totalManualPlAdjustmentsUsd,
      operator: "+",
    },
    {
      label: "Expected USD Cash",
      amountUsd: reconcileUsCashFromReport(report),
      operator: "=",
    },
  ];
}
