import type {
  CalculatedHolding,
  PositionLedgerState,
  StockPrice,
  StockTransaction,
} from "@/core/domain/types";
import { usdToSgd } from "@/core/calculations/fx";
import { isValidFxRate } from "@/core/calculations/fx-validation";
import { SellExceedsHoldingsError } from "./errors";
import {
  marketToCurrency,
  normalizeTicker,
  positionKey,
  sortStockTransactions,
} from "./normalize";
import { resolveEffectivePrice } from "./price-normalize";

export function createEmptyLedger(
  market: StockTransaction["market"],
  ticker: string,
  assetName: string
): PositionLedgerState {
  return {
    market,
    ticker,
    assetName,
    currency: marketToCurrency(market),
    quantity: 0,
    totalCost: 0,
    realisedPL: 0,
    dividendIncome: 0,
  };
}

/** Buy cost basis includes gross trade value plus fees. */
function buyCostBasis(transaction: StockTransaction): number {
  return transaction.grossAmount + transaction.fees;
}

/** Fee amount applied to an open position (increases cost basis). */
function feeCostImpact(transaction: StockTransaction): number {
  if (transaction.netAmount !== 0) {
    return Math.abs(transaction.netAmount);
  }
  return transaction.fees;
}

/**
 * Apply one ledger transaction to a single-ticker position using WAC.
 * Transactions must be pre-sorted oldest-first.
 */
export function applyTransactionToLedger(
  ledger: PositionLedgerState,
  transaction: StockTransaction
): PositionLedgerState {
  const next = { ...ledger };

  switch (transaction.transactionType) {
    case "buy": {
      next.quantity += transaction.quantity;
      next.totalCost += buyCostBasis(transaction);
      break;
    }
    case "sell": {
      if (transaction.quantity > next.quantity) {
        throw new SellExceedsHoldingsError(
          next.market,
          next.ticker,
          transaction.quantity,
          next.quantity
        );
      }
      const averageCostBeforeSell =
        next.quantity > 0 ? next.totalCost / next.quantity : 0;
      const costOfSold = averageCostBeforeSell * transaction.quantity;
      next.realisedPL += transaction.netAmount - costOfSold;
      next.totalCost -= costOfSold;
      next.quantity -= transaction.quantity;
      break;
    }
    case "dividend": {
      next.dividendIncome += transaction.netAmount;
      break;
    }
    case "fee": {
      next.totalCost += feeCostImpact(transaction);
      break;
    }
    default: {
      const _exhaustive: never = transaction.transactionType;
      return _exhaustive;
    }
  }

  return next;
}

/** Build per-ticker ledger states from the full transaction history. */
export function buildPositionLedgers(
  transactions: StockTransaction[]
): Map<string, PositionLedgerState> {
  const ledgers = new Map<string, PositionLedgerState>();

  for (const transaction of sortStockTransactions(transactions)) {
    const ticker = normalizeTicker(transaction.ticker);
    const key = positionKey(transaction.market, ticker);
    const existing =
      ledgers.get(key) ??
      createEmptyLedger(transaction.market, ticker, transaction.assetName);

    existing.assetName = transaction.assetName;
    ledgers.set(key, applyTransactionToLedger(existing, transaction));
  }

  return ledgers;
}

function buildPriceLookup(prices: StockPrice[]): Map<string, number> {
  const lookup = new Map<string, number>();
  for (const price of prices) {
    const effectivePrice = resolveEffectivePrice(price);
    if (effectivePrice != null && effectivePrice > 0) {
      lookup.set(positionKey(price.market, price.ticker), effectivePrice);
    }
  }
  return lookup;
}

function ledgerToHolding(
  ledger: PositionLedgerState,
  currentPrice: number | null,
  fxRate: number | null
): CalculatedHolding {
  const averageCost =
    ledger.quantity > 0 ? ledger.totalCost / ledger.quantity : 0;
  const marketValue =
    ledger.quantity > 0 && currentPrice != null
      ? ledger.quantity * currentPrice
      : 0;
  const unrealisedPL =
    currentPrice != null && ledger.quantity > 0
      ? marketValue - ledger.totalCost
      : 0;

  let sgdValue: number | null;
  if (ledger.market === "SG") {
    sgdValue = marketValue;
  } else if (isValidFxRate(fxRate)) {
    sgdValue = usdToSgd(marketValue, fxRate!);
  } else {
    sgdValue = null;
  }

  return {
    market: ledger.market,
    ticker: ledger.ticker,
    assetName: ledger.assetName,
    currency: ledger.currency,
    quantity: ledger.quantity,
    averageCost,
    totalCost: ledger.totalCost,
    currentPrice,
    marketValue,
    unrealisedPL,
    realisedPL: ledger.realisedPL,
    dividendIncome: ledger.dividendIncome,
    sgdValue,
  };
}

/**
 * Derive holdings from transactions + current prices.
 * Holdings are never read from manual position totals.
 */
export function calculateHoldings(
  transactions: StockTransaction[],
  prices: StockPrice[],
  fxRate: number | null
): CalculatedHolding[] {
  const ledgers = buildPositionLedgers(transactions);
  const priceLookup = buildPriceLookup(prices);

  return [...ledgers.values()]
    .filter((ledger) => ledger.quantity > 0)
    .map((ledger) => {
      const key = positionKey(ledger.market, ledger.ticker);
      const currentPrice = priceLookup.get(key) ?? null;
      return ledgerToHolding(ledger, currentPrice, fxRate);
    })
    .sort((a, b) => {
      const marketCmp = a.market.localeCompare(b.market);
      if (marketCmp !== 0) return marketCmp;
      return a.ticker.localeCompare(b.ticker);
    });
}

/** Ledger for one ticker — includes closed positions (quantity may be 0). */
export function calculatePositionLedger(
  transactions: StockTransaction[],
  market: StockTransaction["market"],
  ticker: string
): PositionLedgerState | null {
  const normalized = normalizeTicker(ticker);
  const filtered = transactions.filter(
    (tx) =>
      tx.market === market && normalizeTicker(tx.ticker) === normalized
  );
  if (filtered.length === 0) return null;

  const key = positionKey(market, normalized);
  return buildPositionLedgers(filtered).get(key) ?? null;
}
