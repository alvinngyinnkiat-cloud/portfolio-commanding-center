import type { ContributionTransaction } from "@/core/domain/types";
import { normalizeStockUsdAllocationPercent } from "@/core/calculations/contribution-cash";

/** Net stock cash from deposit/withdrawal transactions (US/SG allocation split). */
export interface NetStockCashBreakdown {
  usNetStockCashContributedSgd: number;
  sgNetStockCashContributedSgd: number;
  netStockCashContributedSgd: number;
}

function stockAllocationLegs(amountSgd: number, usdAllocationPercent?: number) {
  const usdPct = normalizeStockUsdAllocationPercent(usdAllocationPercent);
  const usNetStockCashContributedSgd = amountSgd * (usdPct / 100);
  const sgNetStockCashContributedSgd = amountSgd - usNetStockCashContributedSgd;
  return { usNetStockCashContributedSgd, sgNetStockCashContributedSgd };
}

/** US net stock cash = stock deposits/withdrawals allocated to US (SGD keyed). */
export function calculateUsNetStockCashContributedSgd(
  contributions: ContributionTransaction[]
): number {
  let total = 0;
  for (const tx of contributions) {
    if (tx.category !== "stock") continue;
    const sign = tx.type === "deposit" ? 1 : -1;
    const { usNetStockCashContributedSgd } = stockAllocationLegs(
      tx.amountSgd,
      tx.usdAllocationPercent
    );
    total += sign * usNetStockCashContributedSgd;
  }
  return total;
}

/** SG net stock cash = stock deposits/withdrawals allocated to SG (SGD keyed). */
export function calculateSgNetStockCashContributedSgd(
  contributions: ContributionTransaction[]
): number {
  let total = 0;
  for (const tx of contributions) {
    if (tx.category !== "stock") continue;
    const sign = tx.type === "deposit" ? 1 : -1;
    const { sgNetStockCashContributedSgd } = stockAllocationLegs(
      tx.amountSgd,
      tx.usdAllocationPercent
    );
    total += sign * sgNetStockCashContributedSgd;
  }
  return total;
}

/** Net stock cash contributed = stock deposits − stock withdrawals. */
export function calculateNetStockCashContributedSgd(
  contributions: ContributionTransaction[]
): number {
  return (
    calculateUsNetStockCashContributedSgd(contributions) +
    calculateSgNetStockCashContributedSgd(contributions)
  );
}

export function summarizeNetStockCashBreakdown(
  contributions: ContributionTransaction[]
): NetStockCashBreakdown {
  const usNetStockCashContributedSgd =
    calculateUsNetStockCashContributedSgd(contributions);
  const sgNetStockCashContributedSgd =
    calculateSgNetStockCashContributedSgd(contributions);
  return {
    usNetStockCashContributedSgd,
    sgNetStockCashContributedSgd,
    netStockCashContributedSgd:
      usNetStockCashContributedSgd + sgNetStockCashContributedSgd,
  };
}
