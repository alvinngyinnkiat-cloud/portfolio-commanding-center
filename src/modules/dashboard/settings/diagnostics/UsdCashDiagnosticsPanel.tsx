"use client";

import { useMemo, useState } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import {
  buildUsCashDiagnosticsReport,
  buildUsCashReconciliationFormula,
  compareBrokerCashToCollateral,
} from "@/core/calculations/us-cash";
import { formatDate, formatUsd } from "@/shared/lib/format";
import { Input } from "@/shared/components/ui/Input";
import { SummaryCard } from "@/shared/components/ui/SummaryCard";
import { AlertTriangle, Layers, Shield, TrendingUp, Wallet } from "lucide-react";

function ReportRow({
  label,
  value,
  emphasize = false,
  sublabel,
  format = "usd",
}: {
  label: string;
  value: number;
  emphasize?: boolean;
  sublabel?: string;
  format?: "usd" | "count";
}) {
  const display =
    format === "count" ? String(value) : formatUsd(value);

  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <span className="text-sm text-slate-400">{label}</span>
        {sublabel && (
          <p className="text-xs text-slate-600">{sublabel}</p>
        )}
      </div>
      <span
        className={`text-sm tabular-nums ${
          emphasize ? "font-semibold text-white" : "font-medium text-slate-200"
        }`}
      >
        {display}
      </span>
    </div>
  );
}

function SectionBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
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

