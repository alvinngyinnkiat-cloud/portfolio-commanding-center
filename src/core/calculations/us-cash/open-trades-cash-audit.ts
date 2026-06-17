import type { OptionsTrade } from "@/core/domain/types/options";
import {
  allocateOpenAmountsForContracts,
  getRemainingContracts,
} from "@/core/calculations/options/contract-tracking";
import { calculateOpenOptionMarketValueUsd } from "@/core/calculations/options/net-options-market-value";
import { isDebitStrategy } from "@/core/calculations/options/strategy-kind";

export interface OpenTradeCashRow {
  tradeId: string;
  ticker: string;
  premiumReceivedUsd: number;
  currentValueUsd: number | null;
  cashAlreadyReceivedUsd: number;
}

export interface OpenTradesCashSummary {
  openTradesCount: number;
  premiumReceivedUsd: number;
  currentMarketValueUsd: number | null;
  netOpenCashContributionUsd: number;
}

/** Broker cash received/paid at open for remaining open contracts. */
export function computeRemainingOpenCashFlowUsd(trade: OptionsTrade): number {
  const remaining = getRemainingContracts(trade);
  const allocated = allocateOpenAmountsForContracts(trade, remaining);

  if (isDebitStrategy(trade.strategy)) {
    return -(allocated.openPremiumUsd + allocated.openFeesUsd);
  }
  return allocated.openPremiumUsd - allocated.openFeesUsd;
}

export function buildOpenTradeCashRow(trade: OptionsTrade): OpenTradeCashRow | null {
  if (trade.status !== "open") {
    return null;
  }

  const remaining = getRemainingContracts(trade);
  if (remaining <= 0) {
    return null;
  }

  const allocated = allocateOpenAmountsForContracts(trade, remaining);
  const premiumReceivedUsd = isDebitStrategy(trade.strategy)
    ? 0
    : allocated.openPremiumUsd;

  return {
    tradeId: trade.id,
    ticker: trade.underlying,
    premiumReceivedUsd,
    currentValueUsd: calculateOpenOptionMarketValueUsd(trade),
    cashAlreadyReceivedUsd: computeRemainingOpenCashFlowUsd(trade),
  };
}

export function buildOpenTradesCashRows(
  trades: OptionsTrade[]
): OpenTradeCashRow[] {
  return trades
    .map((trade) => buildOpenTradeCashRow(trade))
    .filter((row): row is OpenTradeCashRow => row != null)
    .sort((a, b) => a.ticker.localeCompare(b.ticker));
}

export function summarizeOpenTradesCash(
  rows: OpenTradeCashRow[]
): OpenTradesCashSummary {
  let premiumReceivedUsd = 0;
  let currentMarketValueUsd = 0;
  let hasMarkedValue = false;
  let netOpenCashContributionUsd = 0;

  for (const row of rows) {
    premiumReceivedUsd += row.premiumReceivedUsd;
    netOpenCashContributionUsd += row.cashAlreadyReceivedUsd;
    if (row.currentValueUsd != null) {
      hasMarkedValue = true;
      currentMarketValueUsd += row.currentValueUsd;
    }
  }

  return {
    openTradesCount: rows.length,
    premiumReceivedUsd,
    currentMarketValueUsd: hasMarkedValue ? currentMarketValueUsd : null,
    netOpenCashContributionUsd,
  };
}
