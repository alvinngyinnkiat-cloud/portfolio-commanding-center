import { calculateUsNetStockCashContributedUsd } from "@/core/calculations/stocks/contributions";
import { summarizeMarketTradingCashFlow } from "@/core/calculations/stocks/trading-cash";
import type {
  UsAvailableCashResult,
  UsCashLedgerInput,
} from "./types";

/**
 * Shared US Available Cash — single source of truth for Module 2 and Module 5.
 *
 * US Available Cash (USD) =
 *   net USD from FX conversion transactions
 *   − US buy cash effect (buy amount + fees)
 *   + US sell cash effect (sell proceeds − fees)
 *   + dividends
 *   − standalone fees
 *   + full realized options P/L (closed trades — shared trades use full amount)
 */
export function buildUsAvailableCashResult(
  input: UsCashLedgerInput
): UsAvailableCashResult {
  const {
    fxConversions = [],
    stockTransactions,
    realizedOptionsPlUsd = 0,
  } = input;

  const usNetStockCashUsd = calculateUsNetStockCashContributedUsd(fxConversions);
  const flow = summarizeMarketTradingCashFlow(stockTransactions, "US");

  const breakdown = {
    usNetStockCashUsd,
    stockBuySpendUsd: flow.netBuySpend,
    stockSellProceedsUsd: flow.sellProceeds,
    stockDividendsUsd: flow.dividends,
    standaloneFeesUsd: flow.fees,
    realizedOptionsPlUsd,
  };

  const usAvailableCashUsd =
    breakdown.usNetStockCashUsd -
    breakdown.stockBuySpendUsd +
    breakdown.stockSellProceedsUsd +
    breakdown.stockDividendsUsd -
    breakdown.standaloneFeesUsd +
    breakdown.realizedOptionsPlUsd;

  return { usAvailableCashUsd, breakdown };
}

/** USD total for the shared US cash pool. */
export function calculateUsAvailableCashUsd(input: UsCashLedgerInput): number {
  return buildUsAvailableCashResult(input).usAvailableCashUsd;
}
