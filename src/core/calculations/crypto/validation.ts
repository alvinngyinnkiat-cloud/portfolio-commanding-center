import { normalizeFeesSgd } from "./contribution";

export interface CryptoHoldingDraft {
  assetName: string;
  investedSgd: string;
  feesSgd: string;
  currentValueSgd: string;
  notes: string;
}

export interface CryptoHoldingValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof CryptoHoldingDraft, string>>;
  values?: {
    assetName: string;
    investedSgd: number;
    feesSgd: number;
    currentValueSgd: number;
    notes?: string;
  };
}

/** @deprecated Legacy holding draft — use validateCryptoTradeDraft for buys/sells. */
export function validateCryptoHoldingDraft(
  draft: CryptoHoldingDraft
): CryptoHoldingValidationResult {
  const errors: Partial<Record<keyof CryptoHoldingDraft, string>> = {};

  const assetName = draft.assetName.trim();
  if (!assetName) {
    errors.assetName = "Asset name is required";
  }

  const invested = parseFloat(draft.investedSgd);
  if (!Number.isFinite(invested) || invested < 0) {
    errors.investedSgd = "Buy amount must be ≥ 0";
  }

  const feesRaw = draft.feesSgd.trim() === "" ? 0 : parseFloat(draft.feesSgd);
  if (!Number.isFinite(feesRaw) || feesRaw < 0) {
    errors.feesSgd = "Fees must be ≥ 0";
  }

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
      assetName,
      investedSgd: invested,
      feesSgd: normalizeFeesSgd(feesRaw),
      currentValueSgd: currentValue,
      notes: draft.notes.trim() || undefined,
    },
  };
}

export function validateAllocationPercent(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

export {
  validateCryptoTradeDraft,
  validateCryptoHoldingValueDraft,
  type CryptoTradeDraft,
  type CryptoHoldingValueDraft,
} from "./trade-validation";
