export type OptionsTradeStatus = "open" | "closed";

export type OptionsTradeType = "personal" | "shared";

export type OptionsCloseMethod = "normal" | "manual_pl";

export interface OptionsCloseEvent {
  id: string;
  closeDate: string;
  contractsClosed: number;
  closePremiumUsd: number;
  closeFeesUsd: number;
  closeMethod: OptionsCloseMethod;
  manualRealizedPlUsd?: number;
  realizedPlUsd: number;
  notes?: string;
  createdAt: string;
}

export type OptionsStrategy =
  | "sellPut"
  | "sellCall"
  | "bullPut"
  | "bearCall"
  | "ironCondor"
  | "buyCall"
  | "buyPut"
  | "custom";

export type OptionsCapacityStatus = "OK" | "AT_LIMIT" | "NO_TRADE";

export type OptionsDteStatus = "NORMAL" | "WATCH" | "ACTION_REQUIRED";

export type DashboardDteStatus = "green" | "yellow" | "red";
export type DashboardBreakevenStatus = "green" | "yellow" | "orange" | "red";
export type DashboardTradeHealth = "HEALTHY" | "REVIEW" | "THREATENED";
export type DashboardTrendDirection = "positive" | "negative" | "neutral";

export type DeltaHealthTrend = "improving" | "stable" | "worsening";
export type DeltaHealthColor = "green" | "yellow" | "red";
export type DeltaHealthOverallStatus = "healthy" | "monitor" | "review" | "threatened";

export interface DeltaSideHealth {
  label: string;
  openingDelta: number | null;
  currentDelta: number | null;
  deltaChange: number | null;
  trend: DeltaHealthTrend | null;
  statusLabel: string | null;
  message: string | null;
  color: DeltaHealthColor | null;
}

export interface DashboardDeltaHealth {
  putSide: DeltaSideHealth | null;
  callSide: DeltaSideHealth | null;
  overallStatus: DeltaHealthOverallStatus | null;
  overallLabel: string | null;
}

export interface DashboardTrendHealth {
  shortTrend: {
    label: string;
    direction: DashboardTrendDirection;
  } | null;
  longTrend: {
    label: string;
    direction: DashboardTrendDirection;
  } | null;
}

export interface IronCondorBreakevenDisplay {
  lowerBreakevenUsd: number;
  upperBreakevenUsd: number;
  putSideDistancePct: number;
  callSideDistancePct: number;
  closestSide: "put" | "call";
}

/** Module 5 open-trades tab health filter — separate from per-trade dashboard Trade Health. */
export type OpenTradeHealthCategory = "threatened" | "review" | "healthy";

export interface OpenTradeHealthSummary {
  threatenedCount: number;
  reviewCount: number;
  healthyCount: number;
  totalCount: number;
}

export interface OpenTradeDashboardMetrics {
  dte: number;
  dteStatus: DashboardDteStatus;
  currentPriceUsd: number | null;
  /** Human-readable source for resolved current price. */
  currentPriceSourceLabel: string | null;
  currentPriceAsOf: string | null;
  /** Single breakeven for vertical spreads; null for iron condor. */
  breakevenPriceUsd: number | null;
  /** Effective distance for trade health — worst / closest side for iron condor. */
  breakevenDistancePct: number | null;
  breakevenStatus: DashboardBreakevenStatus | null;
  ironCondorBreakeven: IronCondorBreakevenDisplay | null;
  tradeHealth: DashboardTradeHealth | null;
  unrealizedPlUsd: number | null;
  unrealizedPlPct: number | null;
  maxRiskUsd: number;
  riskUsedPct: number | null;
  deltaHealth: DashboardDeltaHealth | null;
  trendHealth: DashboardTrendHealth | null;
  entryCreditUsd: number | null;
  /** Debit strategies — premium paid (remaining contracts). */
  premiumPaidUsd: number | null;
  maxProfitDisplay: string | null;
  isDebit: boolean;
  supportsDashboard: boolean;
}

