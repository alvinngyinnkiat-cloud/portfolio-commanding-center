import type { ContributionTransaction } from "@/core/domain/types";

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

export function calculateTotalContribution(
  contributions: ContributionTransaction[]
): number {
  return (
    calculateStockDeposits(contributions) +
    calculateCryptoDeposits(contributions) -
    calculateWithdrawals(contributions)
  );
}

export function calculateMonthlyContributions(
  contributions: ContributionTransaction[],
  year?: number,
  month?: number
): { month: string; amount: number }[] {
  const filtered = contributions.filter((c) => {
    const d = new Date(c.date);
    if (year && d.getFullYear() !== year) return false;
    if (month && d.getMonth() + 1 !== month) return false;
    return true;
  });

  const byMonth: Record<string, number> = {};
  for (const c of filtered) {
    const d = new Date(c.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const amount = c.type === "deposit" ? c.amountSgd : -c.amountSgd;
    byMonth[key] = (byMonth[key] ?? 0) + amount;
  }

  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, amount }));
}

export function calculateYtdContribution(
  contributions: ContributionTransaction[],
  year: number
): number {
  return contributions
    .filter((c) => new Date(c.date).getFullYear() === year)
    .reduce((sum, c) => {
      return c.type === "deposit" ? sum + c.amountSgd : sum - c.amountSgd;
    }, 0);
}
