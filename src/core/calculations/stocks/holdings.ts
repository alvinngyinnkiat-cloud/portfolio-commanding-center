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
import { normalizeStockTransaction } from "./transaction-normalize";
import { resolveEffectivePrice } from "./price-normalize";

function isSellExceedsHoldingsError(error: unknown): error is SellExceedsHoldingsError {
  return (
    error instanceof SellExceedsHoldingsError ||
    (error instanceof Error && error.name === "SellExceedsHoldingsError")
  );
}

function tryBuildTickerLedger(
  key: string,
  tickerTransactions: StockTransaction[],
  allowNetFallback: boolean
): {
  ledger: PositionLedgerState | null;
  mode: TickerQuantityDiagnostic["replayMode"] | null;
} {
  try {
    return {
      ledger: replayChronologicalLedger(tickerTransactions),
      mode: "chronological",
    };
  } catch (error) {
    if (!isSellExceedsHoldingsError(error)) {
      console.warn(
        `[holdings-rebuild] chronological replay failed for ${key} — trying net quantity fallback`,
        error
      );
    } else if (!allowNetFallback) {
      throw error;
    } else {
      console.warn(
        `[holdings-rebuild] chronological replay failed for ${key} — using net quantity fallback`,
        error instanceof Error ? error.message : error
      );
    }

    if (!allowNetFallback) {
      return { ledger: null, mode: null };
    }

    try {
      return {
        ledger: buildNetQuantityLedgerFallback(tickerTransactions),
        mode: "net-fallback",
      };
    } catch (fallbackError) {
      console.error(
        `[holdings-rebuild] net quantity fallback failed for ${key} — skipping ticker`,
        fallbackError
      );
      return { ledger: null, mode: null };
    }
  }
}

export interface TickerQuantityDiagnostic {
  key: string;
  market: StockTransaction["market"];
  ticker: string;
  buyQty: number;
  sellQty: number;
  netQty: number;
  replayQty: number;
  replayMode: "chronological" | "net-fallback";
}

function groupTransactionsByPosition(
  transactions: StockTransaction[]
): Map<string, StockTransaction[]> {
  const groups = new Map<string, StockTransaction[]>();

  for (const raw of transactions) {
    const transaction = normalizeStockTransaction(raw);
    if (!transaction) continue;

    const key = positionKey(transaction.market, transaction.ticker);
    const existing = groups.get(key) ?? [];
    existing.push(transaction);
    groups.set(key, existing);
  }

  return groups;
}

/** Net buy − sell quantity per ticker (ignores chronological ordering). */
export function computeTickerNetQuantities(
  transactions: StockTransaction[]
): Map<string, { buyQty: number; sellQty: number; netQty: number }> {
  const totals = new Map<string, { buyQty: number; sellQty: number; netQty: number }>();

  for (const raw of transactions) {
    const transaction = normalizeStockTransaction(raw);
    if (!transaction) continue;
    if (transaction.transactionType !== "buy" && transaction.transactionType !== "sell") {
      continue;
    }

    const key = positionKey(transaction.market, transaction.ticker);
    const current = totals.get(key) ?? { buyQty: 0, sellQty: 0, netQty: 0 };
    if (transaction.transactionType === "buy") {
      current.buyQty += transaction.quantity;
    } else {
      current.sellQty += transaction.quantity;
    }
    current.netQty = current.buyQty - current.sellQty;
    totals.set(key, current);
  }

  return totals;
}

function buildNetQuantityLedgerFallback(
  transactions: StockTransaction[]
): PositionLedgerState {
  const normalized = sortStockTransactions(transactions)
    .map((raw) => normalizeStockTransaction(raw))
    .filter((tx): tx is StockTransaction => tx != null);

  if (normalized.length === 0) {
    throw new Error("Cannot build net quantity ledger without valid transactions");
  }

  const first = normalized[0];
  const ledger = createEmptyLedger(first.market, first.ticker, first.assetName);
  const totals = computeTickerNetQuantities(normalized);
  const key = positionKey(first.market, first.ticker);
  const net = totals.get(key) ?? { buyQty: 0, sellQty: 0, netQty: 0 };

  for (const transaction of normalized) {
    switch (transaction.transactionType) {
      case "buy":
        ledger.totalCost += buyCostBasis(transaction);
        break;
      case "dividend":
        ledger.dividendIncome += transaction.netAmount;
        break;
      case "fee":
        ledger.totalCost += feeCostImpact(transaction);
        break;
      default:
        break;
    }
  }

  ledger.quantity = Math.max(0, net.netQty);
  if (ledger.quantity > 0 && net.buyQty > 0) {
    ledger.totalCost *= ledger.quantity / net.buyQty;
  } else if (ledger.quantity <= 0) {
    ledger.totalCost = 0;
  }

  return ledger;
}

