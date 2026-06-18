"use client";

import { formatPercent, formatSgd, formatUsd } from "@/shared/lib/format";
import { capacityBadgeClass, capacityLabel, plTrend } from "./options-utils";
import { usePortfolio } from "@/context/PortfolioContext";
import { SummaryCard } from "@/shared/components/ui/SummaryCard";

export function CapitalReadinessTab() {
  const { optionsData } = usePortfolio();
  const readiness = optionsData?.readiness;
  if (!readiness) return null;

  const utilization = readiness.riskUtilizationPercent;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="US Available Cash"
          value={formatUsd(readiness.usAvailableCashUsd)}
          subValue={
            optionsData?.fxRateValid
              ? `≈ ${formatSgd(readiness.usAvailableCashSgd)} · Shared Engine`
              : "FX required for SGD"
          }
        />
        <SummaryCard
          label="Total Open Risk"
          value={formatUsd(readiness.totalOpenRiskUsd)}
        />
        <SummaryCard
          label="Remaining Capacity"
          value={formatUsd(readiness.remainingCapacityUsd)}
          subValue="US cash − open risk DTE ≤ 45"
          trend={plTrend(readiness.remainingCapacityUsd)}
        />
        <div className="rounded-2xl border border-surface-border/80 bg-surface-card p-5">
          <p className="text-sm text-slate-400">Capacity Status</p>
          <span
            className={`mt-3 inline-block rounded-lg px-3 py-1.5 text-sm font-semibold ${capacityBadgeClass(
              readiness.capacityStatus
            )}`}
          >
            {capacityLabel(readiness.capacityStatus)}
          </span>
        </div>
      </div>

      {utilization != null && (
        <div className="rounded-2xl border border-surface-border/80 bg-surface-card p-5">
          <p className="text-sm text-slate-400">Risk utilization</p>
          <p className="mt-2 text-2xl font-bold text-white">
            {formatPercent(utilization, 1)}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-border">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${Math.min(100, utilization)}%` }}
            />
          </div>
        </div>
      )}

      <div className="rounded-xl border border-surface-border/60 bg-surface/30 p-4 text-sm text-slate-400">
        <p className="font-medium text-slate-300">Rules</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Remaining Capacity = US Available Cash − Open Risk (DTE ≤ 45)</li>
          <li>&gt; 0 = OK · ≤ 0 = NO TRADE</li>
          <li>Unrealized P/L and open risk do not change US Available Cash</li>
          <li>No options deposits, withdrawals, or contributions</li>
        </ul>
      </div>
    </div>
  );
}
