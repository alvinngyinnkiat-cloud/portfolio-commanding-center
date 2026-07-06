import type { OptionsClosedTradeRow, OptionsOpenTradeRow } from "./options";
import type { ScannerCandleBar } from "./scanner";

export type IncomeDecisionStatus =
  | "waiting_for_trigger"
  | "waiting_for_confirmation"
  | "sell_call_window_open"
  | "checklist_incomplete";

export type IncomeRecoveryPhase = "building" | "recovering" | "house_money";

export type SellCallRecommendation = "Hold" | "Review" | "Close Soon";

export interface IncomeOverlaySettings {
  foundationTriggerAtrMultiplier: number;
  minFoundationDte: number;
  updatedAt: string;
}

export interface FoundationChecklistItem {
  id: string;
  label: string;
  pass: boolean;
}

export interface SellCallTimingRule {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
}

export interface IncomeCycleRow {
  cycleNumber: number;
  tradeId: string;
  openDate: string;
  closeDate: string | null;
  premiumReceivedUsd: number;
  realizedPlUsd: number | null;
  status: "open" | "closed";
}

export interface FoundationPositionView {
  ticker: string;
  foundationRow: OptionsOpenTradeRow;
  activeSellCallRow: OptionsOpenTradeRow | null;
  scannerCandles: ScannerCandleBar[];
  currentPriceUsd: number | null;
  avgPriceUsd: number | null;
  avgPricePrevUsd: number | null;
  atr14: number | null;
  foundationBreakevenUsd: number | null;
  callBreakevenUsd: number | null;
  foundationMaxRiskUsd: number;
  foundationDte: number;
  foundationChecklist: FoundationChecklistItem[];
  foundationChecklistPass: boolean;
  timingRules: SellCallTimingRule[];
  foundationTriggerPriceUsd: number | null;
  distanceToTriggerUsd: number | null;
  triggerStatusLabel: string;
  decisionStatus: IncomeDecisionStatus;
  decisionLabel: string;
  recoveryPct: number | null;
  recoveryPhase: IncomeRecoveryPhase | null;
  lifetimePremiumUsd: number;
  monthlyPremiumUsd: number;
  incomeCycles: IncomeCycleRow[];
  activeRecommendation: SellCallRecommendation | null;
}

export interface IncomeOverlaySummary {
  foundationCount: number;
  sellCallWindowsOpenCount: number;
  coveredPositionCount: number;
  activeIncomeCycleCount: number;
  monthlyPremiumUsd: number;
  lifetimePremiumUsd: number;
  aggregateRecoveryPct: number | null;
  aggregateRecoveryPhase: IncomeRecoveryPhase | null;
}

export interface IncomeOverlayData {
  settings: IncomeOverlaySettings;
  summary: IncomeOverlaySummary;
  foundations: FoundationPositionView[];
}
