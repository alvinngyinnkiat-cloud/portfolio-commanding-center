import type { StockMarket, StockTransaction } from "@/core/domain/types";

/** Cash-flow aggregates from stock ledger transactions — inputs for Shared US Cash Engine. */
export interface MarketTradingCashFlow {
  netBuySpend: number;
  sellProceeds: number;
  dividends: number;
  fees: number;
}

export interface MarketTradingCashSummary {
  us: MarketTradingCashFlow;
  sg: MarketTradingCashFlow;
}

function buyCashEffect(transaction: StockTransaction): number {
  /** US Buy Cash Effect = -(buy amount + fees) — stored as positive spend. */
  return transaction.grossAmount + transaction.fees;
}

function sellCashEffect(transaction: StockTransaction): number {
  /** US Sell Cash Effect = +(sell proceeds − fees). Never use holdings realisedPL. */
  return transaction.grossAmount - transaction.fees;
}

function standaloneFee(transaction: StockTransaction): number {
  return Math.abs(transaction.netAmount) || transaction.fees;
}

/** Sum buy spend, sell proceeds (gross − fees), dividends, and standalone fees for one market. */
export function summarizeMarketTradingCashFlow(
  transactions: StockTransaction[],
  market: StockMarket
): MarketTradingCashFlow {
  const flow: MarketTradingCashFlow = {
    netBuySpend: 0,
    sellProceeds: 0,
    dividends: 0,
    fees: 0,
  };

  for (const tx of transactions) {
    if (tx.market !== market) continue;

    switch (tx.transactionType) {
      case "buy":
        flow.netBuySpend += buyCashEffect(tx);
        break;
      case "sell":
        flow.sellProceeds += sellCashEffect(tx);
        break;
      case "dividend":
        flow.dividends += tx.netAmount;
        break;
      case "fee":
        flow.fees += standaloneFee(tx);
        break;
      default: {
        const _exhaustive: never = tx.transactionType;
        return _exhaustive;
      }
    }
  }

  return flow;
}

export function summarizeTradingCashFlows(
  transactions: StockTransaction[]
): MarketTradingCashSummary {
  return {
    us: summarizeMarketTradingCashFlow(transactions, "US"),
    sg: summarizeMarketTradingCashFlow(transactions, "SG"),
  };
}

/**
 * @deprecated Legacy SG formula — use calculateSgAvailableCashSgd for full ledger flows.
 */
export function calculateAvailableTradingCash(
  netStockCashContributed: number,
  stockContribution: number
): number {
  return netStockCashContributed - stockContribution;
}

/**
 * SG Available Cash (SGD) — mirrors US ledger flows; no options P/L.
 *
 * SG net stock cash contributed
 * − SG buy spend + SG sell proceeds + SG dividends − SG standalone fees
 */
export function calculateSgAvailableCashSgd(
  sgNetStockCashContributedSgd: number,
  stockTransactions: StockTransaction[]
): number {
  const flow = summarizeMarketTradingCashFlow(stockTransactions, "SG");
  return (
    sgNetStockCashContributedSgd -
    flow.netBuySpend +
    flow.sellProceeds +
    flow.dividends -
    flow.fees
  );
}
