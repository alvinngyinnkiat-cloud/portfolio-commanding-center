"use client";

import type { ReactNode } from "react";
import type { StockPortfolioSummary } from "@/core/calculations/stocks/summary";
import { formatSgd, formatUsd } from "@/shared/lib/format";
import { formatUsCashComparisonSubValue } from "@/shared/lib/us-cash-display";

function formatSgdOrDash(value: number | null | undefined): string {
  return value != null ? formatSgd(value) : "—";
}

function formatUsdOrDash(value: number | null | undefined): string {
  return value != null ? formatUsd(value) : "—";
}

function BreakdownCard({
  label,
  value,
  subValue,
  children,
}: {
  label: string;
  value: string;
  subValue?: string;
  children?: ReactNode;
}) {
  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-surface-border/80 bg-surface-card/90 p-5 shadow-md shadow-black/15 sm:p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 sm:text-sm sm:normal-case sm:tracking-normal sm:text-slate-400">
        {label}
      </p>
      <p className="mt-3 break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">
        {value}
      </p>
      {subValue && (
        <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-slate-500">
          {subValue}
        </p>
      )}
      {children}
    </div>
  );
}

export function UsMarketValueBreakdownCards({
  summary,
}: {
  summary: StockPortfolioSummary;
}) {
  const optionsSgdLabel = formatSgdOrDash(summary.netOptionsMarketValueSgd);
  const cashComparison = formatUsCashComparisonSubValue(summary);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <BreakdownCard
        label="Total US Net Value (SGD)"
        value={formatSgd(summary.totalUsNetValueSgd)}
        subValue={[
          `US Holdings: ${formatSgd(summary.usMarketValueSgd)}`,
          `US Cash: ${formatSgd(summary.usAvailableTradingCashSgd)}`,
          `Options: ${optionsSgdLabel}`,
        ].join("\n")}
      />

      <BreakdownCard
        label="US Holdings Value (SGD)"
        value={formatSgd(summary.usMarketValueSgd)}
        subValue={formatUsd(summary.usMarketValueUsd)}
      />

      <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-surface-border/80 bg-surface-card/90 p-5 shadow-md shadow-black/15 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 sm:text-sm sm:normal-case sm:tracking-normal sm:text-slate-400">
          US Cash + Options
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs text-slate-500">US Available Cash</p>
            <p className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
              {formatSgd(summary.usAvailableTradingCashSgd)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatUsd(summary.usAvailableTradingCashUsd)}
            </p>
            {cashComparison && (
              <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-slate-500">
                {cashComparison}
              </p>
            )}
          </div>

          <div className="border-t border-surface-border/60 pt-4">
            <p className="text-xs text-slate-500">Net Options Market Value</p>
            <p className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
              {formatSgdOrDash(summary.netOptionsMarketValueSgd)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatUsdOrDash(summary.netOptionsMarketValueUsd)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
