import type { ContributionTransaction } from "@/core/domain/types";

/** Personal Cash contribution — net capital injected (SGD keyed). */
export function calculatePersonalCashContributionSgd(
  contributions: ContributionTransaction[]
): number {
  let total = 0;
  for (const transaction of contributions) {
    if (transaction.category !== "cash") continue;
    const sign = transaction.type === "deposit" ? 1 : -1;
    total += sign * transaction.amountSgd;
  }
  return total;
}
