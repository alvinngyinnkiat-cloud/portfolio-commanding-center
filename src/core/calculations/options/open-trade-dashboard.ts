import type {
  DashboardBreakevenStatus,
  DashboardDeltaHealth,
  DashboardDteStatus,
  DashboardTradeHealth,
  DashboardTrendHealth,
  DeltaSideHealth,
  IronCondorBreakevenDisplay,
  OpenTradeDashboardMetrics,
  OpenTradeHealthCategory,
  OpenTradeHealthSummary,
  OptionsOpenTradeRow,
  OptionsStrategy,
  OptionsTrade,
} from "@/core/domain/types/options";
import type { ScannerIndicators } from "@/core/domain/types/scanner";
import { scaleMaxRiskForRemaining } from "./contract-tracking";

export type {
  DashboardBreakevenStatus,
  DashboardDteStatus,
  DashboardTradeHealth,
  DashboardTrendDirection,
  DeltaSideHealth,
  DashboardDeltaHealth,
  DashboardTrendHealth,
  IronCondorBreakevenDisplay,
  OpenTradeHealthCategory,
  OpenTradeHealthSummary,
  OpenTradeDashboardMetrics,
} from "@/core/domain/types/options";

const DASHBOARD_STRATEGIES = new Set<OptionsStrategy>([
  "bullPut",
  "bearCall",
  "ironCondor",
]);

export function supportsOpenTradeDashboard(strategy: OptionsStrategy): boolean {
  return DASHBOARD_STRATEGIES.has(strategy);
}

export function deriveDashboardDteStatus(dte: number): DashboardDteStatus {
  if (dte <= 7) return "red";
  if (dte >= 8 && dte <= 14) return "yellow";
  return "green";
}

/** Bull put / sell put spread — positive when price is above breakeven. */
export function calculateBullPutBreakevenDistancePct(
  currentPriceUsd: number,
  breakevenPriceUsd: number
): number {
  if (breakevenPriceUsd === 0) return 0;
  return ((currentPriceUsd - breakevenPriceUsd) / breakevenPriceUsd) * 100;
}

/** Bear call / sell call spread — positive when price is below breakeven. */
export function calculateBearCallBreakevenDistancePct(
  currentPriceUsd: number,
  breakevenPriceUsd: number
): number {
  if (breakevenPriceUsd === 0) return 0;
  return ((breakevenPriceUsd - currentPriceUsd) / breakevenPriceUsd) * 100;
}

/** Iron condor put wing — positive when price is above lower breakeven. */
export function calculateIronCondorPutSideDistancePct(
  currentPriceUsd: number,
  lowerBreakevenUsd: number
): number {
  if (lowerBreakevenUsd === 0) return 0;
  return ((currentPriceUsd - lowerBreakevenUsd) / lowerBreakevenUsd) * 100;
}

/** Iron condor call wing — positive when price is below upper breakeven. */
export function calculateIronCondorCallSideDistancePct(
  currentPriceUsd: number,
  upperBreakevenUsd: number
): number {
  if (upperBreakevenUsd === 0) return 0;
  return ((upperBreakevenUsd - currentPriceUsd) / upperBreakevenUsd) * 100;
}

/** @deprecated Use strategy-specific helpers. Kept for bull put tests. */
export function calculateDashboardBreakevenDistancePct(
  currentPriceUsd: number,
  breakevenPriceUsd: number
): number {
  return calculateBullPutBreakevenDistancePct(currentPriceUsd, breakevenPriceUsd);
}

export function deriveBreakevenDistanceStatus(
  distancePct: number
): DashboardBreakevenStatus {
  if (distancePct > 5) return "green";
  if (distancePct > 0) return "yellow";
  if (distancePct >= -2.5) return "orange";
  return "red";
}

export function deriveTradeHealth(
  dte: number,
  breakevenDistancePct: number | null
): DashboardTradeHealth | null {
  if (breakevenDistancePct == null) return null;

  const threatened = dte <= 7 || breakevenDistancePct < -2.5;
  if (threatened) return "THREATENED";

  const healthy = dte > 14 && breakevenDistancePct > 0;
  if (healthy) return "HEALTHY";

  const review =
    (dte >= 8 && dte <= 14) ||
    (breakevenDistancePct <= 0 && breakevenDistancePct >= -2.5);
  if (review) return "REVIEW";

  return "REVIEW";
}

export const OPEN_TRADE_HEALTH_THREATENED_DTE_MAX = 7;
export const OPEN_TRADE_HEALTH_REVIEW_DTE_MIN = 8;
export const OPEN_TRADE_HEALTH_REVIEW_DTE_MAX = 14;
export const OPEN_TRADE_HEALTH_REVIEW_BE_MAX = -2.5;

/**
 * Open-trades tab health bucket — one category per trade.
 * Priority: Threatened → Review → Healthy.
 */
