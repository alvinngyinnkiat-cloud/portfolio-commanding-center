import type { OptionsClosedTradeRow, OptionsOpenTradeRow } from "./options";
import type { ScannerCandleBar } from "./scanner";

export type IncomeDecisionStatus =
  | "waiting_for_trigger"
  | "waiting_for_confirmation"
  | "sell_call_window_open"
  | "covered"
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
  closeDate: string;
  finalRealizedPlUsd: number;
  status: "completed";
}

export interface FoundationPositionView {
  ticker: string;
  foundationType: string;
  foundationRow: OptionsOpenTradeRow;
  activeSellCallRow: OptionsOpenTradeRow | null;
  isCovered: boolean;
  scannerCandles: ScannerCandleBar[];
  currentPriceUsd: number | null;
  avgPriceUsd: number | null;
  avgPricePrevUsd: number | null;
  atr14: number | null;
  foundationBreakevenUsd: number | null;
  callBreakevenUsd: number | null;
  foundationMaxRiskUsd: number;
  foundationDte: number;
  foundationOpeningDte: number;
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
  lifetimeIncomeUsd: number;
  monthlyIncomeUsd: number;
  completedIncomeCycles: IncomeCycleRow[];
  activeRecommendation: SellCallRecommendation | null;
}

export interface IncomeOverlaySummary {
  foundationCount: number;
  sellCallWindowsOpenCount: number;
  coveredPositionCount: number;
  activeIncomeCycleCount: number;
  monthlyIncomeUsd: number;
  lifetimeIncomeUsd: number;
  aggregateRecoveryPct: number | null;
  aggregateRecoveryPhase: IncomeRecoveryPhase | null;
}

export interface IncomeOverlayData {
  settings: IncomeOverlaySettings;
  summary: IncomeOverlaySummary;
  foundations: FoundationPositionView[];
}
