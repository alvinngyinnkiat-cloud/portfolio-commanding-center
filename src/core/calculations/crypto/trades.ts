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

/** Rebuild holdings cost basis from trades while preserving manual valuations. */
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
    if (costBasis <= 0 && (existing?.currentValueSgd ?? 0) <= 0) {
      continue;
    }

    rebuilt.push({
      id: existing?.id ?? generateId(),
      assetName: existing?.assetName ?? state.assetName,
      investedSgd: state.investedSgd,
      feesSgd: state.feesSgd > 0 ? state.feesSgd : undefined,
      currentValueSgd: existing?.currentValueSgd ?? 0,
      notes: existing?.notes,
    });
  }

  for (const holding of existingHoldings) {
    const key = normalizeCryptoAssetName(holding.assetName);
    if (costByAsset.has(key)) continue;
    if (holding.currentValueSgd > 0) {
      rebuilt.push({
        ...holding,
        investedSgd: 0,
        feesSgd: undefined,
      });
    }
  }

  return rebuilt;
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