export function classifyOpenTradeHealthCategory(
  dte: number,
  breakevenDistancePct: number | null
): OpenTradeHealthCategory {
  if (dte <= OPEN_TRADE_HEALTH_THREATENED_DTE_MAX) return "threatened";

  if (
    dte >= OPEN_TRADE_HEALTH_REVIEW_DTE_MIN &&
    dte <= OPEN_TRADE_HEALTH_REVIEW_DTE_MAX &&
    breakevenDistancePct != null &&
    breakevenDistancePct <= OPEN_TRADE_HEALTH_REVIEW_BE_MAX
  ) {
    return "review";
  }

  return "healthy";
}

export function classifyOpenTradeRowHealthCategory(
  row: OptionsOpenTradeRow
): OpenTradeHealthCategory {
  return classifyOpenTradeHealthCategory(
    row.daysToExpiration,
    row.dashboard.breakevenDistancePct
  );
}

export function summarizeOpenTradeHealthCategories(
  rows: OptionsOpenTradeRow[]
): OpenTradeHealthSummary {
  let threatenedCount = 0;
  let reviewCount = 0;
  let healthyCount = 0;

  for (const row of rows) {
    const category = classifyOpenTradeRowHealthCategory(row);
    if (category === "threatened") threatenedCount += 1;
    else if (category === "review") reviewCount += 1;
    else healthyCount += 1;
  }

  return {
    threatenedCount,
    reviewCount,
    healthyCount,
    totalCount: rows.length,
  };
}

export function calculateUnrealizedPlPercent(
  unrealizedPlUsd: number | null,
  maxRiskUsd: number
): number | null {
  if (unrealizedPlUsd == null || maxRiskUsd <= 0) return null;
  return (unrealizedPlUsd / maxRiskUsd) * 100;
}

export function calculateRiskUsedPercent(
  unrealizedPlUsd: number | null,
  maxRiskUsd: number
): number | null {
  if (unrealizedPlUsd == null || maxRiskUsd <= 0) return null;
  return (Math.abs(unrealizedPlUsd) / maxRiskUsd) * 100;
}

export function buildIronCondorBreakevenDisplay(
  currentPriceUsd: number,
  lowerBreakevenUsd: number,
  upperBreakevenUsd: number
): IronCondorBreakevenDisplay {
  const putSideDistancePct = calculateIronCondorPutSideDistancePct(
    currentPriceUsd,
    lowerBreakevenUsd
  );
  const callSideDistancePct = calculateIronCondorCallSideDistancePct(
    currentPriceUsd,
    upperBreakevenUsd
  );
  const closestSide =
    putSideDistancePct <= callSideDistancePct ? "put" : "call";

  return {
    lowerBreakevenUsd,
    upperBreakevenUsd,
    putSideDistancePct,
    callSideDistancePct,
    closestSide,
  };
}

interface BreakevenDashboardResult {
  breakevenPriceUsd: number | null;
  breakevenDistancePct: number | null;
  ironCondorBreakeven: IronCondorBreakevenDisplay | null;
}

function resolveBreakevenDashboard(
  row: Omit<OptionsOpenTradeRow, "dashboard">,
  currentPriceUsd: number | null
): BreakevenDashboardResult {
  const { trade, spreadMetrics, ironCondorMetrics } = row;

  if (currentPriceUsd == null) {
    return {
      breakevenPriceUsd: null,
      breakevenDistancePct: null,
      ironCondorBreakeven: null,
    };
  }

  if (trade.strategy === "bullPut" && spreadMetrics) {
    return {
      breakevenPriceUsd: spreadMetrics.breakevenUsd,
      breakevenDistancePct: calculateBullPutBreakevenDistancePct(
        currentPriceUsd,
        spreadMetrics.breakevenUsd
      ),
      ironCondorBreakeven: null,
    };
  }

  if (trade.strategy === "bearCall" && spreadMetrics) {
    return {
      breakevenPriceUsd: spreadMetrics.breakevenUsd,
      breakevenDistancePct: calculateBearCallBreakevenDistancePct(
        currentPriceUsd,
        spreadMetrics.breakevenUsd
      ),
      ironCondorBreakeven: null,
    };
  }

  if (trade.strategy === "ironCondor" && ironCondorMetrics) {
    const ironCondorBreakeven = buildIronCondorBreakevenDisplay(
      currentPriceUsd,
      ironCondorMetrics.lowerBreakevenUsd,
      ironCondorMetrics.upperBreakevenUsd
    );
    return {
      breakevenPriceUsd: null,
      breakevenDistancePct: Math.min(
        ironCondorBreakeven.putSideDistancePct,
        ironCondorBreakeven.callSideDistancePct
      ),
      ironCondorBreakeven,
    };
  }

  return {
    breakevenPriceUsd: null,
    breakevenDistancePct: null,
    ironCondorBreakeven: null,
  };
}

function derivePutSideRiskDirection(
  deltaChange: number | null
): DeltaSideHealth["riskDirection"] {
  if (deltaChange == null) return null;
  if (deltaChange === 0) return "unchanged";
  return deltaChange < 0 ? "increasing" : "decreasing";
}

function deriveCallSideRiskDirection(
  deltaChange: number | null
): DeltaSideHealth["riskDirection"] {
  if (deltaChange == null) return null;
  if (deltaChange === 0) return "unchanged";
  return deltaChange > 0 ? "increasing" : "decreasing";
}

