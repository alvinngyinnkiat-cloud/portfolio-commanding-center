import type { ContributionTransaction } from "@/core/domain/types";
import { parseLocalDate } from "@/shared/lib/date";
import type { ContributionAnalyticsData } from "./types";

function netCategoryContributionSgd(
  contributions: ContributionTransaction[],
  category: ContributionTransaction["category"]
): number {
  return contributions
    .filter((tx) => tx.category === category)
    .reduce((sum, tx) => {
      const sign = tx.type === "deposit" ? 1 : -1;
      return sum + sign * tx.amountSgd;
    }, 0);
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString("en-SG", {
    month: "short",
    year: "numeric",
  });
}

/** SGD-keyed contribution analytics from transaction amounts only. */
export function buildContributionAnalytics(
  contributions: ContributionTransaction[]
): ContributionAnalyticsData {
  const stockContributionSgd = netCategoryContributionSgd(contributions, "stock");
  const cryptoContributionSgd = netCategoryContributionSgd(
    contributions,
    "crypto"
  );
  const totalContributionSgd = stockContributionSgd + cryptoContributionSgd;

  const byMonth = new Map<
    string,
    { stockSgd: number; cryptoSgd: number; totalSgd: number }
  >();

  for (const tx of contributions) {
    if (tx.category !== "stock" && tx.category !== "crypto") continue;
    const month = tx.date.slice(0, 7);
    const entry = byMonth.get(month) ?? {
      stockSgd: 0,
      cryptoSgd: 0,
      totalSgd: 0,
    };
    const sign = tx.type === "deposit" ? 1 : -1;
    const amount = sign * tx.amountSgd;
    if (tx.category === "stock") entry.stockSgd += amount;
    if (tx.category === "crypto") entry.cryptoSgd += amount;
    entry.totalSgd += amount;
    byMonth.set(month, entry);
  }

  const monthlyBars = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, values]) => ({
      month,
      monthLabel: formatMonthLabel(month),
      ...values,
    }));

  let highestMonth: ContributionAnalyticsData["highestMonth"] = null;
  let lowestMonth: ContributionAnalyticsData["lowestMonth"] = null;

  for (const bar of monthlyBars) {
    if (!highestMonth || bar.totalSgd > highestMonth.amountSgd) {
      highestMonth = { month: bar.monthLabel, amountSgd: bar.totalSgd };
    }
    if (!lowestMonth || bar.totalSgd < lowestMonth.amountSgd) {
      lowestMonth = { month: bar.monthLabel, amountSgd: bar.totalSgd };
    }
  }

  const averageMonthlyContributionSgd =
    monthlyBars.length > 0
      ? monthlyBars.reduce((sum, bar) => sum + bar.totalSgd, 0) /
        monthlyBars.length
      : null;

  return {
    totalContributionSgd,
    stockContributionSgd,
    cryptoContributionSgd,
    averageMonthlyContributionSgd,
    highestMonth,
    lowestMonth,
    monthlyBars,
  };
}
