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

/** Completed SELL CALL vertical spread cycles for trade history. */
export function buildCompletedIncomeCyclesForTicker(
  ticker: string,
  openRows: OptionsOpenTradeRow[],
  closedRows: OptionsClosedTradeRow[]
): IncomeCycleRow[] {
  const normalized = normalizeTicker(ticker);

  const allCycles = [
    ...openRows
      .filter(
        (row) =>
          normalizeTicker(row.trade.underlying) === normalized &&
          isSellCallIncomeStrategy(row.trade.strategy)
      )
      .map((row) => row.trade),
    ...closedRows
      .filter(
        (row) =>
          normalizeTicker(row.trade.underlying) === normalized &&
          isSellCallIncomeStrategy(row.trade.strategy)
      )
      .map((row) => row.trade),
  ].sort((a, b) => a.openDate.localeCompare(b.openDate));

  const cycleNumberByTradeId = new Map(
    allCycles.map((trade, index) => [trade.id, index + 1])
  );

  return closedRows
    .filter(
      (row) =>
        normalizeTicker(row.trade.underlying) === normalized &&
        isSellCallIncomeStrategy(row.trade.strategy)
    )
    .map((row) => ({
      cycleNumber: cycleNumberByTradeId.get(row.trade.id) ?? 0,
      tradeId: row.trade.id,
      openDate: row.trade.openDate,
      closeDate: row.trade.closeDate ?? row.trade.openDate,
      finalRealizedPlUsd: row.trade.realizedPlUsd ?? 0,
      status: "completed" as const,
    }))
    .sort((a, b) => b.closeDate.localeCompare(a.closeDate));
}

export function sumLifetimeIncomeUsd(cycles: IncomeCycleRow[]): number {
  return cycles.reduce((sum, cycle) => sum + cycle.finalRealizedPlUsd, 0);
}

export function sumMonthlyIncomeUsd(
  cycles: IncomeCycleRow[],
  asOf: Date = new Date()
): number {
  return cycles
    .filter((cycle) => isCurrentMonth(cycle.closeDate, asOf))
    .reduce((sum, cycle) => sum + cycle.finalRealizedPlUsd, 0);
}

export function calculateRecoveryPct(
  lifetimeIncomeUsd: number,
  foundationMaxRiskUsd: number
): number | null {
  if (foundationMaxRiskUsd <= 0) return null;
  return (lifetimeIncomeUsd / foundationMaxRiskUsd) * 100;
}
