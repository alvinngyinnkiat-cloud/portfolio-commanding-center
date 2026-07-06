"use client";

import { formatUsd, formatPercent } from "@/shared/lib/format";
import { SummaryCard } from "@/shared/components/ui/SummaryCard";
import type { IncomeOverlaySummary } from "@/core/domain/types/income";
import { recoveryPhaseLabel } from "@/core/calculations/income";
import {
  Layers,
  DoorOpen,
  ShieldCheck,
  Repeat,
  Calendar,
  PiggyBank,
  TrendingUp,
} from "lucide-react";

interface IncomeSummaryCardsProps {
  summary: IncomeOverlaySummary;
}

export function IncomeSummaryCards({ summary }: IncomeSummaryCardsProps) {
  const recoverySub =
    summary.aggregateRecoveryPhase != null && summary.aggregateRecoveryPct != null
      ? `${recoveryPhaseLabel(summary.aggregateRecoveryPhase)} · ${formatPercent(summary.aggregateRecoveryPct)}`
      : "No foundation risk basis";

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        label="Foundation Positions"
        value={String(summary.foundationCount)}
        subValue="Open foundations · opening DTE threshold met"
        icon={<Layers size={18} />}
      />
      <SummaryCard
        label="SELL CALL WINDOWS OPEN"
        value={String(summary.sellCallWindowsOpenCount)}
        subValue="Timing rules satisfied · not covered"
        icon={<DoorOpen size={18} />}
        trend={summary.sellCallWindowsOpenCount > 0 ? "positive" : "neutral"}
      />
      <SummaryCard
        label="Covered Positions"
        value={String(summary.coveredPositionCount)}
        subValue={`${summary.activeIncomeCycleCount} active income cycle(s)`}
        icon={<ShieldCheck size={18} />}
      />
      <SummaryCard
        label="Active Income Cycles"
        value={String(summary.activeIncomeCycleCount)}
        subValue="Open SELL CALL vertical spreads"
        icon={<Repeat size={18} />}
      />
      <SummaryCard
        label="Monthly Income"
        value={formatUsd(summary.monthlyIncomeUsd)}
        subValue="Realized P&L from cycles closed this month"
        icon={<Calendar size={18} />}
      />
      <SummaryCard
        label="Lifetime Income"
        value={formatUsd(summary.lifetimeIncomeUsd)}
        subValue="Sum of completed cycle realized P&L"
        icon={<PiggyBank size={18} />}
      />
      <SummaryCard
        label="Recovery %"
        value={
          summary.aggregateRecoveryPct != null
            ? formatPercent(summary.aggregateRecoveryPct)
            : "—"
        }
        subValue={recoverySub}
        icon={<TrendingUp size={18} />}
        trend={
          summary.aggregateRecoveryPhase === "house_money"
            ? "positive"
            : "neutral"
        }
      />
    </div>
  );
}
