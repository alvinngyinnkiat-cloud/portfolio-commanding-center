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
        subValue="Open bull put spreads · DTE threshold met"
        icon={<Layers size={18} />}
      />
      <SummaryCard
        label="SELL CALL WINDOWS OPEN"
        value={String(summary.sellCallWindowsOpenCount)}
        subValue="Foundation checklist + timing rules satisfied"
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
        label="Monthly Premium"
        value={formatUsd(summary.monthlyPremiumUsd)}
        subValue="Sell call credits opened this month"
        icon={<Calendar size={18} />}
      />
      <SummaryCard
        label="Lifetime Premium"
        value={formatUsd(summary.lifetimePremiumUsd)}
        subValue="All sell call income cycles"
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
      <SummaryCard
        label="Active Income Cycles"
        value={String(summary.activeIncomeCycleCount)}
        subValue="Open sell call overlays"
        icon={<Repeat size={18} />}
      />
    </div>
  );
}
