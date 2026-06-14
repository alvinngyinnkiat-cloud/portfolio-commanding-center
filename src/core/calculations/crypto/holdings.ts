import type {
  CryptoHolding,
  CryptoHoldingCategory,
  CryptoHoldingRow,
} from "@/core/domain/types";
import { calculateHoldingContribution } from "./contribution";

export function getHoldingCategory(rank: number): CryptoHoldingCategory {
  if (rank === 1) return "Top Holding";
  if (rank >= 2 && rank <= 5) return "2nd–5th Holdings";
  if (rank >= 6 && rank <= 10) return "6th–10th Holdings";
  return "Others";
}

export function calculateProfitLossSgd(
  currentValueSgd: number,
  contributionSgd: number
): number {
  return currentValueSgd - contributionSgd;
}

export function calculateProfitLossPercent(
  profitLossSgd: number,
  contributionSgd: number
): number {
  if (contributionSgd <= 0) return 0;
  return (profitLossSgd / contributionSgd) * 100;
}

export function calculatePortfolioPercent(
  currentValueSgd: number,
  cryptoHoldingsValueSgd: number
): number {
  if (cryptoHoldingsValueSgd <= 0) return 0;
  return (currentValueSgd / cryptoHoldingsValueSgd) * 100;
}

/** Sort by current value descending and assign rank, category, and derived fields. */
export function buildCryptoHoldingRows(
  holdings: CryptoHolding[]
): CryptoHoldingRow[] {
  const cryptoHoldingsValueSgd = holdings.reduce(
    (sum, h) => sum + h.currentValueSgd,
    0
  );

  const sorted = [...holdings].sort(
    (a, b) => b.currentValueSgd - a.currentValueSgd
  );

  return sorted.map((holding, index) => {
    const rank = index + 1;
    const contributionSgd = calculateHoldingContribution(holding);
    const profitLossSgd = calculateProfitLossSgd(
      holding.currentValueSgd,
      contributionSgd
    );

    return {
      ...holding,
      rank,
      category: getHoldingCategory(rank),
      contributionSgd,
      profitLossSgd,
      profitLossPercent: calculateProfitLossPercent(
        profitLossSgd,
        contributionSgd
      ),
      portfolioPercent: calculatePortfolioPercent(
        holding.currentValueSgd,
        cryptoHoldingsValueSgd
      ),
    };
  });
}
