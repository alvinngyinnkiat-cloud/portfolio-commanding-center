import type {
  StockCurrency,
  StockInstrumentType,
  StockMarket,
  StockTransaction,
  StockTransactionType,
} from "@/core/domain/types";
import { buildPositionLedgers } from "./holdings";
import { SellExceedsHoldingsError } from "./errors";
import { marketToCurrency, normalizeTicker, positionKey } from "./normalize";

const VALID_MARKETS: StockMarket[] = ["US", "SG"];

export type StockValidationField =
  | "date"
  | "market"
  | "ticker"
  | "assetName"
  | "transactionType"
  | "quantity"
  | "price"
  | "fees"
  | "amount"
  | "currency"
  | "ledger"
  | "instrumentType";

export type StockValidationErrors = Partial<Record<StockValidationField, string>>;

/** Raw form / API input before normalization. */
export interface StockTransactionDraft {
  id?: string;
  date: string;
  market: string;
  ticker: string;
  assetName?: string;
  instrumentType: StockInstrumentType;
  transactionType: StockTransactionType;
  quantity: string;
  price: string;
  fees: string;
  /** Dividend gross cash amount */
  amount: string;
  notes?: string;
}

export interface StockValidationResult {
  valid: boolean;
  errors: StockValidationErrors;
}

function parsePositiveNumber(
  raw: string,
  field: StockValidationField,
  errors: StockValidationErrors,
  label: string
): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") {
    errors[field] = `${label} is required`;
    return null;
  }
  const value = parseFloat(trimmed);
  if (Number.isNaN(value)) {
    errors[field] = `${label} must be a number`;
    return null;
  }
  if (value <= 0) {
    errors[field] = `${label} must be greater than zero`;
    return null;
  }
  return value;
}

function parseNonNegativeRequiredNumber(
  raw: string,
  field: StockValidationField,
  errors: StockValidationErrors,
  label: string
): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") {
    errors[field] = `${label} is required`;
    return null;
  }
  const value = parseFloat(trimmed);
  if (Number.isNaN(value)) {
    errors[field] = `${label} must be a number`;
    return null;
  }
  if (value < 0) {
    errors[field] = `${label} cannot be negative`;
    return null;
  }
  return value;
}

function normalizeInstrumentType(raw: string): StockInstrumentType | null {
  const normalized = raw.trim().toLowerCase();
  if (normalized === "stock" || normalized === "etf") {
    return normalized;
  }
  return null;
}

export function defaultAssetName(
  ticker: string,
  instrumentType: StockInstrumentType
): string {
  const label = instrumentType === "etf" ? "ETF" : "Stock";
  return `${normalizeTicker(ticker)} (${label})`;
}

function parseNonNegativeNumber(
  raw: string,
  field: StockValidationField,
  errors: StockValidationErrors,
  label: string
): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return 0;
  }
  const value = parseFloat(trimmed);
  if (Number.isNaN(value)) {
    errors[field] = `${label} must be a number`;
    return null;
  }
  if (value < 0) {
    errors[field] = `${label} cannot be negative`;
    return null;
  }
  return value;
}

function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
}

export function parseStockMarket(raw: string): StockMarket | null {
  const normalized = raw.trim().toUpperCase();
  if (normalized === "US" || normalized === "SG") {
    return normalized;
  }
  return null;
}

export function assertCurrencyMatchesMarket(
  market: StockMarket,
  currency: StockCurrency
): boolean {
  return currency === marketToCurrency(market);
}

/** Build gross/net amounts from validated draft fields. */
export function computeTransactionAmounts(
  transactionType: StockTransactionType,
  quantity: number,
  price: number,
  fees: number,
  amount: number
): { grossAmount: number; fees: number; netAmount: number; quantity: number; price: number } {
  switch (transactionType) {
    case "buy": {
      const grossAmount = quantity * price;
      return {
        quantity,
        price,
        grossAmount,
        fees,
        netAmount: -(grossAmount + fees),
      };
    }
    case "sell": {
      const grossAmount = quantity * price;
      return {
        quantity,
        price,
        grossAmount,
        fees,
        netAmount: grossAmount - fees,
      };
    }
    case "dividend":
      return {
        quantity: 0,
        price: 0,
        grossAmount: amount,
        fees,
        netAmount: amount - fees,
      };
    case "fee":
      return {
        quantity: 0,
        price: 0,
        grossAmount: 0,
        fees: amount,
        netAmount: -amount,
      };
    default: {
      const _exhaustive: never = transactionType;
      return _exhaustive;
    }
  }
}

