import type { CryptoHolding, CryptoTrade } from "@/core/domain/types";
import { calculateHoldingContribution } from "./contribution";

/** Stable sentinel when legacy holdings have no original transaction date. */
export const LEGACY_CRYPTO_TRADE_DATE = "1970-01-01";

export function hasLegacyCryptoHoldingsToMigrate(
  holdings: CryptoHolding[],
  trades: CryptoTrade[],
  legacyMigrationComplete: boolean
): boolean {
  if (legacyMigrationComplete || trades.length > 0) {
    return false;
  }

  return holdings.some(
    (holding) => calculateHoldingContribution(holding) > 0
  );
}

/** One-time migration: synthesize buy trades from legacy holdings-only records. */
export function migrateLegacyCryptoHoldingsToTrades(
  holdings: CryptoHolding[],
  trades: CryptoTrade[],
  legacyMigrationComplete = false
): CryptoTrade[] {
  if (!hasLegacyCryptoHoldingsToMigrate(holdings, trades, legacyMigrationComplete)) {
    return trades;
  }

  const migrated: CryptoTrade[] = [];
  for (const holding of holdings) {
    const costBasis = calculateHoldingContribution(holding);
    if (costBasis <= 0) continue;

    migrated.push({
      id: `legacy-${holding.id}`,
      date: LEGACY_CRYPTO_TRADE_DATE,
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
