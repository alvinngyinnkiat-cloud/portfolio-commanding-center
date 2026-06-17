"use client";

import type { ReactNode } from "react";
import type { UsCashReconciliationReport } from "@/core/calculations/us-cash";
import {
  buildUsCashReconciliationFormula,
  reconcileUsCashFromReport,
} from "@/core/calculations/us-cash";
import { formatSgd, formatUsd } from "@/shared/lib/format";

function SgdReportRow({
  label,
  value,
  emphasize = false,
  signed = false,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
  signed?: boolean;
}) {
  const display = signed
    ? `${value >= 0 ? "+" : "−"}${formatSgd(Math.abs(value))}`
    : formatSgd(value);

  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-slate-400">{label}</span>
      <span
        className={`text-sm tabular-nums ${
          emphasize
            ? value >= 0
              ? "font-semibold text-accent-green"
              : "font-semibold text-accent-red"
            : "font-medium text-slate-200"
        }`}
      >
        {display}
      </span>
    </div>
  );
}

function ReportRow({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-slate-400">{label}</span>
      <span
        className={`text-sm tabular-nums ${
          emphasize ? "font-semibold text-white" : "font-medium text-slate-200"
        }`}
      >
        {formatUsd(value)}
      </span>
    </div>
  );
}

function SectionBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-surface-border/60 bg-surface/40 p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h4>
      <div className="mt-3 divide-y divide-surface-border/30">{children}</div>
    </div>
  );
}

export function UsdCashReconciliationReport({
  report,
}: {
  report: UsCashReconciliationReport;
}) {
  const formula = buildUsCashReconciliationFormula(report);
  const expected = reconcileUsCashFromReport(report);
  const balanced = Math.abs(expected - report.currentUsdCash) < 0.01;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">
          USD Cash Reconciliation Report
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Broker-style USD cash build-up from FX, US stocks, and options activity
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionBlock title="A) FX Conversions">
          <ReportRow
            label="Total USD Received"
            value={report.fxConversionsUsd}
          />
        </SectionBlock>

        <SectionBlock title="B) US Stock Activity">
          <ReportRow label="Total Buys" value={report.stockBuysUsd} />
          <ReportRow label="Total Sells" value={report.stockSellsUsd} />
          <ReportRow label="Total Dividends" value={report.stockDividendsUsd} />
          {report.stockStandaloneFeesUsd > 0 && (
            <ReportRow
              label="Standalone Stock Fees"
              value={report.stockStandaloneFeesUsd}
            />
          )}
        </SectionBlock>

        <SectionBlock title="C) Options Activity">
          <ReportRow
            label="Total Premium Received"
            value={report.options.totalPremiumReceivedUsd}
          />
          <ReportRow
            label="Total Close Debits"
            value={report.options.totalCloseDebitsUsd}
          />
          <ReportRow
            label="Total Option Fees"
            value={report.options.totalOptionFeesUsd}
          />
          <ReportRow
            label="Total Manual P/L Adjustments"
            value={report.options.totalManualPlAdjustmentsUsd}
          />
        </SectionBlock>

        <SectionBlock title="D) Current USD Cash">
          <ReportRow
            label="Expected USD Cash"
            value={expected}
            emphasize
          />
          <ReportRow
            label="Actual USD Cash"
            value={report.currentUsdCash}
            emphasize
          />
        </SectionBlock>

        <SectionBlock title="E) FX Performance">
          <SgdReportRow
            label="FX Cost Basis"
            value={report.fxPerformance.fxCostBasisSgd}
          />
          <SgdReportRow
            label="Current USD Value"
            value={report.fxPerformance.currentUsdValueSgd}
          />
          <SgdReportRow
            label="FX Gain/Loss"
            value={report.fxPerformance.fxGainLossSgd}
            emphasize
            signed
          />
        </SectionBlock>
      </div>

      <div className="rounded-2xl border border-surface-border/80 bg-surface-card/90 p-5">
        <h4 className="text-sm font-semibold text-white">Reconciliation Formula</h4>
        <div className="mt-4 space-y-2">
          {formula.map((line) => (
            <div
              key={line.label}
              className="grid grid-cols-[1.5rem_minmax(0,1fr)_6rem] items-center gap-2 text-sm"
            >
              <span className="text-slate-500">{line.operator}</span>
              <span
                className={
                  line.operator === "="
                    ? "font-semibold text-white"
                    : "text-slate-300"
                }
              >
                {line.label}
              </span>
              <span
                className={`text-right tabular-nums ${
                  line.operator === "="
                    ? "font-semibold text-white"
                    : "text-slate-200"
                }`}
              >
                {formatUsd(line.amountUsd)}
              </span>
            </div>
          ))}
        </div>
        {!balanced && (
          <p className="mt-4 text-sm text-amber-300" role="alert">
            Cash reconciliation mismatch: expected{" "}
            {formatUsd(expected)} vs actual{" "}
            {formatUsd(report.currentUsdCash)}.
          </p>
        )}
      </div>
    </section>
  );
}
