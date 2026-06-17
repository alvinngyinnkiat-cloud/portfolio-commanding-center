import type { OptionsTrade } from "@/core/domain/types/options";
import { getTradeTotalRealizedPlUsd } from "@/core/calculations/options/contract-tracking";
import {
  summarizeOptionsCashFlowUsd,
  summarizeOptionsReconciliationUsd,
  type OptionsReconciliationTotals,
} from "./options-cash-flow";

const AUDIT_TOLERANCE_USD = 0.01;

export interface OptionsCashEngineAudit {
  totalPremiumReceivedUsd: number;
  totalCloseDebitsUsd: number;
  totalOpeningFeesUsd: number;
  totalClosingFeesUsd: number;
  totalManualPlAdjustmentsUsd: number;
  /** Premium − Close Debits − Opening Fees − Closing Fees */
  cashFromPremiumFormulaUsd: number;
  /** Sum of all realized P/L across every trade (reporting metric). */
  cashFromRealizedPlSumUsd: number;
  /** Shared engine net options cash (Module 2 + Module 5). */
  engineNetOptionsCashUsd: number;
  engineOpenCashFlowUsd: number;
  engineNormalCloseCashFlowUsd: number;
  engineManualCloseCashFlowUsd: number;
  /** Premium formula + manual close adjustments (matches engine when healthy). */
  reconciliationOptionsCashUsd: number;
  engineMatchesPremiumFormula: boolean;
  engineMatchesRealizedPlSum: boolean;
  premiumFormulaVsRealizedPlUsd: number;
  optionCashDoubleCountDetected: boolean;
  doubleCountAmountUsd: number;
}

/** Cash from Options = Premium Received − Close Debits − Opening Fees − Closing Fees */
export function computeCashFromPremiumFormulaUsd(
  totals: OptionsReconciliationTotals
): number {
  return (
    totals.totalPremiumReceivedUsd -
    totals.totalCloseDebitsUsd -
    totals.totalOpeningFeesUsd -
    totals.totalClosingFeesUsd
  );
}

export function sumAllOptionsRealizedPlUsd(trades: OptionsTrade[]): number {
  let total = 0;
  for (const trade of trades) {
    total += getTradeTotalRealizedPlUsd(trade);
  }
  return total;
}

export function detectOptionsCashDoubleCount(input: {
  engineNetOptionsCashUsd: number;
  cashFromPremiumFormulaUsd: number;
  totalManualPlAdjustmentsUsd: number;
  cashFromRealizedPlSumUsd: number;
}): { detected: boolean; amountUsd: number } {
  const premiumPathWithManual =
    input.cashFromPremiumFormulaUsd + input.totalManualPlAdjustmentsUsd;
  const stackedBothPaths =
    premiumPathWithManual + input.cashFromRealizedPlSumUsd;

  const detected =
    Math.abs(input.cashFromRealizedPlSumUsd) > AUDIT_TOLERANCE_USD &&
    Math.abs(input.engineNetOptionsCashUsd - stackedBothPaths) <=
      AUDIT_TOLERANCE_USD;

  return {
    detected,
    amountUsd: detected ? input.cashFromRealizedPlSumUsd : 0,
  };
}

export function buildOptionsCashEngineAudit(
  trades: OptionsTrade[]
): OptionsCashEngineAudit {
  const optionsTotals = summarizeOptionsReconciliationUsd(trades);
  const engine = summarizeOptionsCashFlowUsd(trades);
  const cashFromPremiumFormulaUsd =
    computeCashFromPremiumFormulaUsd(optionsTotals);
  const cashFromRealizedPlSumUsd = sumAllOptionsRealizedPlUsd(trades);
  const reconciliationOptionsCashUsd =
    cashFromPremiumFormulaUsd + optionsTotals.totalManualPlAdjustmentsUsd;

  const { detected, amountUsd } = detectOptionsCashDoubleCount({
    engineNetOptionsCashUsd: engine.netOptionsCashFlowUsd,
    cashFromPremiumFormulaUsd,
    totalManualPlAdjustmentsUsd: optionsTotals.totalManualPlAdjustmentsUsd,
    cashFromRealizedPlSumUsd,
  });

  return {
    totalPremiumReceivedUsd: optionsTotals.totalPremiumReceivedUsd,
    totalCloseDebitsUsd: optionsTotals.totalCloseDebitsUsd,
    totalOpeningFeesUsd: optionsTotals.totalOpeningFeesUsd,
    totalClosingFeesUsd: optionsTotals.totalClosingFeesUsd,
    totalManualPlAdjustmentsUsd: optionsTotals.totalManualPlAdjustmentsUsd,
    cashFromPremiumFormulaUsd,
    cashFromRealizedPlSumUsd,
    engineNetOptionsCashUsd: engine.netOptionsCashFlowUsd,
    engineOpenCashFlowUsd: engine.optionOpenCashFlowUsd,
    engineNormalCloseCashFlowUsd: engine.optionNormalCloseCashFlowUsd,
    engineManualCloseCashFlowUsd: engine.optionManualCloseCashFlowUsd,
    reconciliationOptionsCashUsd,
    engineMatchesPremiumFormula:
      Math.abs(
        engine.netOptionsCashFlowUsd - reconciliationOptionsCashUsd
      ) <= AUDIT_TOLERANCE_USD,
    engineMatchesRealizedPlSum:
      Math.abs(engine.netOptionsCashFlowUsd - cashFromRealizedPlSumUsd) <=
      AUDIT_TOLERANCE_USD,
    premiumFormulaVsRealizedPlUsd:
      cashFromPremiumFormulaUsd - cashFromRealizedPlSumUsd,
    optionCashDoubleCountDetected: detected,
    doubleCountAmountUsd: amountUsd,
  };
}
