export type ScannerCategory =

  | "ETF"

  | "Sector Leaders"

  | "MAG 7"

  | "Pullbacks"

  | "Custom";



export type ScannerStrategy = "bullPut" | "bearCall" | "ironCondor";



export type ScannerTrend = "Bullish" | "Bearish" | "Neutral";



export type ScannerMomentum = "Above EMA" | "Below EMA" | "At EMA";



export type SoStatus = "Rolling Up" | "Strong" | "Rolling Down";

export interface StochasticSoDebug {
  sessionDate: string | null;
  last10Highs: number[];
  last10Lows: number[];
  last10Closes: number[];
  highestHigh10: number | null;
  lowestLow10: number | null;
  rawK: number | null;
  smoothedK3: number | null;
  previousSmoothedK3: number | null;
  scannerSoUsed: number | null;
}

export interface AtrDebug {
  sessionDate: string | null;
  method: "RMA / Wilder";
  last14TrueRanges: number[];
  scannerAtrUsed: number | null;
}



export type StrategyOutput =

  | "SELL PUT"

  | "SELL CALL"

  | "IRON CONDOR"

  | "NO TRADE";



export type ScannerDataSourceStatus = "healthy" | "stale" | "unavailable";



export type ScannerRefreshStatus = "success" | "partial" | "failed";



export interface RuleCheck {

  label: string;

  passed: boolean;

  detail: string;

}



/** @deprecated Use RuleCheck — kept for legacy persisted scan payloads */

export interface ScoreComponent {

  label: string;

  max: number;

  earned: number;

  passed: boolean;

  detail: string;

}



export interface ScannerStrategyResult {

  eligible: boolean;

  checklist: RuleCheck[];

  passReasons: string[];

  failReasons: string[];

}



export interface ScannerCandleBar {

  date: string;

  open: number;

  high: number;

  low: number;

  close: number;

}



export interface ScannerStructure {

  dailySupport: number | null;

  weeklySupport: number | null;

  primarySupport: number | null;

  dailyResistance: number | null;

  weeklyResistance: number | null;

  primaryResistance: number | null;

  midPrice: number | null;

  rangeWidth: number | null;

  sellPutRange: { low: number; high: number } | null;

  sellCallRange: { low: number; high: number } | null;

  icMidZone: { low: number; high: number } | null;

}



export interface EmaStrategyCheck {

  label: string;

  passed: boolean;

  detail: string;

  /** When true, item is displayed for context only and does not affect eligibility. */
  informationOnly?: boolean;

}



export interface EmaStrategyResult {

  output: StrategyOutput;

  reasons: string[];

  checklist: EmaStrategyCheck[];

}



export interface MainSystemDisplay {

  output: StrategyOutput;

  strategy: ScannerStrategy | null;

  reasons: string[];

}



export interface ScannerIndicators {

  ema20: number | null;

  ema20Prev: number | null;

  sma50: number | null;

  sma50Prev: number | null;

  sma50SlopePct: number | null;

  sma200: number | null;

  sma200Prev: number | null;

  atr14: number | null;

  so: number | null;

  soPrev: number | null;

  soStatus: SoStatus;

  high: number | null;

  low: number | null;

  avgPrice: number | null;

  avgPricePrev: number | null;

  emaDiff: number | null;

  emaDiffPct: number | null;

  /** EMA/SMA stack classification — price-independent. */
  marketStructure: ScannerTrend;

  /** Average price position relative to EMA20. */
  momentum: ScannerMomentum;

  /** @deprecated Use marketStructure — kept for persisted scan compatibility. */
  trend: ScannerTrend;

  trendQualityScore: number;

  /** SO rebuild audit trail for TradingView reconciliation. */
  soDebug?: StochasticSoDebug | null;

  /** ATR rebuild audit trail for TradingView reconciliation. */
  atrDebug?: AtrDebug | null;

}



export interface ScannerTickerResult {

  ticker: string;

  category: ScannerCategory;

  market: "US";

  currentPrice: number | null;

  priceAsOf: string | null;

  indicators: ScannerIndicators;

  structure: ScannerStructure;

  strategies: {

    bullPut: ScannerStrategyResult;

    bearCall: ScannerStrategyResult;

    ironCondor: ScannerStrategyResult;

  };

  emaStrategy: EmaStrategyResult;

  mainSystem: MainSystemDisplay;

  bestSetup: ScannerStrategy | null;

  tradable: boolean;

  tradeReasons: string[];

  recentCandles: ScannerCandleBar[];

  status: "ok" | "incomplete" | "error";

  notes: string[];

}



export interface ScannerRankedEntry {

  rank: number;

  ticker: string;

  /** Suggested strike structure — informational only. */
  trade: string;

  width: number | null;

  targetPremium: number | null;

  maxRiskUsd: number | null;

}



export interface ScannerHealth {

  dataSourceStatus: ScannerDataSourceStatus;

  lastSuccessfulRefresh: string | null;

  failedRefreshCount: number;

  indicatorsCalculated: number;

  missingTickers: string[];

}



export interface ScannerScanRun {

  id: string;

  scanDate: string;

  scanTime: string;

  marketDateUsed: string | null;

  refreshStatus: ScannerRefreshStatus;

  tickersScanned: number;

  tickersMissing: string[];

  results: ScannerTickerResult[];

  rankings: {

    bullPut: ScannerRankedEntry[];

    bearCall: ScannerRankedEntry[];

    ironCondor: ScannerRankedEntry[];

  };

  opportunities: {

    bullPut: number;

    bearCall: number;

    ironCondor: number;

  };

  health: ScannerHealth;

}



export interface ScannerScheduleState {

  lastScanDate: string | null;

  lastSuccessfulScanTime: string | null;

  failedRefreshCount: number;

  lastFailedAttemptDate: string | null;

}



export interface ScannerTrackerData {

  latestRun: ScannerScanRun | null;

  previousRun: ScannerScanRun | null;

  schedule: ScannerScheduleState;

  lastRefreshFailed: boolean;

}



export const STRATEGY_LABELS: Record<ScannerStrategy, string> = {

  bullPut: "Sell Put",

  bearCall: "Sell Call",

  ironCondor: "Iron Condor",

};



export const STRATEGY_OUTPUT_LABELS: Record<StrategyOutput, string> = {

  "SELL PUT": "Sell Put",

  "SELL CALL": "Sell Call",

  "IRON CONDOR": "Iron Condor",

  "NO TRADE": "No Trade",

};