export function validateStockTransactionDraft(
  draft: StockTransactionDraft
): StockValidationResult {
  const errors: StockValidationErrors = {};

  if (!draft.date.trim()) {
    errors.date = "Transaction date is required";
  } else if (!isValidDateString(draft.date.trim())) {
    errors.date = "Transaction date must be YYYY-MM-DD";
  }

  const market = parseStockMarket(draft.market);
  if (!market) {
    errors.market = "Market must be US or SG";
  }

  const ticker = normalizeTicker(draft.ticker);
  if (!ticker) {
    errors.ticker = "Ticker is required";
  }

  const instrumentType = normalizeInstrumentType(draft.instrumentType);
  if (!instrumentType) {
    errors.instrumentType = "Instrument type must be Stock or ETF";
  }

  const fees = parseNonNegativeNumber(draft.fees, "fees", errors, "Fees");
  if (fees === null) {
    return { valid: false, errors };
  }

  let quantity = 0;
  let price = 0;
  let amount = 0;

  if (draft.transactionType === "buy" || draft.transactionType === "sell") {
    const parsedQty = parsePositiveNumber(
      draft.quantity,
      "quantity",
      errors,
      "Quantity"
    );
    const parsedPrice = parseNonNegativeRequiredNumber(
      draft.price,
      "price",
      errors,
      "Price"
    );
    if (parsedQty != null) quantity = parsedQty;
    if (parsedPrice != null) price = parsedPrice;
  } else if (draft.transactionType === "dividend") {
    const parsedAmount = parsePositiveNumber(
      draft.amount,
      "amount",
      errors,
      "Dividend amount"
    );
    if (parsedAmount != null) amount = parsedAmount;
  } else if (draft.transactionType === "fee") {
    const parsedAmount = parsePositiveNumber(
      draft.amount,
      "amount",
      errors,
      "Fee amount"
    );
    if (parsedAmount != null) amount = parsedAmount;
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  if (!market || !ticker || !instrumentType) {
    return { valid: false, errors };
  }

  const currency = marketToCurrency(market);
  if (!assertCurrencyMatchesMarket(market, currency)) {
    errors.currency = "Currency must match market (US → USD, SG → SGD)";
    return { valid: false, errors };
  }

  return { valid: true, errors: {} };
}

export function buildStockTransactionFromDraft(
  draft: StockTransactionDraft,
  createdAt: string,
  id: string
): StockTransaction | null {
  const validation = validateStockTransactionDraft(draft);
  if (!validation.valid) return null;

  const market = parseStockMarket(draft.market)!;
  const ticker = normalizeTicker(draft.ticker);
  const instrumentType = normalizeInstrumentType(draft.instrumentType)!;
  const fees = parseFloat(draft.fees.trim() || "0") || 0;
  const assetName =
    draft.assetName?.trim() || defaultAssetName(ticker, instrumentType);

  let quantity = 0;
  let price = 0;
  let amount = 0;

  if (draft.transactionType === "buy" || draft.transactionType === "sell") {
    quantity = parseFloat(draft.quantity);
    price = parseFloat(draft.price);
  } else {
    amount = parseFloat(draft.amount);
  }

  const amounts = computeTransactionAmounts(
    draft.transactionType,
    quantity,
    price,
    fees,
    amount
  );

  return {
    id,
    date: draft.date.trim(),
    market,
    ticker,
    assetName,
    instrumentType,
    transactionType: draft.transactionType,
    quantity: amounts.quantity,
    price: amounts.price,
    grossAmount: amounts.grossAmount,
    fees: amounts.fees,
    netAmount: amounts.netAmount,
    currency: marketToCurrency(market),
    notes: draft.notes?.trim() || undefined,
    createdAt,
  };
}

function validateTransactionCurrencies(
  transactions: StockTransaction[]
): StockValidationResult | null {
  for (const tx of transactions) {
    if (!assertCurrencyMatchesMarket(tx.market, tx.currency)) {
      return {
        valid: false,
        errors: {
          currency: "Currency must match market (US → USD, SG → SGD)",
        },
      };
    }
  }
  return null;
}

function sellExceedsHoldingsResult(
  error: SellExceedsHoldingsError
): StockValidationResult {
  return {
    valid: false,
    errors: {
      ledger: error.message,
      quantity: `Cannot sell more shares than owned (${error.availableQuantity} available)`,
    },
  };
}

/**
 * Edit upsert candidate set: drop the original row, then apply the edited row.
 * Chronological replay order is handled separately by validation mode.
 */
export function buildCandidateTransactionSet(
  existingTransactions: StockTransaction[],
  editedTransaction: StockTransaction,
  editId: string
): StockTransaction[] {
  const withoutOriginal = existingTransactions.filter((tx) => tx.id !== editId);
  return [...withoutOriginal, editedTransaction];
}

/**
 * Final net share count per ticker after all buys/sells.
 * Used for buy/dividend/fee upserts so date-only buy edits do not replay sell checks.
 */
export function validateFinalNetQuantities(
  transactions: StockTransaction[]
): StockValidationResult {
  const currencyError = validateTransactionCurrencies(transactions);
  if (currencyError) return currencyError;

  const netQuantity = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.transactionType !== "buy" && tx.transactionType !== "sell") {
      continue;
    }
    const key = positionKey(tx.market, tx.ticker);
    const current = netQuantity.get(key) ?? 0;
    if (tx.transactionType === "buy") {
      netQuantity.set(key, current + tx.quantity);
    } else {
      netQuantity.set(key, current - tx.quantity);
    }
  }

  for (const [key, quantity] of netQuantity) {
    if (quantity < 0) {
      const [market, ticker] = key.split(":");
      const oversold = Math.abs(quantity);
      return {
        valid: false,
        errors: {
          ledger: `Holdings for ${market}:${ticker} would be negative (${oversold} shares oversold)`,
          quantity: `Cannot sell more shares than owned (${Math.max(0, quantity + oversold)} available)`,
        },
      };
    }
  }

  return { valid: true, errors: {} };
}

