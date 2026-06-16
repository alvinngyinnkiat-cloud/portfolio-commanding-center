import type {
  StockCurrency,
  StockInstrumentType,
  StockMarket,
  StockTransaction,
  StockTransactionType,
} from "@/core/domain/types";
import { coerceNumber } from "@/shared/lib/coerce-number";
import { marketToCurrency, normalizeTicker } from "./normalize";

const VALID_TYPES: StockTransactionType[] = ["buy", "sell", "dividend", "fee"];

function normalizeMarket(raw: unknown): StockMarket | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toUpperCase();
  if (normalized === "US" || normalized === "SG") {
    return normalized;
  }
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

/** Coerce persisted stock ledger rows into canonical shape for holdings rebuild. */
export function normalizeStockTransaction(raw: unknown): StockTransaction | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const row = raw as Partial<StockTransaction>;
  if (typeof row.id !== "string" || !row.id.trim()) {
    return null;
  }

  const market = normalizeMarket(row.market);
  const transactionType = normalizeTransactionType(row.transactionType);
  const date = normalizeDate(row.date);
  const ticker = normalizeTicker(typeof row.ticker === "string" ? row.ticker : "");

  if (!market || !transactionType || !date || !ticker) {
    return null;
  }

  const currency = normalizeCurrency(market, row.currency);
  const instrumentType = normalizeInstrumentType(row.instrumentType);
  const quantity = coerceNumber(row.quantity);
  const price = coerceNumber(row.price);
  const grossAmount = coerceNumber(row.grossAmount);
  const fees = coerceNumber(row.fees);
  const netAmount = coerceNumber(row.netAmount);
  const assetName =
    typeof row.assetName === "string" && row.assetName.trim()
      ? row.assetName.trim()
      : `${ticker} (${instrumentType === "etf" ? "ETF" : "Stock"})`;

  return {
    id: row.id.trim(),
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
}

export function normalizeStockTransactions(raw: unknown[]): StockTransaction[] {
  return raw
    .map((row) => normalizeStockTransaction(row))
    .filter((row): row is StockTransaction => row != null);
}
