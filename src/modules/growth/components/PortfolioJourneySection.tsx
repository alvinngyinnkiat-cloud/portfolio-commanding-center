import type { PortfolioJourneyData } from "@/core/calculations/growth-reporting";
import { formatSgd, formatDate } from "@/shared/lib/format";
import { SummaryCard } from "@/shared/components/ui/SummaryCard";
import { SectionHeader } from "@/shared/components/ui/SectionHeader";
import { ReportingSourceLabel } from "./ReportingSourceLabel";
import {
  Calendar,
  Flag,
  Wallet,
  PiggyBank,
  TrendingUp,
  Clock,
} from "lucide-react";

interface PortfolioJourneySectionProps {
  journey: PortfolioJourneyData;
}

export function PortfolioJourneySection({ journey }: PortfolioJourneySectionProps) {
  return (
    <section className="space-y-3">
      <SectionHeader
        title="Portfolio Journey"
        description="Milestones since portfolio inception"
      />
      <ReportingSourceLabel source="Dashboard Snapshots · Contribution Transactions · Current Dashboard Metrics" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          compact
          label="First Snapshot Date"
          value={
            journey.firstSnapshotDate
              ? formatDate(journey.firstSnapshotDate)
              : "—"
          }
          icon={<Calendar size={16} />}
        />
        <SummaryCard
          compact
          label="First Contribution Date"
          value={
            journey.firstContributionDate
              ? formatDate(journey.firstContributionDate)
              : "—"
          }
          icon={<Flag size={16} />}
        />
        <SummaryCard
          compact
          label="Current Portfolio Value"
          value={formatSgd(journey.currentPortfolioValue)}
          icon={<Wallet size={16} />}
        />
        <SummaryCard
          compact
          label="Total Contributions"
          value={formatSgd(journey.totalContributionsSgd)}
          icon={<PiggyBank size={16} />}
        />
        <SummaryCard
          compact
          label="Total Growth"
          value={
            journey.totalGrowthSinceStart != null
              ? formatSgd(journey.totalGrowthSinceStart)
              : "Not enough data"
          }
          icon={<TrendingUp size={16} />}
        />
        <SummaryCard
          compact
          label="Days Since Portfolio Started"
          value={
            journey.daysSinceStarted != null
              ? String(journey.daysSinceStarted)
              : "—"
          }
          icon={<Clock size={16} />}
        />
      </div>
    </section>
  );
}