/** Chronological ledger replay — required for sell upserts. */
export function validateTransactionLedger(
  transactions: StockTransaction[],
  excludeId?: string
): StockValidationResult {
  const filtered = excludeId
    ? transactions.filter((tx) => tx.id !== excludeId)
    : transactions;

  const currencyError = validateTransactionCurrencies(filtered);
  if (currencyError) return currencyError;

  try {
    buildPositionLedgers(filtered, { allowNetFallback: false });
    return { valid: true, errors: {} };
  } catch (error) {
    if (error instanceof SellExceedsHoldingsError) {
      return sellExceedsHoldingsResult(error);
    }
    throw error;
  }
}

export function validateStockTransactionUpsert(
  draft: StockTransactionDraft,
  existingTransactions: StockTransaction[],
  createdAt: string,
  id: string
): StockValidationResult & { transaction?: StockTransaction } {
  const draftResult = validateStockTransactionDraft(draft);
  if (!draftResult.valid) {
    return draftResult;
  }

  const editId = id || draft.id;
  if (!editId) {
    return { valid: false, errors: { ledger: "Unable to build transaction" } };
  }

  const transaction = buildStockTransactionFromDraft(draft, createdAt, editId);
  if (!transaction) {
    return { valid: false, errors: { ledger: "Unable to build transaction" } };
  }

  const candidateSet = buildCandidateTransactionSet(
    existingTransactions,
    transaction,
    editId
  );

  const ledgerResult =
    transaction.transactionType === "sell"
      ? validateTransactionLedger(candidateSet)
      : validateFinalNetQuantities(candidateSet);

  if (!ledgerResult.valid) {
    return ledgerResult;
  }

  return { valid: true, errors: {}, transaction };
}

export function stockTransactionToDraft(
  transaction: StockTransaction
): StockTransactionDraft {
  return {
    id: transaction.id,
    date: transaction.date,
    market: transaction.market,
    ticker: transaction.ticker,
    assetName: transaction.assetName,
    instrumentType: transaction.instrumentType ?? "stock",
    transactionType: transaction.transactionType,
    quantity:
      transaction.transactionType === "buy" ||
      transaction.transactionType === "sell"
        ? String(transaction.quantity)
        : "",
    price:
      transaction.transactionType === "buy" ||
      transaction.transactionType === "sell"
        ? String(transaction.price)
        : "",
    fees: String(transaction.fees),
    amount:
      transaction.transactionType === "dividend"
        ? String(transaction.grossAmount)
        : transaction.transactionType === "fee"
          ? String(transaction.fees)
          : "",
    notes: transaction.notes ?? "",
  };
}