export interface OptionsSettings {
  clientName: string;
  clientStartingCapitalUsd: number;
  defaultSharedUserPercent: number;
  defaultSharedClientPercent: number;
  updatedAt: string;
}

/** Reporting-only client portfolio view (Module 5 source of truth). */
export interface OptionsClientSummary {
  clientName: string;
  startingCapitalUsd: number;
  clientRealizedPlUsd: number;
  clientUnrealizedPlUsd: number | null;
  clientEquityUsd: number;
  returnPercent: number | null;
  openSharedTradeCount: number;
  openSharedRiskUsd: number;
}

/** Computed vertical-spread economics (bull put / bear call). */
export interface OptionsVerticalSpreadMetrics {
  widthPerShare: number;
  spreadWidthUsd: number;
  netCreditUsd: number;
  maxProfitUsd: number;
  maxRiskUsd: number;
  breakevenUsd: number;
  tpExitPrice75Usd: number;
}

/** Computed iron condor economics (bull put + bear call as one trade). */
export interface OptionsIronCondorMetrics {
  bullPutWidthPerShare: number;
  bearCallWidthPerShare: number;
  ironCondorWidthPerShare: number;
  spreadWidthUsd: number;
  netCreditUsd: number;
  netCreditPerShare: number;
  maxProfitUsd: number;
  maxRiskUsd: number;
  lowerBreakevenUsd: number;
  upperBreakevenUsd: number;
  tpExitPrice75Usd: number;
}

