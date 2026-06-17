import type { OptionCashAuditRow, OptionCashAuditSummary } from "./option-cash-audit";
import {
  buildOptionCashAuditRows,
  summarizeOptionCashAudit,
} from "./option-cash-audit";
import type {
  OpenOptionCollateralRow,
  OpenOptionCollateralSummary,
} from "./open-option-collateral-audit";
import {
  buildOpenOptionCollateralRows,
  summarizeOpenOptionCollateral,
} from "./open-option-collateral-audit";
import {
  buildOptionsCashEngineAudit,
  type OptionsCashEngineAudit,
} from "./options-cash-engine-audit";
import {
  buildUsCashReconciliationReport,
  reconcileUsCashFromReport,
  type UsCashReconciliationReport,
} from "./reconciliation";
import type { UsCashLedgerInput } from "./types";

export interface UsCashDiagnosticsReport extends UsCashReconciliationReport {
  expectedUsdCash: number;
  actualUsdCash: number;
  differenceUsd: number;
  openCollateral: OpenOptionCollateralRow[];
  openCollateralSummary: OpenOptionCollateralSummary;
  optionsCashEngineAudit: OptionsCashEngineAudit;
  optionAudit: OptionCashAuditRow[];
  optionAuditSummary: OptionCashAuditSummary;
}

export function buildUsCashDiagnosticsReport(
  input: UsCashLedgerInput
): UsCashDiagnosticsReport {
  const base = buildUsCashReconciliationReport(input);
  const expectedUsdCash = reconcileUsCashFromReport(base);
  const actualUsdCash = base.currentUsdCash;
  const openCollateral = buildOpenOptionCollateralRows(input.optionsTrades ?? []);
  const openCollateralSummary = summarizeOpenOptionCollateral(openCollateral);
  const optionsCashEngineAudit = buildOptionsCashEngineAudit(
    input.optionsTrades ?? []
  );
  const optionAudit = buildOptionCashAuditRows(input.optionsTrades ?? []);
  const optionAuditSummary = summarizeOptionCashAudit(optionAudit);

  return {
    ...base,
    expectedUsdCash,
    actualUsdCash,
    differenceUsd: actualUsdCash - expectedUsdCash,
    openCollateral,
    openCollateralSummary,
    optionsCashEngineAudit,
    optionAudit,
    optionAuditSummary,
  };
}
