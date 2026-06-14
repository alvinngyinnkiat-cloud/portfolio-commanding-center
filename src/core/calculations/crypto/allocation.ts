import type {
  CryptoAllocationBucket,
  CryptoAllocationSettings,
} from "@/core/domain/types";

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
    settings.topHolding +
    settings.secondToFifth +
    settings.sixthToTenth +
    settings.others
  );
}

export function isAllocationValid(settings: CryptoAllocationSettings): boolean {
  return calculateAllocationTotal(settings) === 100;
}

export function buildCashDeploymentBuckets(
  availableTradingCashSgd: number,
  settings: CryptoAllocationSettings
): CryptoAllocationBucket[] {
  return (Object.keys(BUCKET_LABELS) as (keyof CryptoAllocationSettings)[]).map(
    (key) => ({
      label: BUCKET_LABELS[key],
      percent: settings[key],
      amountSgd: availableTradingCashSgd * (settings[key] / 100),
    })
  );
}