function buildDeltaSide(
  label: string,
  opening: number | null | undefined,
  current: number | null | undefined,
  side: "put" | "call"
): DeltaSideHealth | null {
  if (opening == null && current == null) return null;
  const openingDelta = opening ?? null;
  const currentDelta = current ?? null;
  const deltaChange =
    openingDelta != null && currentDelta != null
      ? currentDelta - openingDelta
      : null;
  return {
    label,
    openingDelta,
    currentDelta,
    deltaChange,
    riskDirection:
      side === "put"
        ? derivePutSideRiskDirection(deltaChange)
        : deriveCallSideRiskDirection(deltaChange),
  };
}

export function buildDeltaHealth(trade: OptionsTrade): DashboardDeltaHealth | null {
  if (trade.strategy === "bullPut") {
    const putSide = buildDeltaSide(
      "",
      trade.openingShortPutDelta,
      trade.currentShortPutDelta,
      "put"
    );
    return putSide ? { putSide, callSide: null } : null;
  }

  if (trade.strategy === "bearCall") {
    const callSide = buildDeltaSide(
      "",
      trade.openingShortCallDelta,
      trade.currentShortCallDelta,
      "call"
    );
    return callSide ? { putSide: null, callSide } : null;
  }

  if (trade.strategy === "ironCondor") {
    const putSide = buildDeltaSide(
      "PUT SIDE",
      trade.openingPutSideDelta,
      trade.currentPutSideDelta,
      "put"
    );
    const callSide = buildDeltaSide(
      "CALL SIDE",
      trade.openingCallSideDelta,
      trade.currentCallSideDelta,
      "call"
    );
    if (!putSide && !callSide) return null;
    return { putSide, callSide };
  }

  return null;
}

export function buildTrendHealth(
  indicators: ScannerIndicators | null | undefined
): DashboardTrendHealth | null {
  if (!indicators) return null;

  let shortTrend: DashboardTrendHealth["shortTrend"] = null;
  if (indicators.ema20 != null && indicators.ema20Prev != null) {
    const rising = indicators.ema20 > indicators.ema20Prev;
    shortTrend = {
      label: rising ? "Rising EMA20" : "Falling EMA20",
      direction: rising ? "positive" : "negative",
    };
  }

  let longTrend: DashboardTrendHealth["longTrend"] = null;
  if (
    indicators.sma50 != null &&
    indicators.sma200 != null &&
    indicators.sma50Prev != null &&
    indicators.sma200Prev != null
  ) {
    const currentGap = indicators.sma50 - indicators.sma200;
    const previousGap = indicators.sma50Prev - indicators.sma200Prev;
    const widening = currentGap > previousGap;
    longTrend = {
      label: widening ? "Gap Widening" : "Gap Narrowing",
      direction: widening ? "positive" : "negative",
    };
  }

  if (!shortTrend && !longTrend) return null;
  return { shortTrend, longTrend };
}

export function buildOpenTradeDashboardMetrics(
  row: Omit<OptionsOpenTradeRow, "dashboard">,
  scannerIndicators?: ScannerIndicators | null
): OpenTradeDashboardMetrics {
  const { trade, daysToExpiration, unrealizedPlUsd } = row;
  const supportsDashboard = supportsOpenTradeDashboard(trade.strategy);

  const dteStatus = deriveDashboardDteStatus(daysToExpiration);
  const currentPriceUsd =
    trade.underlyingPriceUsd ?? row.underlyingPrice.priceUsd ?? null;

  const breakeven = supportsDashboard
    ? resolveBreakevenDashboard(row, currentPriceUsd)
    : {
        breakevenPriceUsd: null,
        breakevenDistancePct: null,
        ironCondorBreakeven: null,
      };

  const breakevenStatus =
    breakeven.breakevenDistancePct != null
      ? deriveBreakevenDistanceStatus(breakeven.breakevenDistancePct)
      : null;

  const tradeHealth = supportsDashboard
    ? deriveTradeHealth(daysToExpiration, breakeven.breakevenDistancePct)
    : null;

  const maxRiskUsd = scaleMaxRiskForRemaining(trade);
  const unrealizedPlPct = calculateUnrealizedPlPercent(
    unrealizedPlUsd,
    maxRiskUsd
  );
  const riskUsedPct = calculateRiskUsedPercent(unrealizedPlUsd, maxRiskUsd);

  const entryCreditUsd = supportsDashboard
    ? trade.openPremiumUsd - trade.openFeesUsd
    : null;

  return {
    dte: daysToExpiration,
    dteStatus,
    currentPriceUsd,
    breakevenPriceUsd: breakeven.breakevenPriceUsd,
    breakevenDistancePct: breakeven.breakevenDistancePct,
    breakevenStatus,
    ironCondorBreakeven: breakeven.ironCondorBreakeven,
    tradeHealth,
    unrealizedPlUsd,
    unrealizedPlPct,
    maxRiskUsd,
    riskUsedPct,
    deltaHealth: supportsDashboard ? buildDeltaHealth(trade) : null,
    trendHealth: buildTrendHealth(scannerIndicators),
    entryCreditUsd,
    supportsDashboard,
  };
}
