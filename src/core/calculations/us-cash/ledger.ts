import { calculateUsNetStockCashContributedUsd } from "@/core/calculations/stocks/contributions";
import { summarizeMarketTradingCashFlow } from "@/core/calculations/stocks/trading-cash";
import { summarizeOptionsCashFlowUsd } from "./options-cash-flow";
import type {
  UsAvailableCashResult,
  UsCashLedgerInput,
} from "./types";

/**
 * Shared US Available Cash — single source of truth for Module 2 and Module 5.
 *
 * USD Cash =
 *   net USD from FX conversion transactions
 *   − US buy cash effect (buy amount + fees)
 *   + US sell cash effect (sell proceeds − fees)
 *   + dividends
 *   − standalone fees
 *   + option open cash flows (premium received/paid at open)
 *   + option close cash flows (normal debit/credit and manual P/L reconciliation)
 */
export function buildUsAvailableCashResult(
  input: UsCashLedgerInput
): UsAvailableCashResult {
  const {
    fxConversions = [],
    stockTransactions,
    optionsTrades = [],
  } = input;

  const usNetStockCashUsd = calculateUsNetStockCashContributedUsd(fxConversions);
  const flow = summarizeMarketTradingCashFlow(stockTransactions, "US");
  const optionsCash = summarizeOptionsCashFlowUsd(optionsTrades);

  const breakdown = {
    usNetStockCashUsd,
    stockBuySpendUsd: flow.netBuySpend,
    stockSellProceedsUsd: flow.sellProceeds,
    stockDividendsUsd: flow.dividends,
    standaloneFeesUsd: flow.fees,
    optionOpenCashFlowUsd: optionsCash.optionOpenCashFlowUsd,
    optionNormalCloseCashFlowUsd: optionsCash.optionNormalCloseCashFlowUsd,
    optionManualCloseCashFlowUsd: optionsCash.optionManualCloseCashFlowUsd,
    optionCloseCashFlowUsd: optionsCash.optionCloseCashFlowUsd,
    netOptionsCashFlowUsd: optionsCash.netOptionsCashFlowUsd,
  };

  const usAvailableCashUsd =
    breakdown.usNetStockCashUsd -
    breakdown.stockBuySpendUsd +
    breakdown.stockSellProceedsUsd +
    breakdown.stockDividendsUsd -
    breakdown.standaloneFeesUsd +
    breakdown.netOptionsCashFlowUsd;

  return { usAvailableCashUsd, breakdown };
}

/** USD total for the shared US cash pool. */
export function calculateUsAvailableCashUsd(input: UsCashLedgerInput): number {
  return buildUsAvailableCashResult(input).usAvailableCashUsd;
}
