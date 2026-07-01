import type {
  DashboardDeltaHealth,
  DeltaHealthColor,
  DeltaHealthOverallStatus,
  DeltaHealthTrend,
  DeltaSideHealth,
  OptionsStrategy,
} from "@/core/domain/types/options";
import type { OptionsTrade } from "@/core/domain/types/options";

export type DeltaInterpretationMode = "shortPremium" | "longCall" | "longPut";

const DELTA_EPSILON = 1e-6;

export function deriveDeltaTrend(
  opening: number,
  current: number,
  mode: DeltaInterpretationMode
): DeltaHealthTrend {
  if (mode === "shortPremium") {
    if (current < opening - DELTA_EPSILON) return "improving";
    if (current > opening + DELTA_EPSILON) return "worsening";
    return "stable";
  }

  if (mode === "longCall") {
    if (current > opening + DELTA_EPSILON) return "improving";
    if (current < opening - DELTA_EPSILON) return "worsening";
    return "stable";
  }

  const absOpening = Math.abs(opening);
  const absCurrent = Math.abs(current);
  if (absCurrent > absOpening + DELTA_EPSILON) return "improving";
  if (absCurrent < absOpening - DELTA_EPSILON) return "worsening";
  return "stable";
}

export function deltaTrendColor(trend: DeltaHealthTrend | null): DeltaHealthColor | null {
  if (trend === "improving") return "green";
  if (trend === "stable") return "yellow";
  if (trend === "worsening") return "red";
  return null;
}

export function deltaTrendLabels(
  trend: DeltaHealthTrend | null,
  mode: DeltaInterpretationMode
): { statusLabel: string | null; message: string | null } {
  if (!trend) {
    return { statusLabel: null, message: null };
  }

  const statusLabel =
    trend === "improving"
      ? "Delta Improving"
      : trend === "stable"
        ? "Delta Stable"
        : "Delta Worsening";

  if (mode === "shortPremium") {
    const message =
      trend === "improving"
        ? "Risk Decreasing"
        : trend === "stable"
          ? "Risk Unchanged"
          : "Risk Increasing";
    return { statusLabel, message };
  }

  const message =
    trend === "improving"
      ? "Trade Strengthening"
      : trend === "stable"
        ? "Trade Unchanged"
        : "Trade Weakening";
  return { statusLabel, message };
}

export function deriveIronCondorDeltaOverall(
  putTrend: DeltaHealthTrend | null,
  callTrend: DeltaHealthTrend | null
): {
  overallStatus: DeltaHealthOverallStatus;
  overallLabel: string;
} | null {
  if (!putTrend || !callTrend) return null;

  if (putTrend === "worsening" && callTrend === "worsening") {
    return { overallStatus: "threatened", overallLabel: "Threatened" };
  }
  if (
    (putTrend === "stable" && callTrend === "worsening") ||
    (putTrend === "worsening" && callTrend === "stable")
  ) {
    return { overallStatus: "review", overallLabel: "Review" };
  }
  if (
    (putTrend === "improving" && callTrend === "worsening") ||
    (putTrend === "worsening" && callTrend === "improving")
  ) {
    return { overallStatus: "monitor", overallLabel: "Monitor" };
  }

  return { overallStatus: "healthy", overallLabel: "Healthy" };
}

export function buildDeltaSideHealth(
  label: string,
  opening: number | null | undefined,
  current: number | null | undefined,
  mode: DeltaInterpretationMode
): DeltaSideHealth | null {
  if (opening == null && current == null) return null;

  const openingDelta = opening ?? null;
  const currentDelta = current ?? null;
  const deltaChange =
    openingDelta != null && currentDelta != null
      ? currentDelta - openingDelta
      : null;

  const trend =
    openingDelta != null && currentDelta != null
      ? deriveDeltaTrend(openingDelta, currentDelta, mode)
      : null;

  const { statusLabel, message } = deltaTrendLabels(trend, mode);

  return {
    label,
    openingDelta,
    currentDelta,
    deltaChange,
    trend,
    statusLabel,
    message,
    color: deltaTrendColor(trend),
  };
}

function shortPremiumModeForStrategy(strategy: OptionsStrategy): DeltaInterpretationMode {
  return "shortPremium";
}

export function buildDeltaHealth(trade: OptionsTrade): DashboardDeltaHealth | null {
  if (
    trade.strategy === "bullPut" ||
    trade.strategy === "sellPut"
  ) {
    const putSide = buildDeltaSideHealth(
      "",
      trade.openingShortPutDelta,
      trade.currentShortPutDelta,
      shortPremiumModeForStrategy(trade.strategy)
    );
    return putSide ? { putSide, callSide: null, overallStatus: null, overallLabel: null } : null;
  }

  if (
    trade.strategy === "bearCall" ||
    trade.strategy === "sellCall"
  ) {
    const callSide = buildDeltaSideHealth(
      "",
      trade.openingShortCallDelta,
      trade.currentShortCallDelta,
      shortPremiumModeForStrategy(trade.strategy)
    );
    return callSide ? { putSide: null, callSide, overallStatus: null, overallLabel: null } : null;
  }

  if (trade.strategy === "ironCondor") {
    const putSide = buildDeltaSideHealth(
      "PUT SIDE",
      trade.openingPutSideDelta,
      trade.currentPutSideDelta,
      "shortPremium"
    );
    const callSide = buildDeltaSideHealth(
      "CALL SIDE",
      trade.openingCallSideDelta,
      trade.currentCallSideDelta,
      "shortPremium"
    );
    if (!putSide && !callSide) return null;

    const overall = deriveIronCondorDeltaOverall(
      putSide?.trend ?? null,
      callSide?.trend ?? null
    );

    return {
      putSide,
      callSide,
      overallStatus: overall?.overallStatus ?? null,
      overallLabel: overall?.overallLabel ?? null,
    };
  }

  if (trade.strategy === "buyCall") {
    const callSide = buildDeltaSideHealth(
      "",
      trade.openingShortCallDelta,
      trade.currentShortCallDelta,
      "longCall"
    );
    return callSide ? { putSide: null, callSide, overallStatus: null, overallLabel: null } : null;
  }

  if (trade.strategy === "buyPut") {
    const putSide = buildDeltaSideHealth(
      "",
      trade.openingShortPutDelta,
      trade.currentShortPutDelta,
      "longPut"
    );
    return putSide ? { putSide, callSide: null, overallStatus: null, overallLabel: null } : null;
  }

  return null;
}
