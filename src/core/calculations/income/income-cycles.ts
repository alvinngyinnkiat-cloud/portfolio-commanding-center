import type { OptionsClosedTradeRow, OptionsOpenTradeRow } from "@/core/domain/types/options";
import type { IncomeCycleRow, IncomeRecoveryPhase } from "@/core/domain/types/income";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";
import { isSellCallIncomeStrategy } from "./strategies";

export function deriveSellCallRecommendation(
  tradeHealth: "HEALTHY" | "REVIEW" | "THREATENED" | null
): "Hold" | "Review" | "Close Soon" | null {
  if (tradeHealth == null) return null;
  if (tradeHealth === "HEALTHY") return "Hold";
  if (tradeHealth === "REVIEW") return "Review";
  return "Close Soon";
}

export function deriveRecoveryPhase(recoveryPct: number | null): IncomeRecoveryPhase | null {
  if (recoveryPct == null || !Number.isFinite(recoveryPct)) return null;
  if (recoveryPct < 50) return "building";
  if (recoveryPct <= 100) return "recovering";
  return "house_money";
}

export function recoveryPhaseLabel(phase: IncomeRecoveryPhase): string {
  switch (phase) {
    case "building":
      return "Building (<50%)";
    case "recovering":
      return "Recovering (50–100%)";
    case "house_money":
      return "House Money (>100%)";
  }
}

function isCurrentMonth(dateIso: string, asOf: Date): boolean {
  const parsed = new Date(`${dateIso}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;
  return (
    parsed.getFullYear() === asOf.getFullYear() &&
    parsed.getMonth() === asOf.getMonth()
  );
}

export function buildIncomeCyclesForTicker(
  ticker: string,
  openRows: OptionsOpenTradeRow[],
  closedRows: OptionsClosedTradeRow[]
): IncomeCycleRow[] {
  const normalized = normalizeTicker(ticker);

  const sellCallTrades = [
    ...openRows
      .filter(
        (row) =>
          normalizeTicker(row.trade.underlying) === normalized &&
          isSellCallIncomeStrategy(row.trade.strategy)
      )
      .map((row) => ({
        trade: row.trade,
        status: "open" as const,
        realizedPlUsd: row.unrealizedPlUsd,
      })),
    ...closedRows
      .filter(
        (row) =>
          normalizeTicker(row.trade.underlying) === normalized &&
          isSellCallIncomeStrategy(row.trade.strategy)
      )
      .map((row) => ({
        trade: row.trade,
        status: "closed" as const,
        realizedPlUsd: row.trade.realizedPlUsd ?? null,
      })),
  ].sort((a, b) => a.trade.openDate.localeCompare(b.trade.openDate));

  const cycles = sellCallTrades.map((entry, index) => ({
    cycleNumber: index + 1,
    tradeId: entry.trade.id,
    openDate: entry.trade.openDate,
    closeDate: entry.status === "closed" ? entry.trade.closeDate ?? null : null,
    premiumReceivedUsd: entry.trade.openPremiumUsd,
    realizedPlUsd: entry.status === "closed" ? entry.realizedPlUsd : null,
    status: entry.status,
  }));

  return cycles.sort((a, b) => b.openDate.localeCompare(a.openDate));
}

export function sumLifetimePremiumUsd(cycles: IncomeCycleRow[]): number {
  return cycles.reduce((sum, cycle) => sum + cycle.premiumReceivedUsd, 0);
}

export function sumMonthlyPremiumUsd(
  cycles: IncomeCycleRow[],
  asOf: Date = new Date()
): number {
  return cycles
    .filter((cycle) => isCurrentMonth(cycle.openDate, asOf))
    .reduce((sum, cycle) => sum + cycle.premiumReceivedUsd, 0);
}

export function calculateRecoveryPct(
  lifetimePremiumUsd: number,
  foundationMaxRiskUsd: number
): number | null {
  if (foundationMaxRiskUsd <= 0) return null;
  return (lifetimePremiumUsd / foundationMaxRiskUsd) * 100;
}
