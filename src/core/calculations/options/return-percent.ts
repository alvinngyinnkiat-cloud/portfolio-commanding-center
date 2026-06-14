/** Per-trade return on closed risk capital. */
export function calculateTradeReturnPercent(
  realizedPlUsd: number,
  maxRiskUsd: number
): number | null {
  if (!Number.isFinite(realizedPlUsd) || !Number.isFinite(maxRiskUsd) || maxRiskUsd <= 0) {
    return null;
  }
  return (realizedPlUsd / maxRiskUsd) * 100;
}

/** Aggregate return = total realized ÷ total max risk × 100. */
export function calculateAggregateReturnPercent(
  totalRealizedPlUsd: number,
  totalMaxRiskUsd: number
): number {
  if (!Number.isFinite(totalMaxRiskUsd) || totalMaxRiskUsd <= 0) return 0;
  return (totalRealizedPlUsd / totalMaxRiskUsd) * 100;
}