function replayChronologicalLedger(
  transactions: StockTransaction[]
): PositionLedgerState {
  const normalized = sortStockTransactions(transactions)
    .map((raw) => normalizeStockTransaction(raw))
    .filter((tx): tx is StockTransaction => tx != null);

  if (normalized.length === 0) {
    throw new Error("Cannot replay ledger without valid transactions");
  }

  const first = normalized[0];
  let ledger = createEmptyLedger(first.market, first.ticker, first.assetName);

  for (const transaction of normalized) {
    ledger.assetName = transaction.assetName;
    ledger = applyTransactionToLedger(ledger, transaction);
  }

  return ledger;
}

/** Console diagnostics: buy / sell / net / replay quantity per ticker. */
export function logHoldingsRebuildDiagnostics(
  transactions: StockTransaction[],
  ledgers: Map<string, PositionLedgerState>,
  modes: Map<string, TickerQuantityDiagnostic["replayMode"]>
): void {
  const netByTicker = computeTickerNetQuantities(transactions);

  console.group("[holdings-rebuild] ticker quantity diagnostics");
  for (const [key, net] of netByTicker) {
    const replayQty = ledgers.get(key)?.quantity ?? 0;
    const [market, ticker] = key.split(":");
    console.log({
      ticker,
      market,
      buyQty: net.buyQty,
      sellQty: net.sellQty,
      netQty: net.netQty,
      replayQty,
      replayMode: modes.get(key) ?? "chronological",
    });
  }
  if (netByTicker.size === 0) {
    console.warn("[holdings-rebuild] no buy/sell transactions found after normalization");
  }
  console.groupEnd();
}

