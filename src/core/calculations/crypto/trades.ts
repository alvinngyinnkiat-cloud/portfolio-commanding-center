import type { CryptoHolding, CryptoTrade } from "@/core/domain/types";
import { coerceNumber } from "@/shared/lib/coerce-number";
import { generateId } from "@/core/database/local/local-storage";
import {
  calculateHoldingContribution,
  normalizeFeesSgd,
} from "./contribution";

export function normalizeCryptoAssetName(assetName: string): string {
  return assetName.trim().toUpperCase();
}

/** Crypto Cash = Contribution − buy amounts + sell proceeds (fees are display-only). */
export function calculateAvailableTradingCashFromTrades(
  totalCryptoCashContributed: number,
  trades: CryptoTrade[]
): number {
  let cash = coerceNumber(totalCryptoCashContributed);
  for (const trade of trades) {
    if (trade.type === "buy") {
      cash -= trade.amountSgd;
    } else {
      cash += trade.amountSgd;
    }
  }
  return cash;
}

/** Rebuild cost basis from trades; holdings current value is manual source of truth. */
export function rebuildHoldingsFromTrades(
  trades: CryptoTrade[],
  existingHoldings: CryptoHolding[]
): CryptoHolding[] {
  const holdingByAsset = new Map(
    existingHoldings.map((holding) => [
      normalizeCryptoAssetName(holding.assetName),
      holding,
    ])
  );

  const costByAsset = new Map<
    string,
    { investedSgd: number; feesSgd: number; assetName: string }
  >();

  const sortedTrades = [...trades].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return (a.createdAt ?? a.id).localeCompare(b.createdAt ?? b.id);
  });

  for (const trade of sortedTrades) {
    const key = normalizeCryptoAssetName(trade.assetName);
    const state = costByAsset.get(key) ?? {
      investedSgd: 0,
      feesSgd: 0,
      assetName: trade.assetName.trim(),
    };
    const fees = normalizeFeesSgd(trade.feesSgd);

    if (trade.type === "buy") {
      state.investedSgd += trade.amountSgd;
      state.feesSgd += fees;
    } else {
      state.investedSgd = Math.max(0, state.investedSgd - trade.amountSgd);
    }

    costByAsset.set(key, state);
  }

  const rebuilt: CryptoHolding[] = [];

  for (const [key, state] of costByAsset) {
    const costBasis = state.investedSgd;
    const existing = holdingByAsset.get(key);
    const currentValueSgd = coerceNumber(existing?.currentValueSgd ?? 0);

    // Skip only when the user explicitly closed a persisted holding (both zero).
    // Assets with trade history but no holdings row are materialized so valuations can be restored.
    if (existing && currentValueSgd <= 0 && costBasis <= 0) {
      continue;
    }

    rebuilt.push({
      id: existing?.id ?? generateId(),
      assetName: existing?.assetName ?? state.assetName,
      investedSgd: state.investedSgd,
      feesSgd: state.feesSgd > 0 ? state.feesSgd : undefined,
      currentValueSgd,
      notes: existing?.notes,
    });
  }

  for (const holding of existingHoldings) {
    const key = normalizeCryptoAssetName(holding.assetName);
    if (costByAsset.has(key)) continue;
    // Orphan holding with manual value — keep while user marks it open (> 0).
    if (coerceNumber(holding.currentValueSgd) > 0) {
      rebuilt.push({
        ...holding,
        investedSgd: 0,
        feesSgd: undefined,
      });
    }
  }

  return rebuilt;
}

export function isCryptoHoldingOpen(holding: CryptoHolding): boolean {
  return coerceNumber(holding.currentValueSgd) > 0;
}

export function findHoldingCostBasis(
  holdings: CryptoHolding[],
  assetName: string
): number {
  const key = normalizeCryptoAssetName(assetName);
  const holding = holdings.find(
    (row) => normalizeCryptoAssetName(row.assetName) === key
  );
  return holding ? calculateHoldingContribution(holding) : 0;
}

export function findHoldingCurrentValue(
  holdings: CryptoHolding[],
  assetName: string
): number {
  const key = normalizeCryptoAssetName(assetName);
  const holding = holdings.find(
    (row) => normalizeCryptoAssetName(row.assetName) === key
  );
  return holding ? coerceNumber(holding.currentValueSgd) : 0;
}
