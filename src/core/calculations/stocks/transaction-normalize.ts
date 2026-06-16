import type {
  StockCurrency,
  StockInstrumentType,
  StockMarket,
  StockTransaction,
  StockTransactionType,
} from "@/core/domain/types";
import { marketToCurrency, normalizeTicker } from "./normalize";
import { resolveTransactionGrossAmount } from "./transaction-amounts";

const VALID_TYPES: StockTransactionType[] = ["buy", "sell", "dividend", "fee"];

/** Parse numbers persisted as JSON strings (legacy exports / form drafts). */
function parseNumericField(raw: unknown, fallback = 0): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return fallback;
    const parsed = parseFloat(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeMarket(
  raw: unknown,
  currency?: unknown
): StockMarket | null {
  if (typeof raw === "string") {
    const normalized = raw.trim().toUpperCase();
    if (normalized === "US" || normalized === "USD") {
      return "US";
    }
    if (normalized === "SG" || normalized === "SGD") {
      return "SG";
    }
  }
  if (currency === "USD") return "US";
  if (currency === "SGD") return "SG";
  return null;
}

function normalizeTransactionType(raw: unknown): StockTransactionType | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toLowerCase();
  if (VALID_TYPES.includes(normalized as StockTransactionType)) {
    return normalized as StockTransactionType;
  }
  return null;
}

function normalizeInstrumentType(raw: unknown): StockInstrumentType {
  if (typeof raw === "string" && raw.trim().toLowerCase() === "etf") {
    return "etf";
  }
  return "stock";
}

function normalizeDate(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const isoPrefix = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  return isoPrefix?.[1] ?? null;
}

function normalizeCurrency(
  market: StockMarket,
  raw: unknown
): StockCurrency {
  if (raw === "USD" || raw === "SGD") {
    return raw;
  }
  return marketToCurrency(market);
}

function normalizeId(raw: unknown): string | null {
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return String(raw);
  }
  return null;
}

function resolveTransactionType(row: Record<string, unknown>): StockTransactionType | null {
  const candidates = [row.transactionType, row.type, row.side];
  for (const candidate of candidates) {
    const normalized = normalizeTransactionType(candidate);
    if (normalized) return normalized;
  }
  return null;
}

/** Legacy exports may store share count under qty / shares instead of quantity. */
function resolveQuantity(row: Record<string, unknown>): number {
  for (const key of ["quantity", "qty", "shares"] as const) {
    const parsed = parseNumericField(row[key], Number.NaN);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

/** Coerce persisted stock ledger rows into canonical shape for holdings rebuild. */
export function normalizeStockTransaction(raw: unknown): StockTransaction | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const row = raw as Record<string, unknown>;
  const id = normalizeId(row.id);
  if (!id) {
    return null;
  }

  const market = normalizeMarket(row.market, row.currency);
  const transactionType = resolveTransactionType(row);
  const date = normalizeDate(row.date);
  const ticker = normalizeTicker(typeof row.ticker === "string" ? row.ticker : "");

  if (!market || !transactionType || !date || !ticker) {
    return null;
  }

  const currency = normalizeCurrency(market, row.currency);
  const instrumentType = normalizeInstrumentType(row.instrumentType);
  const quantity = resolveQuantity(row);
  const price = parseNumericField(row.price);
  let grossAmount = parseNumericField(row.grossAmount);
  const fees = parseNumericField(row.fees);
  let netAmount = parseNumericField(row.netAmount);
  const assetName =
    typeof row.assetName === "string" && row.assetName.trim()
      ? row.assetName.trim()
      : `${ticker} (${instrumentType === "etf" ? "ETF" : "Stock"})`;

  const draft: StockTransaction = {
    id,
    date,
    market,
    ticker,
    assetName,
    instrumentType,
    transactionType,
    quantity,
    price,
    grossAmount,
    fees,
    netAmount,
    currency,
    notes: typeof row.notes === "string" ? row.notes : undefined,
    createdAt:
      typeof row.createdAt === "string" && row.createdAt.trim()
        ? row.createdAt.trim()
        : `${date}T00:00:00.000Z`,
  };

  if (draft.grossAmount <= 0) {
    draft.grossAmount = resolveTransactionGrossAmount(draft);
  }

  if (
    draft.netAmount === 0 &&
    (transactionType === "buy" || transactionType === "sell") &&
    draft.grossAmount > 0
  ) {
    draft.netAmount =
      transactionType === "buy"
        ? -(draft.grossAmount + fees)
        : draft.grossAmount - fees;
  }

  return draft;
}

export function normalizeStockTransactions(raw: unknown[]): StockTransaction[] {
  return raw
    .map((row) => normalizeStockTransaction(row))
    .filter((row): row is StockTransaction => row != null);
}
