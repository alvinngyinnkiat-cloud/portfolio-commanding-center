"use client";

import type { StockPortfolioSummary } from "@/core/calculations/stocks/summary";
import { formatSgd } from "@/shared/lib/format";

function BreakdownCard({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string;
  subValue?: string;
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
    </div>
  );
}

export function SgMarketValueBreakdownCards({
  summary,
}: {
  summary: StockPortfolioSummary;
}) {
  const sgHoldingsSgd = summary.sgMarketValueSgd;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <BreakdownCard
        label="Total SG Net Value (SGD)"
        value={formatSgd(summary.sgTotalValueSgd)}
        subValue={[
          `SG Holdings: ${formatSgd(sgHoldingsSgd)}`,
          `SG Cash: ${formatSgd(summary.sgAvailableTradingCashSgd)}`,
        ].join("\n")}
      />

      <BreakdownCard
        label="SG Holdings Value (SGD)"
        value={formatSgd(sgHoldingsSgd)}
      />

      <BreakdownCard
        label="SG Cash"
        value={formatSgd(summary.sgAvailableTradingCashSgd)}
      />
    </div>
  );
}