/** Immutable options ledger row — source of truth for Module 5. */
export interface OptionsTrade {
  id: string;
  status: OptionsTradeStatus;
  tradeType: OptionsTradeType;
  userSharePercent: number;
  clientSharePercent: number;
  strategy: OptionsStrategy;
  strategyLabel?: string;
  underlying: string;
  expirationDate: string;
  contracts: number;
  /** Contracts still open; defaults to `contracts` when unset on open trades. */
  remainingContracts?: number;
  /** Cumulative contracts closed via partial or full close events. */
  closedContracts?: number;
  /** Each partial or final close stored separately; original open trade is not overwritten. */
  closeEvents?: OptionsCloseEvent[];
  /** Sold leg strike — bull put / bear call vertical spreads. */
  shortStrikeUsd?: number;
  /** Bought leg strike — bull put / bear call vertical spreads. */
  longStrikeUsd?: number;
  /** Iron condor bull put spread (short / long). */
  bullPutShortStrikeUsd?: number;
  bullPutLongStrikeUsd?: number;
  /** Iron condor bear call spread (short / long). */
  bearCallShortStrikeUsd?: number;
  bearCallLongStrikeUsd?: number;
  openDate: string;
  closeDate?: string;
  openPremiumUsd: number;
  openFeesUsd: number;
  /** Auto-derived for bull put, bear call, iron condor; manual for custom only. */
  maxRiskUsd: number;
  currentValueUsd?: number;
  currentValueUpdatedAt?: string;
  /** Manual underlying stock price for breakeven difference. */
  underlyingPriceUsd?: number;
  underlyingPriceUpdatedAt?: string;
  /** Opening snapshot — immutable after trade creation. */
  openingShortPutDelta?: number;
  openingShortCallDelta?: number;
  openingPutSideDelta?: number;
  openingCallSideDelta?: number;
  openingEma20?: number;
  openingSma50?: number;
  openingSma200?: number;
  /** Manual monitoring inputs — updated on open trade dashboard. */
  currentShortPutDelta?: number;
  currentShortCallDelta?: number;
  currentPutSideDelta?: number;
  currentCallSideDelta?: number;
  closePremiumUsd?: number;
  closeFeesUsd?: number;
  /** How the trade was closed — normal debit math or broker manual P/L. */
  closeMethod?: OptionsCloseMethod;
  /** Broker-final realized P/L when closeMethod is manual_pl. */
  manualRealizedPlUsd?: number;
  realizedPlUsd?: number;
  /** Stored at close — realized P/L ÷ max risk × 100. */
  returnPercent?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OptionsSplitLegs {
  userLegUsd: number;
  clientLegUsd: number;
}

import type { ResolvedScannerPrice, ResolvedTickerPrice } from "@/core/calculations/scanner/price-engine";
import type { LatestScannerRecord } from "@/core/calculations/scanner/scanner-snapshot";
import type { OptionsTradeEconomics } from "@/core/calculations/options/trade-economics";
import type { ScannerIndicators } from "@/core/domain/types/scanner";

export interface OptionsOpenTradeRow {
  trade: OptionsTrade;
  spreadMetrics: OptionsVerticalSpreadMetrics | null;
  ironCondorMetrics: OptionsIronCondorMetrics | null;
  tradeEconomics: OptionsTradeEconomics | null;
  underlyingPrice: ResolvedScannerPrice;
  /** Shared resolver output — scanner refresh → manual → saved fallback. */
  resolvedTickerPrice: ResolvedTickerPrice;
  /** Latest persisted scanner snapshot record for this ticker. */
  scannerRecord: LatestScannerRecord | null;
  unrealizedPlUsd: number | null;
  userUnrealizedPlUsd: number | null;
  clientUnrealizedPlUsd: number | null;
  daysToExpiration: number;
  dteStatus: OptionsDteStatus;
  strategyDisplay: string;
  dashboard: OpenTradeDashboardMetrics;
  scannerIndicators: ScannerIndicators | null;
}

export interface OptionsClosedTradeRow {
  trade: OptionsTrade;
  closeCostUsd: number;
  userRealizedPlUsd: number;
  clientRealizedPlUsd: number;
  returnPercent: number | null;
  daysHeld: number;
  strategyDisplay: string;
  closeEvents: OptionsCloseEvent[];
}

export interface OptionsTradeTypePerformanceDetail {
  closedCount: number;
  winCount: number;
  lossCount: number;
  winRatePercent: number;
  avgWinUsd: number;
  avgLossUsd: number;
  totalRealizedPlUsd: number;
  avgDaysHeld: number;
  totalMaxRiskUsd: number;
  returnPercent: number;
}

/** Performance scope summary (total / personal / client). */
export interface OptionsPerformanceScopeDetail extends OptionsTradeTypePerformanceDetail {
  grossProfitUsd: number;
  grossLossUsd: number;
  profitFactorLabel: string;
  profitFactorValue: number | null;
  profitFactorKind: "none" | "infinity" | "zero" | "value";
}

export interface OptionsStrategyBreakdownRow {
  strategy: OptionsStrategy;
  strategyDisplay: string;
  closedCount: number;
  winCount: number;
  lossCount: number;
  winRatePercent: number;
  avgWinUsd: number;
  avgLossUsd: number;
  totalRealizedPlUsd: number;
  totalMaxRiskUsd: number;
  returnPercent: number;
}

export interface OptionsMonthlyPerformanceRow {
  monthKey: string;
  label: string;
  realizedPlUsd: number;
}

export interface OptionsTrackerSummary {
  usAvailableCashUsd: number;
  usAvailableCashSgd: number;
  systemCalculatedUsCashUsd: number;
  brokerUsdCashOverrideUsd: number | null;
  historicalReconciliationDifferenceUsd: number | null;
  usesBrokerUsdCashOverride: boolean;
  totalOpenRiskUsd: number;
  totalUnrealizedPlUsd: number | null;
  userUnrealizedPlUsd: number | null;
  clientUnrealizedPlUsd: number | null;
  markedOpenCount: number;
  openTradeCount: number;
  totalRealizedPlUsd: number;
  userRealizedPlUsd: number;
  clientRealizedPlUsd: number;
  closedTradeCount: number;
  personalReturnPercent: number;
  sharedReturnPercent: number;
  remainingCapacityUsd: number;
  capacityStatus: OptionsCapacityStatus;
  tradesRequiringActionCount: number;
  openRiskRequiringActionUsd: number;
  /** Broker-style sum of open option market values (USD). Null when no marks. */
  netOptionsMarketValueUsd: number | null;
}

export interface OptionsCapitalReadiness {
  usAvailableCashUsd: number;
  usAvailableCashSgd: number;
  systemCalculatedUsCashUsd: number;
  brokerUsdCashOverrideUsd: number | null;
  historicalReconciliationDifferenceUsd: number | null;
  usesBrokerUsdCashOverride: boolean;
  totalOpenRiskUsd: number;
  remainingCapacityUsd: number;
  capacityStatus: OptionsCapacityStatus;
  riskUtilizationPercent: number | null;
}

export interface OptionsRiskByTrade {
  tradeId: string;
  underlying: string;
  strategyDisplay: string;
  tradeType: OptionsTradeType;
  splitLabel: string;
  maxRiskUsd: number;
  userRiskUsd: number;
  percentOfPool: number;
}

export interface OptionsRiskByStrategy {
  strategy: OptionsStrategy;
  strategyDisplay: string;
  openCount: number;
  totalRiskUsd: number;
  avgRiskUsd: number;
  percentOfPool: number;
}

export interface OptionsRiskSummary {
  openTradeCount: number;
  totalOpenRiskUsd: number;
  avgRiskPerTradeUsd: number;
  largestRiskUsd: number;
  largestRiskUnderlying: string;
  remainingCapacityUsd: number;
  capacityStatus: OptionsCapacityStatus;
  byTrade: OptionsRiskByTrade[];
  byStrategy: OptionsRiskByStrategy[];
  personalRiskUsd: number;
  sharedRiskUsd: number;
  userRiskLegUsd: number;
  clientRiskLegUsd: number;
  expiring7DayRiskUsd: number;
  expiring30DayRiskUsd: number;
}

export interface OptionsStrategyPerformance {
  strategy: OptionsStrategy;
  strategyDisplay: string;
  closedCount: number;
  totalRealizedPlUsd: number;
  userRealizedPlUsd: number;
  winCount: number;
  lossCount: number;
  winRatePercent: number;
  avgRealizedPlUsd: number;
  bestPlUsd: number;
  worstPlUsd: number;
}

export interface OptionsTypePerformance {
  tradeType: OptionsTradeType;
  closedCount: number;
  totalRealizedPlUsd: number;
  userRealizedPlUsd: number;
  winRatePercent: number;
  avgDaysHeld: number;
}

export interface OptionsMonthlyRealized {
  monthKey: string;
  label: string;
  totalRealizedPlUsd: number;
  userRealizedPlUsd: number;
}

export interface OptionsPerformanceSummary {
  closedCount: number;
  winCount: number;
  lossCount: number;
  winRatePercent: number;
  totalRealizedPlUsd: number;
  userRealizedPlUsd: number;
  clientRealizedPlUsd: number;
  avgRealizedPlUsd: number;
  avgWinUsd: number;
  avgLossUsd: number;
  avgDaysHeld: number;
  bestPlUsd: number;
  worstPlUsd: number;
  totalUnrealizedPlUsd: number | null;
  markedOpenCount: number;
  openTradeCount: number;
  byStrategy: OptionsStrategyPerformance[];
  byType: OptionsTypePerformance[];
  monthlyRealized: OptionsMonthlyRealized[];
}

export interface OptionsTrackerData {
  trades: OptionsTrade[];
  settings: OptionsSettings;
  summary: OptionsTrackerSummary;
  readiness: OptionsCapitalReadiness;
  risk: OptionsRiskSummary;
  performance: OptionsPerformanceSummary;
  personalPerformance: OptionsTradeTypePerformanceDetail;
  sharedPerformance: OptionsTradeTypePerformanceDetail;
  openRows: OptionsOpenTradeRow[];
  closedRows: OptionsClosedTradeRow[];
  clientSummary: OptionsClientSummary;
  fxRate: number | null;
  fxRateValid: boolean;
}
