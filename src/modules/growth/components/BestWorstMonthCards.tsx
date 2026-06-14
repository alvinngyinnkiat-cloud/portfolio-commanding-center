import type { BestWorstMonthData } from "@/core/calculations/growth-reporting";
import { formatSgd, formatPercent } from "@/shared/lib/format";
import { SummaryCard } from "@/shared/components/ui/SummaryCard";
import { SectionHeader } from "@/shared/components/ui/SectionHeader";
import { ReportingSourceLabel } from "./ReportingSourceLabel";
import { TrendingUp, TrendingDown } from "lucide-react";

interface BestWorstMonthCardsProps {
  data: BestWorstMonthData;
}

export function BestWorstMonthCards({ data }: BestWorstMonthCardsProps) {
  const notEnough = "Not enough data";

  return (
    <section className="space-y-3">
      <SectionHeader
        title="Best / Worst Month"
        description="Monthly growth highlights from snapshot history"
      />
      <ReportingSourceLabel source="Dashboard Snapshots" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          compact
          label="Best Month by Growth $"
          value={
            data.bestByDollars
              ? formatSgd(data.bestByDollars.value)
              : notEnough
          }
          subValue={data.bestByDollars?.month}
          trend="positive"
          icon={<TrendingUp size={16} />}
        />
        <SummaryCard
          compact
          label="Worst Month by Growth $"
          value={
            data.worstByDollars
              ? formatSgd(data.worstByDollars.value)
              : notEnough
          }
          subValue={data.worstByDollars?.month}
          trend="negative"
          icon={<TrendingDown size={16} />}
        />
        <SummaryCard
          compact
          label="Best Month by Growth %"
          value={
            data.bestByPercent
              ? formatPercent(data.bestByPercent.value)
              : notEnough
          }
          subValue={data.bestByPercent?.month}
          trend="positive"
          icon={<TrendingUp size={16} />}
        />
        <SummaryCard
          compact
          label="Worst Month by Growth %"
          value={
            data.worstByPercent
              ? formatPercent(data.worstByPercent.value)
              : notEnough
          }
          subValue={data.worstByPercent?.month}
          trend="negative"
          icon={<TrendingDown size={16} />}
        />
      </div>
    </section>
  );
}
