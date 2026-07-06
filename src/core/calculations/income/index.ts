export {
  buildIncomeOverlayData,
  type BuildIncomeOverlayInput,
} from "./build-income-overlay";
export {
  readIncomeOverlaySettings,
  writeIncomeOverlaySettings,
  normalizeIncomeOverlaySettings,
  DEFAULT_INCOME_OVERLAY_SETTINGS,
  INCOME_OVERLAY_SETTINGS_KEY,
} from "./settings";
export {
  calculateFoundationTriggerPrice,
  deriveIncomeDecisionStatus,
  evaluateSellCallTimingRules,
  incomeDecisionLabel,
} from "./sell-call-window";
export {
  buildCompletedIncomeCyclesForTicker,
  calculateRecoveryPct,
  deriveRecoveryPhase,
  deriveSellCallRecommendation,
  recoveryPhaseLabel,
  sumLifetimeIncomeUsd,
  sumMonthlyIncomeUsd,
} from "./income-cycles";
export {
  getFoundationOpeningDte,
  getFoundationTypeLabel,
  isFoundationStrategy,
  isSellCallIncomeStrategy,
  qualifiesAsFoundation,
} from "./strategies";
