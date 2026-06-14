import type { CryptoAllocationBucket, CryptoAllocationSettings } from "@/core/domain/types";
import { coerceNumber } from "@/shared/lib/coerce-number";

export const DEFAULT_CRYPTO_ALLOCATION: CryptoAllocationSettings = {
  topHolding: 50,
  secondToFifth: 25,
  sixthToTenth: 15,
  others: 10,
};

const BUCKET_LABELS: Record<keyof CryptoAllocationSettings, string> = {
  topHolding: "Top Holding",
  secondToFifth: "2nd–5th Holdings",
  sixthToTenth: "6th–10th Holdings",
  others: "Others",
};

export function calculateAllocationTotal(
  settings: CryptoAllocationSettings
): number {
  return (
    coerceNumber(settings.topHolding) +
    coerceNumber(settings.secondToFifth) +
    coerceNumber(settings.sixthToTenth) +
    coerceNumber(settings.others)
  );
}

export function isAllocationValid(settings: CryptoAllocationSettings): boolean {
  return calculateAllocationTotal(settings) === 100;
}

export function buildCashDeploymentBuckets(
  availableTradingCashSgd: number,
  settings: CryptoAllocationSettings
): CryptoAllocationBucket[] {
  const cash = coerceNumber(availableTradingCashSgd);
  return (Object.keys(BUCKET_LABELS) as (keyof CryptoAllocationSettings)[]).map(
    (key) => {
      const percent = coerceNumber(settings[key]);
      return {
        label: BUCKET_LABELS[key],
        percent,
        amountSgd: cash * (percent / 100),
      };
    }
  );
}