export function buildHoldingsRebuildDiagnostics(
  transactions: StockTransaction[],
  ledgers: Map<string, PositionLedgerState>,
  modes: Map<string, TickerQuantityDiagnostic["replayMode"]>
): TickerQuantityDiagnostic[] {
  const netByTicker = computeTickerNetQuantities(transactions);
  const diagnostics: TickerQuantityDiagnostic[] = [];

  for (const [key, net] of netByTicker) {
    const [market, ticker] = key.split(":");
    diagnostics.push({
      key,
      market: market as StockTransaction["market"],
      ticker,
      buyQty: net.buyQty,
      sellQty: net.sellQty,
      netQty: net.netQty,
      replayQty: ledgers.get(key)?.quantity ?? 0,
      replayMode: modes.get(key) ?? "chronological",
    });
  }

  return diagnostics.sort((a, b) => a.key.localeCompare(b.key));
}

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
  transactions: StockTransaction[],
  options?: { allowNetFallback?: boolean }
): Map<string, PositionLedgerState> {
  const allowNetFallback = options?.allowNetFallback ?? true;
  const ledgers = new Map<string, PositionLedgerState>();
  const replayModes = new Map<string, TickerQuantityDiagnostic["replayMode"]>();
  const groups = groupTransactionsByPosition(transactions);

  for (const [key, tickerTransactions] of groups) {
    const { ledger, mode } = tryBuildTickerLedger(
      key,
      tickerTransactions,
      allowNetFallback
    );
    if (ledger && mode) {
      ledgers.set(key, ledger);
      replayModes.set(key, mode);
    }
  }

  if (allowNetFallback && typeof console !== "undefined" && groups.size > 0) {
    logHoldingsRebuildDiagnostics(transactions, ledgers, replayModes);
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
export function rebuildHoldingsFromTransactions(
  transactions: StockTransaction[],
  prices: StockPrice[],
  fxRate: number | null
): CalculatedHolding[] {
  const positions = calculateAllPositionHoldings(transactions, prices, fxRate);

  if (typeof console !== "undefined") {
    console.group("[holdings-rebuild] rebuilt positions");
    for (const holding of positions) {
      console.log(
        holding.ticker,
        holding.quantity,
        holding.totalCost,
        holding.market
      );
    }
    if (positions.length === 0) {
      console.warn(
        "[holdings-rebuild] no positions rebuilt from",
        transactions.length,
        "transactions"
      );
    }
    console.groupEnd();
  }

  return positions;
}

export function calculateHoldings(
  transactions: StockTransaction[],
  prices: StockPrice[],
  fxRate: number | null
): CalculatedHolding[] {
  return rebuildHoldingsFromTransactions(transactions, prices, fxRate).filter(
    (holding) => holding.quantity > 0
  );
}

/** All positions including fully closed (quantity = 0). */
export function calculateAllPositionHoldings(
  transactions: StockTransaction[],
  prices: StockPrice[],
  fxRate: number | null
): CalculatedHolding[] {
  const ledgers = buildPositionLedgers(transactions);
  const priceLookup = buildPriceLookup(prices);

  return [...ledgers.values()]
    .filter(
      (ledger): ledger is PositionLedgerState =>
        typeof ledger === "object" &&
        ledger != null &&
        Number.isFinite(ledger.quantity)
    )
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

export function filterPositionsByMarket(
  positions: CalculatedHolding[],
  market: "ALL" | CalculatedHolding["market"]
): CalculatedHolding[] {
  if (market === "ALL") return positions;
  return positions.filter((position) => {
    if (position.market === market) return true;
    if (market === "US" && position.currency === "USD") return true;
    if (market === "SG" && position.currency === "SGD") return true;
    return false;
  });
}

export function splitOpenAndClosedPositions(positions: CalculatedHolding[]): {
  open: CalculatedHolding[];
  closed: CalculatedHolding[];
} {
  return {
    open: positions.filter((position) => position.quantity > 0),
    closed: positions.filter((position) => position.quantity <= 0),
  };
}

export interface PositionOverviewSummary {
  openPositionCount: number;
  closedPositionCount: number;
  openMarketValueSgd: number;
  closedRealisedPLSgd: number;
  totalDividendsSgd: number;
  openMarketValueUsd: number;
  closedRealisedPLUsd: number;
  totalDividendsUsd: number;
  openMarketValueSgdMarket: number;
  closedRealisedPLSgdMarket: number;
  totalDividendsSgdMarket: number;
}

function amountToSgd(
  amount: number,
  market: CalculatedHolding["market"],
  fxRate: number | null
): number {
  if (market === "SG") return amount;
  return isValidFxRate(fxRate) && fxRate != null ? usdToSgd(amount, fxRate) : 0;
}

/** Aggregate open/closed counts and P/L metrics for a position list. */
export function summarizePositionOverview(
  positions: CalculatedHolding[],
  fxRate: number | null
): PositionOverviewSummary {
  const open = positions.filter((position) => position.quantity > 0);
  const closed = positions.filter((position) => position.quantity <= 0);

  const openUs = open.filter((position) => position.market === "US");
  const openSg = open.filter((position) => position.market === "SG");
  const closedUs = closed.filter((position) => position.market === "US");
  const closedSg = closed.filter((position) => position.market === "SG");

  const openMarketValueUsd = openUs.reduce(
    (sum, position) => sum + position.marketValue,
    0
  );
  const openMarketValueSgdMarket = openSg.reduce(
    (sum, position) => sum + position.marketValue,
    0
  );
  const closedRealisedPLUsd = closedUs.reduce(
    (sum, position) => sum + position.realisedPL,
    0
  );
  const closedRealisedPLSgdMarket = closedSg.reduce(
    (sum, position) => sum + position.realisedPL,
    0
  );

  const totalDividendsUsd = positions
    .filter((position) => position.market === "US")
    .reduce((sum, position) => sum + position.dividendIncome, 0);
  const totalDividendsSgdMarket = positions
    .filter((position) => position.market === "SG")
    .reduce((sum, position) => sum + position.dividendIncome, 0);

  const openMarketValueSgd =
    openUs.reduce((sum, position) => sum + (position.sgdValue ?? 0), 0) +
    openMarketValueSgdMarket;

  const closedRealisedPLSgd =
    amountToSgd(closedRealisedPLUsd, "US", fxRate) + closedRealisedPLSgdMarket;

  const totalDividendsSgd =
    amountToSgd(totalDividendsUsd, "US", fxRate) + totalDividendsSgdMarket;

  return {
    openPositionCount: open.length,
    closedPositionCount: closed.length,
    openMarketValueSgd,
    closedRealisedPLSgd,
    totalDividendsSgd,
    openMarketValueUsd,
    closedRealisedPLUsd,
    totalDividendsUsd,
    openMarketValueSgdMarket,
    closedRealisedPLSgdMarket,
    totalDividendsSgdMarket,
  };
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
