"use client";

import type { ReactNode } from "react";
import type { StockPortfolioSummary } from "@/core/calculations/stocks/summary";
import { deriveUsStockHoldingsDisplay, deriveUsSummaryCardTotalNetValueSgd } from "@/core/calculations/stocks/summary";
import { formatSgd, formatUsd } from "@/shared/lib/format";
import { formatUsCashComparisonSubValue } from "@/shared/lib/us-cash-display";

function formatSgdOrDash(value: number | null | undefined): string {
  return value != null ? formatSgd(value) : "—";
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
  const usStockHoldings = deriveUsStockHoldingsDisplay(summary);
  const totalUsNetValueSgd = deriveUsSummaryCardTotalNetValueSgd(summary);
  const optionsSgdLabel = formatSgdOrDash(summary.netOptionsMarketValueSgd);
  const cashComparison = formatUsCashComparisonSubValue(summary);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <BreakdownCard
        label="Total US Net Value (SGD)"
        value={formatSgd(totalUsNetValueSgd)}
        subValue={[
          `US Stock Holdings: ${formatSgd(usStockHoldings.sgd)}`,
          `US Cash: ${formatSgd(summary.usAvailableTradingCashSgd)}`,
          `Net Options Market Value: ${optionsSgdLabel}`,
        ].join("\n")}
      />

      <BreakdownCard
        label="US Stock Holdings Value (SGD)"
        value={formatSgd(usStockHoldings.sgd)}
        subValue={formatUsd(usStockHoldings.usd)}
      />

      <BreakdownCard
        label="US Cash"
        value={formatSgd(summary.usAvailableTradingCashSgd)}
        subValue={[
          formatUsd(summary.usAvailableTradingCashUsd),
          cashComparison,
        ]
          .filter(Boolean)
          .join("\n")}
      />
    </div>
  );
}

