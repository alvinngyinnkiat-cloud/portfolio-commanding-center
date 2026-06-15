import type { CryptoTrade, CryptoTradeType } from "@/core/domain/types";
import { coerceNumber } from "@/shared/lib/coerce-number";

function normalizeTradeType(raw: unknown): CryptoTradeType | null {
  return raw === "buy" || raw === "sell" ? raw : null;
}

export function normalizeCryptoTrade(raw: unknown): CryptoTrade | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const row = raw as Partial<CryptoTrade>;
  if (typeof row.id !== "string" || !row.id.trim()) {
    return null;
  }

  const type = normalizeTradeType(row.type);
  if (!type) {
    return null;
  }

  return {
    id: row.id,
    date: typeof row.date === "string" ? row.date : "",
    assetName: typeof row.assetName === "string" ? row.assetName : "",
    type,
    amountSgd: coerceNumber(row.amountSgd),
    feesSgd: row.feesSgd != null ? coerceNumber(row.feesSgd) : undefined,
    notes: typeof row.notes === "string" ? row.notes : undefined,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : undefined,
  };
}

export function normalizeCryptoTrades(raw: unknown[]): CryptoTrade[] {
  return raw
    .map((row) => normalizeCryptoTrade(row))
    .filter((row): row is CryptoTrade => row != null);
}
