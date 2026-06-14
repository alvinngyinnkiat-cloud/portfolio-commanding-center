import type { OptionsDteStatus } from "@/core/domain/types/options";

/** DTE > 21 */
export const DTE_NORMAL_MIN = 22;
/** DTE 8–21 */
export const DTE_WATCH_MIN = 8;
/** DTE <= 7 — review and normally close */
export const DTE_ACTION_MAX = 7;

export function deriveDteStatus(daysToExpiration: number): OptionsDteStatus {
  if (daysToExpiration <= DTE_ACTION_MAX) return "ACTION_REQUIRED";
  if (daysToExpiration >= DTE_WATCH_MIN && daysToExpiration < DTE_NORMAL_MIN) {
    return "WATCH";
  }
  return "NORMAL";
}

export function dteStatusSortOrder(status: OptionsDteStatus): number {
  if (status === "ACTION_REQUIRED") return 0;
  if (status === "WATCH") return 1;
  return 2;
}

/** Lowest DTE first — trades requiring attention surface at the top. */
export function compareOpenTradesByDte(
  a: { daysToExpiration: number },
  b: { daysToExpiration: number }
): number {
  return a.daysToExpiration - b.daysToExpiration;
}

/** Newest open date first — transaction history tables show latest entries at the top. */
export function compareOpenTradesByOpenDate(
  a: { trade: { openDate: string; createdAt?: string } },
  b: { trade: { openDate: string; createdAt?: string } }
): number {
  const byDate = b.trade.openDate.localeCompare(a.trade.openDate);
  if (byDate !== 0) return byDate;
  return (b.trade.createdAt ?? "").localeCompare(a.trade.createdAt ?? "");
}

export function summarizeActionRequiredOpenRisk(
  openTrades: Array<{ daysToExpiration: number; maxRiskUsd: number }>
): { tradesRequiringActionCount: number; openRiskRequiringActionUsd: number } {
  let tradesRequiringActionCount = 0;
  let openRiskRequiringActionUsd = 0;

  for (const trade of openTrades) {
    if (deriveDteStatus(trade.daysToExpiration) !== "ACTION_REQUIRED") continue;
    tradesRequiringActionCount += 1;
    openRiskRequiringActionUsd += trade.maxRiskUsd;
  }

  return { tradesRequiringActionCount, openRiskRequiringActionUsd };
}
