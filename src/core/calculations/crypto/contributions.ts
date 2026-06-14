import type { ContributionTransaction } from "@/core/domain/types";

/** Net crypto cash contributed from deposit/withdrawal transactions (no FX conversion). */
export function calculateTotalCryptoCashContributed(
  contributions: ContributionTransaction[]
): number {
  let total = 0;
  for (const transaction of contributions) {
    if (transaction.category !== "crypto") continue;
    const sign = transaction.type === "deposit" ? 1 : -1;
    total += sign * transaction.amountSgd;
  }
  return total;
}
