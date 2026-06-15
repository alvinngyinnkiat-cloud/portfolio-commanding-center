import type { CryptoHolding, CryptoTrade } from "@/core/domain/types";
import { toLocalDateString } from "@/shared/lib/date";
import { calculateHoldingContribution } from "./contribution";

/** One-time migration: synthesize buy trades from legacy holdings-only records. */
export function migrateLegacyCryptoHoldingsToTrades(
  holdings: CryptoHolding[],
  trades: CryptoTrade[]
): CryptoTrade[] {
  if (trades.length > 0) {
    return trades;
  }

  const migrated: CryptoTrade[] = [];
  for (const holding of holdings) {
    const costBasis = calculateHoldingContribution(holding);
    if (costBasis <= 0) continue;

    migrated.push({
      id: `legacy-${holding.id}`,
      date: toLocalDateString(),
      assetName: holding.assetName,
      type: "buy",
      amountSgd: holding.investedSgd,
      feesSgd: holding.feesSgd,
      notes: holding.notes ?? "Migrated from legacy holding",
      createdAt: holding.id,
    });
  }

  return migrated;
}
