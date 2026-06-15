import type { CryptoHolding, CryptoTrade, CryptoTradeType } from "@/core/domain/types";
import { normalizeFeesSgd } from "./contribution";
import { findHoldingCostBasis } from "./trades";
import { parseIsoDateString } from "@/shared/lib/date";

export interface CryptoTradeDraft {
  date: string;
  assetName: string;
  type: CryptoTradeType;
  amountSgd: string;
  feesSgd: string;
  notes: string;
}

export interface CryptoHoldingValueDraft {
  currentValueSgd: string;
  notes: string;
}

export interface CryptoTradeValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof CryptoTradeDraft, string>>;
  values?: {
    date: string;
    assetName: string;
    type: CryptoTradeType;
    amountSgd: number;
    feesSgd: number;
    notes?: string;
  };
}

export function cryptoTradeToDraft(trade: CryptoTrade): CryptoTradeDraft {
  return {
    date: parseIsoDateString(trade.date) ?? "",
    assetName: trade.assetName,
    type: trade.type,
    amountSgd: String(trade.amountSgd),
    feesSgd: trade.feesSgd != null ? String(trade.feesSgd) : "",
    notes: trade.notes ?? "",
  };
}

export function validateCryptoTradeDraft(
  draft: CryptoTradeDraft,
  holdings: CryptoHolding[] = []
): CryptoTradeValidationResult {
  const errors: Partial<Record<keyof CryptoTradeDraft, string>> = {};

  const date = parseIsoDateString(draft.date);
  if (!date) {
    errors.date = "Select a valid transaction date";
  }

  const assetName = draft.assetName.trim();
  if (!assetName) {
    errors.assetName = "Asset name is required";
  }

  const type = draft.type;
  if (type !== "buy" && type !== "sell") {
    errors.type = "Transaction type is required";
  }

  const amount = parseFloat(draft.amountSgd);
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.amountSgd = "Amount must be greater than 0";
  }

  const feesRaw = draft.feesSgd.trim() === "" ? 0 : parseFloat(draft.feesSgd);
  if (!Number.isFinite(feesRaw) || feesRaw < 0) {
    errors.feesSgd = "Fees must be ≥ 0";
  }

  if (
    type === "sell" &&
    assetName &&
    Number.isFinite(amount) &&
    amount > 0 &&
    findHoldingCostBasis(holdings, assetName) <= 0
  ) {
    errors.assetName = "No cost basis available for this asset";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    values: {
      date: date!,
      assetName,
      type,
      amountSgd: amount,
      feesSgd: normalizeFeesSgd(feesRaw),
      notes: draft.notes.trim() || undefined,
    },
  };
}

export function validateCryptoHoldingValueDraft(
  draft: CryptoHoldingValueDraft
): {
  valid: boolean;
  errors: Partial<Record<keyof CryptoHoldingValueDraft, string>>;
  values?: { currentValueSgd: number; notes?: string };
} {
  const errors: Partial<Record<keyof CryptoHoldingValueDraft, string>> = {};
  const currentValue = parseFloat(draft.currentValueSgd);
  if (!Number.isFinite(currentValue) || currentValue < 0) {
    errors.currentValueSgd = "Current Value SGD must be ≥ 0";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    values: {
      currentValueSgd: currentValue,
      notes: draft.notes.trim() || undefined,
    },
  };
}
