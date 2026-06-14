import type { CryptoAllocationSettings, CryptoHolding } from "@/core/domain/types";
import { coerceNumber } from "@/shared/lib/coerce-number";
import { DEFAULT_CRYPTO_ALLOCATION } from "./allocation";

export function normalizeCryptoHolding(raw: unknown): CryptoHolding | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const row = raw as Partial<CryptoHolding>;
  if (typeof row.id !== "string" || !row.id.trim()) {
    return null;
  }

  return {
    id: row.id,
    assetName: typeof row.assetName === "string" ? row.assetName : "",
    investedSgd: coerceNumber(row.investedSgd),
    feesSgd: row.feesSgd != null ? coerceNumber(row.feesSgd) : undefined,
    currentValueSgd: coerceNumber(row.currentValueSgd),
    notes: typeof row.notes === "string" ? row.notes : undefined,
  };
}

export function normalizeCryptoHoldings(raw: unknown[]): CryptoHolding[] {
  return raw
    .map((row) => normalizeCryptoHolding(row))
    .filter((row): row is CryptoHolding => row != null);
}

export function normalizeCryptoAllocationSettings(
  raw: Partial<CryptoAllocationSettings> | null | undefined
): CryptoAllocationSettings {
  const source = raw ?? {};
  return {
    topHolding: coerceNumber(
      source.topHolding,
      DEFAULT_CRYPTO_ALLOCATION.topHolding
    ),
    secondToFifth: coerceNumber(
      source.secondToFifth,
      DEFAULT_CRYPTO_ALLOCATION.secondToFifth
    ),
    sixthToTenth: coerceNumber(
      source.sixthToTenth,
      DEFAULT_CRYPTO_ALLOCATION.sixthToTenth
    ),
    others: coerceNumber(source.others, DEFAULT_CRYPTO_ALLOCATION.others),
  };
}
