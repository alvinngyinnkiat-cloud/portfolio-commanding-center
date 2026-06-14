import type { ContributionTransaction } from "@/core/domain/types";
import { parseLocalDate } from "@/shared/lib/date";
import { getContributionCashImpact, resolveContributionFxRate } from "./contribution-cash";
import { calculateNetStockCashContributedSgd } from "./stocks/contributions";
import { calculateTotalCryptoCashContributed } from "./crypto/contributions";
import { calculatePersonalCashContributionSgd } from "./personal-cash/contributions";

export function calculateStockDeposits(
  contributions: ContributionTransaction[]
): number {
  return contributions
    .filter((c) => c.type === "deposit" && c.category === "stock")
    .reduce((sum, c) => sum + c.amountSgd, 0);
}

export function calculateCryptoDeposits(
  contributions: ContributionTransaction[]
): number {
  return contributions
    .filter((c) => c.type === "deposit" && c.category === "crypto")
    .reduce((sum, c) => sum + c.amountSgd, 0);
}

export function calculateWithdrawals(
  contributions: ContributionTransaction[]
): number {
  return contributions
    .filter((c) => c.type === "withdrawal")
    .reduce((sum, c) => sum + c.amountSgd, 0);
}

/** Net cash contributed across stock + crypto deposit transactions (chart helper). */
export function calculateTotalCashContributed(
  contributions: ContributionTransaction[]
): number {
  return (
    calculateNetStockCashContributedSgd(contributions) +
    calculateTotalCryptoCashContributed(contributions) +
    calculatePersonalCashContributionSgd(contributions)
  );
}

export interface MonthlyCashContribution {
  month: string;
  usdTradingCashSgd: number;
  sgdTradingCashSgd: number;
  cryptoCashSgd: number;
}

export function calculateMonthlyCashContributions(
  contributions: ContributionTransaction[],
  fxRate: number,
  year?: number,
  month?: number
): MonthlyCashContribution[] {
  const filtered = contributions.filter((c) => {
    const d = parseLocalDate(c.date);
    if (year && d.getFullYear() !== year) return false;
    if (month && d.getMonth() + 1 !== month) return false;
    return true;
  });

  const byMonth: Record<string, MonthlyCashContribution> = {};

  for (const c of filtered) {
    const d = parseLocalDate(c.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth[key]) {
      byMonth[key] = {
        month: key,
        usdTradingCashSgd: 0,
        sgdTradingCashSgd: 0,
        cryptoCashSgd: 0,
      };
    }

    const sign = c.type === "deposit" ? 1 : -1;
    const impact = getContributionCashImpact(c, fxRate);
    const resolvedFx = resolveContributionFxRate(c, fxRate);

    byMonth[key].usdTradingCashSgd += sign * impact.usdTradingCashUsd * resolvedFx;
    byMonth[key].sgdTradingCashSgd += sign * impact.sgdTradingCashSgd;
    byMonth[key].cryptoCashSgd += sign * impact.cryptoCashSgd;
  }

  return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
}

export function calculateYtdContribution(
  contributions: ContributionTransaction[],
  year: number
): number {
  return contributions
    .filter((c) => parseLocalDate(c.date).getFullYear() === year)
    .reduce((sum, c) => {
      return c.type === "deposit" ? sum + c.amountSgd : sum - c.amountSgd;
    }, 0);
}
