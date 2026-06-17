import type { OptionCashAuditRow, OptionCashAuditSummary } from "./option-cash-audit";
import {
  buildOptionCashAuditRows,
  summarizeOptionCashAudit,
} from "./option-cash-audit";
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
  optionAudit: OptionCashAuditRow[];
  optionAuditSummary: OptionCashAuditSummary;
}

export function buildUsCashDiagnosticsReport(
  input: UsCashLedgerInput
): UsCashDiagnosticsReport {
  const base = buildUsCashReconciliationReport(input);
  const expectedUsdCash = reconcileUsCashFromReport(base);
  const actualUsdCash = base.currentUsdCash;
  const optionAudit = buildOptionCashAuditRows(input.optionsTrades ?? []);
  const optionAuditSummary = summarizeOptionCashAudit(optionAudit);

  return {
    ...base,
    expectedUsdCash,
    actualUsdCash,
    differenceUsd: actualUsdCash - expectedUsdCash,
    optionAudit,
    optionAuditSummary,
  };
}
