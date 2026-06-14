import type { GrowthSummaryData, GrowthPeriodKey } from "@/core/calculations/growth-reporting";
import { formatSgd, formatPercent } from "@/shared/lib/format";
import { SummaryCard } from "@/shared/components/ui/SummaryCard";
import { SectionHeader } from "@/shared/components/ui/SectionHeader";
import { ReportingSourceLabel } from "./ReportingSourceLabel";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  LineChart,
} from "lucide-react";

const PERIOD_LABELS: Record<GrowthPeriodKey, string> = {
  sinceStart: "Since Start Growth",
  "1m": "1 Month Growth",
  "3m": "3 Month Growth",
  "6m": "6 Month Growth",
  "1y": "1 Year Growth",
};

function formatGrowthValue(
  dollars: number | null,
  percent: number | null,
  insufficientData: boolean
): { value: string; subValue: string; trend?: "positive" | "negative" | "neutral" } {
  if (insufficientData || dollars == null) {
    return { value: "Not enough data", subValue: "" };
  }

  const subValue =
    percent != null ? formatPercent(percent) : "—";
  const trend =
    dollars > 0 ? "positive" : dollars < 0 ? "negative" : "neutral";

  return {
    value: `${dollars >= 0 ? "+" : ""}${formatSgd(dollars)}`,
    subValue,
    trend,
  };
}

interface GrowthSummaryCardsProps {
  summary: GrowthSummaryData;
}

export function GrowthSummaryCards({ summary }: GrowthSummaryCardsProps) {
  const plTrend =
    summary.totalPL >= 0 ? "positive" : summary.totalPL < 0 ? "negative" : "neutral";

  const periodKeys: GrowthPeriodKey[] = [
    "sinceStart",
    "1m",
    "3m",
    "6m",
    "1y",
  ];

  return (
    <section className="space-y-3">
      <SectionHeader
        title="Growth Summary"
        description="Current portfolio metrics and period-over-period growth"
      />
      <ReportingSourceLabel source="Current Dashboard Metrics · Dashboard Snapshots" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <SummaryCard
          label="Current Own Portfolio"
          value={formatSgd(summary.currentOwnPortfolio)}
          icon={<Wallet size={18} />}
          highlight
        />
        <SummaryCard
          label="Current Total Portfolio"
          value={formatSgd(summary.currentTotalPortfolio)}
          icon={<Wallet size={18} />}
        />
        <SummaryCard
          label="Total Contribution"
          value={formatSgd(summary.totalContribution)}
          icon={<PiggyBank size={18} />}
        />
        <SummaryCard
          label="Total P/L"
          value={formatSgd(summary.totalPL)}
          trend={plTrend}
          icon={
            summary.totalPL >= 0 ? (
              <TrendingUp size={18} />
            ) : (
              <TrendingDown size={18} />
            )
          }
        />
        <SummaryCard
          label="Total P/L %"
          value={formatPercent(summary.totalPLPercent)}
          trend={plTrend}
          icon={<LineChart size={18} />}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {periodKeys.map((key) => {
          const growth = summary.periodGrowth[key];
          const formatted = formatGrowthValue(
            growth.dollars,
            growth.percent,
            growth.insufficientData
          );
          return (
            <SummaryCard
              key={key}
              compact
              label={PERIOD_LABELS[key]}
              value={formatted.value}
              subValue={formatted.subValue || undefined}
              trend={formatted.trend}
            />
          );
        })}
      </div>
    </section>
  );
}