export function UsdCashDiagnosticsPanel() {
  const { data, stockData, optionsData } = usePortfolio();
  const [brokerUsdCashInput, setBrokerUsdCashInput] = useState("");

  const report = useMemo(() => {
    if (!data || !stockData) return null;
    return buildUsCashDiagnosticsReport({
      contributions: data.contributions,
      fxConversions: stockData.cashFlow.fxConversions,
      stockTransactions: stockData.transactions,
      fxRate: stockData.fxRate,
      optionsTrades: optionsData?.trades ?? [],
    });
  }, [data, stockData, optionsData?.trades]);

  const brokerUsdCash = useMemo(() => {
    const trimmed = brokerUsdCashInput.trim();
    if (!trimmed) return null;
    const parsed = parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }, [brokerUsdCashInput]);

  const collateralComparison = useMemo(() => {
    if (!report) return null;
    return compareBrokerCashToCollateral({
      expectedUsdCash: report.expectedUsdCash,
      brokerUsdCash,
      estimatedReservedCapitalUsd:
        report.openCollateralSummary.estimatedReservedCapitalUsd,
    });
  }, [report, brokerUsdCash]);

  if (!report) {
    return (
      <p className="text-sm text-slate-500">Loading portfolio data…</p>
    );
  }

  const formula = buildUsCashReconciliationFormula(report);
  const cashMismatch = Math.abs(report.differenceUsd) >= 0.01;
  const summaryMismatch =
    Math.abs(report.optionAuditSummary.differenceUsd) >= 0.01;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionBlock title="A) FX Conversions">
          <ReportRow
            label="Total USD Received"
            value={report.fxConversionsUsd}
            sublabel="All FX conversion transactions"
          />
        </SectionBlock>

        <SectionBlock title="B) US Stock Activity">
          <ReportRow label="Total Stock Buys" value={report.stockBuysUsd} />
          <ReportRow label="Total Stock Sells" value={report.stockSellsUsd} />
          <ReportRow
            label="Total Dividends"
            value={report.stockDividendsUsd}
          />
          <ReportRow
            label="Total Stock Fees"
            value={report.stockStandaloneFeesUsd}
          />
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
            label="Total Opening Fees"
            value={report.options.totalOpeningFeesUsd}
          />
          <ReportRow
            label="Total Closing Fees"
            value={report.options.totalClosingFeesUsd}
          />
          <ReportRow
            label="Total Manual P/L Trades"
            value={report.options.totalManualPlTradesUsd}
          />
          <ReportRow
            label="Open Trades Premium"
            value={report.options.openTradesPremiumUsd}
          />
          <ReportRow
            label="Closed Trades Premium"
            value={report.options.closedTradesPremiumUsd}
          />
        </SectionBlock>
      </div>

      <div className="rounded-2xl border border-surface-border/80 bg-surface-card/90 p-5">
        <h4 className="text-sm font-semibold text-white">
          D) Cash Reconciliation
        </h4>
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

        <div className="mt-6 space-y-2 border-t border-surface-border/40 pt-4">
          <ReportRow
            label="Expected USD Cash"
            value={report.expectedUsdCash}
            emphasize
          />
          <ReportRow
            label="Actual USD Cash"
            value={report.actualUsdCash}
            emphasize
          />
          <ReportRow
            label="Difference"
            value={report.differenceUsd}
            emphasize
          />
        </div>

        {cashMismatch && (
          <div
            className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
            role="alert"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Cash reconciliation mismatch</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-white">
          E) Option Cash Audit
        </h4>
        <p className="text-sm text-slate-500">
          Every closed option trade — Cash Impact = Premium Received − Open Fees
          − Close Debit − Close Fees
        </p>
        <div className="overflow-x-auto rounded-xl border border-surface-border/60">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-surface/60 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3 text-left">Ticker</th>
                <th className="px-3 py-3 text-left">Open Date</th>
                <th className="px-3 py-3 text-left">Close Date</th>
                <th className="px-3 py-3 text-right">Premium Received</th>
                <th className="px-3 py-3 text-right">Open Fees</th>
                <th className="px-3 py-3 text-right">Close Debit</th>
                <th className="px-3 py-3 text-right">Close Fees</th>
                <th className="px-3 py-3 text-right">Realized P/L</th>
                <th className="px-3 py-3 text-right">Cash Impact</th>
              </tr>
            </thead>
            <tbody>
              {report.optionAudit.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No closed option trades.
                  </td>
                </tr>
              ) : (
                report.optionAudit.map((row) => {
                  const mismatch = !row.cashImpactMatchesPl;
                  return (
                    <tr
                      key={row.tradeId}
                      className={`border-b border-surface-border/40 last:border-0 ${
                        mismatch ? "bg-accent-red/10 text-accent-red" : "text-slate-300"
                      }`}
                    >
                      <td className="px-3 py-2.5 font-medium">{row.ticker}</td>
                      <td className="px-3 py-2.5">{formatDate(row.openDate)}</td>
                      <td className="px-3 py-2.5">
                        {row.closeDate === "—"
                          ? "—"
                          : formatDate(row.closeDate)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatUsd(row.premiumReceivedUsd)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatUsd(row.openFeesUsd)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatUsd(row.closeDebitUsd)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatUsd(row.closeFeesUsd)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatUsd(row.realizedPlUsd)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                        {formatUsd(row.cashImpactUsd)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <SectionBlock title="Closed Options Summary">
          <ReportRow
            label="Total Premium Received"
            value={report.optionAuditSummary.totalPremiumReceivedUsd}
          />
          <ReportRow
            label="Total Realized P/L"
            value={report.optionAuditSummary.totalRealizedPlUsd}
          />
          <ReportRow
            label="Difference"
            value={report.optionAuditSummary.differenceUsd}
            emphasize
          />
          {summaryMismatch && (
            <p className="pt-2 text-sm text-accent-red" role="alert">
              Premium vs realized P/L mismatch — may indicate premium counted twice
              or realized P/L added on top of premium cash.
            </p>
          )}
        </SectionBlock>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-semibold text-white">
            F) Open Option Collateral Audit
          </h4>
          <p className="mt-1 text-sm text-slate-500">
            Reporting only — does not affect cash calculations. Investigate whether
            broker cash differences are explained by open option collateral.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <SummaryCard
            label="Open Trades Count"
            value={String(report.openCollateralSummary.openTradesCount)}
            icon={<Layers size={18} />}
            compact
          />
          <SummaryCard
            label="Total Open Risk"
            value={formatUsd(report.openCollateralSummary.totalOpenRiskUsd)}
            subValue="Sum of max risk on open trades"
            icon={<Shield size={18} />}
            compact
          />
          <SummaryCard
            label="Total Premium Received"
            value={formatUsd(report.openCollateralSummary.premiumReceivedUsd)}
            icon={<TrendingUp size={18} />}
            compact
          />
          <SummaryCard
            label="Total Current Market Value"
            value={
              report.openCollateralSummary.currentMarketValueUsd != null
                ? formatUsd(report.openCollateralSummary.currentMarketValueUsd)
                : "—"
            }
            subValue={
              report.openCollateralSummary.currentMarketValueUsd == null
                ? "Mark open trades to include"
                : undefined
            }
            icon={<Wallet size={18} />}
            compact
          />
          <SummaryCard
            label="Net Open Cash Contribution"
            value={formatUsd(
              report.openCollateralSummary.netOpenCashContributionUsd
            )}
            subValue="Premium − Market Value − Fees"
            icon={<Wallet size={18} />}
            highlight
            compact
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionBlock title="Estimated Reserved Capital">
            <ReportRow
              label="Estimated Reserved Capital"
              value={report.openCollateralSummary.estimatedReservedCapitalUsd}
              sublabel="= Total Open Risk (reporting only)"
              emphasize
            />
          </SectionBlock>

          <SectionBlock title="Broker Cash Difference">
            <div className="py-2">
              <Input
                label="Broker USD Cash"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 1341.21"
                value={brokerUsdCashInput}
                onChange={(e) => setBrokerUsdCashInput(e.target.value)}
                hint="Enter broker-reported USD cash to compare against expected"
              />
            </div>
            <ReportRow
              label="Expected USD Cash"
              value={report.expectedUsdCash}
            />
            {collateralComparison?.brokerCashDifferenceUsd != null && (
              <ReportRow
                label="Difference"
                value={collateralComparison.brokerCashDifferenceUsd}
                sublabel="Expected USD Cash − Broker USD Cash"
                emphasize
              />
            )}
          </SectionBlock>
        </div>

        {collateralComparison?.brokerCashDifferenceUsd != null && (
          <div className="rounded-2xl border border-surface-border/80 bg-surface-card/90 p-5">
            <h5 className="text-sm font-semibold text-white">Comparison</h5>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <SummaryCard
                label="Difference"
                value={formatUsd(collateralComparison.brokerCashDifferenceUsd)}
                compact
              />
              <SummaryCard
                label="Estimated Reserved Capital"
                value={formatUsd(
                  collateralComparison.estimatedReservedCapitalUsd
                )}
                compact
              />
              <SummaryCard
                label="Difference ÷ Open Risk"
                value={
                  collateralComparison.differenceVsOpenRiskPercent != null
                    ? `${collateralComparison.differenceVsOpenRiskPercent.toFixed(1)}%`
                    : "—"
                }
                compact
              />
            </div>
            <div
              className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                collateralComparison.collateralExplainsDifference
                  ? "border-accent-green/40 bg-accent-green/10 text-accent-green"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-200"
              }`}
            >
              <span className="font-medium">
                Difference explained by open collateral:{" "}
                {collateralComparison.collateralExplainsDifference ? "YES" : "NO"}
              </span>
              {collateralComparison.collateralExplainsDifference && (
                <p className="mt-1 text-xs opacity-90">
                  The broker cash gap aligns with estimated open risk collateral.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-surface-border/60">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-surface/60 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3 text-left">Ticker</th>
                <th className="px-3 py-3 text-left">Strategy</th>
                <th className="px-3 py-3 text-right">Premium Received</th>
                <th className="px-3 py-3 text-right">Current Market Value</th>
                <th className="px-3 py-3 text-right">Opening Fees</th>
                <th className="px-3 py-3 text-right">Net Open Cash Contribution</th>
                <th className="px-3 py-3 text-right">Max Risk</th>
              </tr>
            </thead>
            <tbody>
              {report.openCollateral.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No open option trades.
                  </td>
                </tr>
              ) : (
                report.openCollateral.map((row) => (
                  <tr
                    key={row.tradeId}
                    className="border-b border-surface-border/40 text-slate-300 last:border-0"
                  >
                    <td className="px-3 py-2.5 font-medium">{row.ticker}</td>
                    <td className="px-3 py-2.5">{row.strategy}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {formatUsd(row.premiumReceivedUsd)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {row.currentMarketValueUsd != null
                        ? formatUsd(row.currentMarketValueUsd)
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {formatUsd(row.openingFeesUsd)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                      {formatUsd(row.netOpenCashContributionUsd)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {formatUsd(row.maxRiskUsd)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
