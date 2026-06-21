import type {
  DashboardBreakevenStatus,
  DashboardDeltaHealth,
  DashboardDteStatus,
  DashboardTradeHealth,
  DashboardTrendDirection,
  DashboardTrendHealth,
  DeltaSideHealth,
  OpenTradeDashboardMetrics,
  OptionsIronCondorMetrics,
  OptionsOpenTradeRow,
  OptionsStrategy,
  OptionsTrade,
  OptionsVerticalSpreadMetrics,
} from "@/core/domain/types/options";
import type { ScannerIndicators } from "@/core/domain/types/scanner";
import { scaleMaxRiskForRemaining } from "./contract-tracking";
import { resolveBreakevenDifference } from "./open-trade-display";

export type {
  DashboardBreakevenStatus,
  DashboardDteStatus,
  DashboardTradeHealth,
  DashboardTrendDirection,
  DeltaSideHealth,
  DashboardDeltaHealth,
  DashboardTrendHealth,
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

export function calculateDashboardBreakevenDistancePct(
  currentPriceUsd: number,
  breakevenPriceUsd: number
): number {
  if (breakevenPriceUsd === 0) return 0;
  return ((currentPriceUsd - breakevenPriceUsd) / breakevenPriceUsd) * 100;
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

  const threatened =
    dte <= 7 || breakevenDistancePct < -2.5;
  if (threatened) return "THREATENED";

  const healthy = dte > 14 && breakevenDistancePct > 0;
  if (healthy) return "HEALTHY";

  const review =
    (dte >= 8 && dte <= 14) ||
    (breakevenDistancePct <= 0 && breakevenDistancePct >= -2.5);
  if (review) return "REVIEW";

  return "REVIEW";
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

function resolveBreakevenPriceUsd(
  row: Omit<OptionsOpenTradeRow, "dashboard">
): number | null {
  const { trade, spreadMetrics, ironCondorMetrics, tradeEconomics } = row;
  const strategy = trade.strategy;

  if (strategy === "bullPut" || strategy === "bearCall") {
    return spreadMetrics?.breakevenUsd ?? null;
  }
  if (strategy === "ironCondor") {
    const diff = resolveBreakevenDifference(
      strategy,
      row.underlyingPrice.priceUsd,
      spreadMetrics,
      ironCondorMetrics,
      tradeEconomics
    );
    if (!ironCondorMetrics || !diff) {
      return ironCondorMetrics?.lowerBreakevenUsd ?? null;
    }
    return diff.activeSide === "upper"
      ? ironCondorMetrics.upperBreakevenUsd
      : ironCondorMetrics.lowerBreakevenUsd;
  }
  return tradeEconomics?.breakevenUsd ?? null;
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
  const breakevenPriceUsd = supportsDashboard
    ? resolveBreakevenPriceUsd(row)
    : null;

  const breakevenDistancePct =
    currentPriceUsd != null && breakevenPriceUsd != null
      ? calculateDashboardBreakevenDistancePct(
          currentPriceUsd,
          breakevenPriceUsd
        )
      : null;

  const breakevenStatus =
    breakevenDistancePct != null
      ? deriveBreakevenDistanceStatus(breakevenDistancePct)
      : null;

  const tradeHealth = supportsDashboard
    ? deriveTradeHealth(daysToExpiration, breakevenDistancePct)
    : null;

  const maxRiskUsd = scaleMaxRiskForRemaining(trade);
  const unrealizedPlPct = calculateUnrealizedPlPercent(
    unrealizedPlUsd,
    maxRiskUsd
  );
  const riskUsedPct = calculateRiskUsedPercent(unrealizedPlUsd, maxRiskUsd);

  const effectiveTrade = trade;
  const entryCreditUsd = supportsDashboard
    ? effectiveTrade.openPremiumUsd - effectiveTrade.openFeesUsd
    : null;

  return {
    dte: daysToExpiration,
    dteStatus,
    currentPriceUsd,
    breakevenPriceUsd,
    breakevenDistancePct,
    breakevenStatus,
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
