import type {
  EmaStrategyResult,
  MainSystemDisplay,
  ScannerScanRun,
  ScannerTickerResult,
  ScannerTrend,
} from "@/core/domain/types/scanner";
import { buildRankings } from "./ranking";
import { evaluateMainSystemDisplay } from "./main-system-display";

const EMPTY_EMA: EmaStrategyResult = {
  output: "NO TRADE",
  reasons: ["Awaiting rescan"],
  checklist: [],
};

const EMPTY_MAIN: MainSystemDisplay = {
  output: "NO TRADE",
  strategy: null,
  reasons: ["Awaiting rescan"],
};

function normalizeTrend(value: ScannerTrend | "Mixed" | undefined): ScannerTrend {
  if (!value || value === "Mixed") {
    return "Neutral";
  }
  return value;
}

export function reconcileMainSystemFromResult(
  raw: ScannerTickerResult
): MainSystemDisplay {
  if (raw.status !== "ok" || raw.indicators.atr14 == null) {
    if (raw.mainSystem?.output) {
      return {
        output: raw.mainSystem.output,
        strategy:
          raw.mainSystem.strategy ??
          (raw.mainSystem.output === "NO TRADE"
            ? null
            : raw.mainSystem.output === "SELL PUT"
              ? "bullPut"
              : raw.mainSystem.output === "SELL CALL"
                ? "bearCall"
                : "ironCondor"),
        reasons: raw.mainSystem.reasons ?? EMPTY_MAIN.reasons,
      };
    }
    return EMPTY_MAIN;
  }

  return evaluateMainSystemDisplay({
    bullPutEligible: raw.strategies.bullPut.eligible,
    bearCallEligible: raw.strategies.bearCall.eligible,
    ironCondorEligible: raw.strategies.ironCondor.eligible,
    trend: raw.indicators.trend,
    so: raw.indicators.so,
    soStatus: raw.indicators.soStatus,
    avgPrice: raw.indicators.avgPrice,
    avgPricePrev: raw.indicators.avgPricePrev,
    midPrice: raw.structure?.midPrice ?? null,
    atr14: raw.indicators.atr14,
    primarySupport: raw.structure?.primarySupport ?? null,
    primaryResistance: raw.structure?.primaryResistance ?? null,
    sellPutRange: raw.structure?.sellPutRange ?? null,
    sellCallRange: raw.structure?.sellCallRange ?? null,
    icMidZone: raw.structure?.icMidZone ?? null,
  });
}

const EMPTY_STRUCTURE: ScannerTickerResult["structure"] = {
  dailySupport: null,
  weeklySupport: null,
  primarySupport: null,
  dailyResistance: null,
  weeklyResistance: null,
  primaryResistance: null,
  midPrice: null,
  rangeWidth: null,
  sellPutRange: null,
  sellCallRange: null,
  icMidZone: null,
};

function normalizeStructure(
  structure: ScannerTickerResult["structure"] | undefined
): ScannerTickerResult["structure"] {
  const base = structure ?? EMPTY_STRUCTURE;
  return {
    ...EMPTY_STRUCTURE,
    ...base,
    icMidZone: base.icMidZone ?? null,
  };
}

function normalizeTicker(raw: ScannerTickerResult): ScannerTickerResult {
  const structure = normalizeStructure(raw.structure);
  const indicators = {
    ema20: raw.indicators?.ema20 ?? null,
    ema20Prev: raw.indicators?.ema20Prev ?? null,
    sma50: raw.indicators?.sma50 ?? null,
    sma50Prev: raw.indicators?.sma50Prev ?? null,
    sma50SlopePct: raw.indicators?.sma50SlopePct ?? null,
    sma200: raw.indicators?.sma200 ?? null,
    sma200Prev: raw.indicators?.sma200Prev ?? null,
    atr14: raw.indicators?.atr14 ?? null,
    so: raw.indicators?.so ?? null,
    soPrev: raw.indicators?.soPrev ?? null,
    soStatus: raw.indicators?.soStatus ?? "Rolling Down",
    high: raw.indicators?.high ?? null,
    low: raw.indicators?.low ?? null,
    avgPrice: raw.indicators?.avgPrice ?? null,
    avgPricePrev: raw.indicators?.avgPricePrev ?? null,
    emaDiff: raw.indicators?.emaDiff ?? null,
    emaDiffPct: raw.indicators?.emaDiffPct ?? null,
    trend: normalizeTrend(raw.indicators?.trend),
    trendQualityScore: raw.indicators?.trendQualityScore ?? 0,
  };
  const mainSystem = reconcileMainSystemFromResult({
    ...raw,
    indicators,
    structure,
    emaStrategy: raw.emaStrategy ?? EMPTY_EMA,
  });

  return {
    ...raw,
    indicators,
    structure,
    emaStrategy: raw.emaStrategy ?? EMPTY_EMA,
    mainSystem,
    tradable: mainSystem.output !== "NO TRADE",
  };
}

export function normalizeScannerScanRun(
  run: ScannerScanRun | null
): ScannerScanRun | null {
  if (!run) {
    return null;
  }
  const results = run.results.map(normalizeTicker);
  return {
    ...run,
    results,
    rankings: buildRankings(results),
  };
}
