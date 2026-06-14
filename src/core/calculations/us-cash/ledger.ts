import { sgdToUsd } from "@/core/calculations/fx";
import { isValidFxRate } from "@/core/calculations/fx-validation";
import { summarizeNetStockCashBreakdown } from "@/core/calculations/stocks/contributions";
import { summarizeMarketTradingCashFlow } from "@/core/calculations/stocks/trading-cash";
import type {
  UsAvailableCashResult,
  UsCashLedgerInput,
} from "./types";

/**
 * Shared US Available Cash — single source of truth for Module 2 and Module 5.
 *
 * US Available Cash (USD) =
 *   US deposits − US withdrawals
 *   − US buy cash effect (buy amount + fees)
 *   + US sell cash effect (sell proceeds − fees)
 *   + dividends
 *   − standalone fees
 *   + full realized options P/L (closed trades — shared trades use full amount)
 *
 * Never add holdings realisedPL separately; sell proceeds already embed sale P/L.
 */
export function buildUsAvailableCashResult(
  input: UsCashLedgerInput
): UsAvailableCashResult {
  const {
    contributions,
    stockTransactions,
    fxRate,
    realizedOptionsPlUsd = 0,
  } = input;

  const zeroBreakdown = {
    usNetStockCashUsd: 0,
    stockBuySpendUsd: 0,
    stockSellProceedsUsd: 0,
    stockDividendsUsd: 0,
    standaloneFeesUsd: 0,
    realizedOptionsPlUsd: 0,
  };

  if (!isValidFxRate(fxRate) || fxRate == null) {
    return { usAvailableCashUsd: 0, breakdown: zeroBreakdown };
  }

  const netCash = summarizeNetStockCashBreakdown(contributions);
  const usNetStockCashUsd = sgdToUsd(
    netCash.usNetStockCashContributedSgd,
    fxRate
  );
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
