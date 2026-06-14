"use client";

import { useMemo } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import { FxRateErrorBanner } from "@/shared/components/ui/FxRateErrorBanner";
import {
  buildBestWorstMonths,
  buildContributionAnalytics,
  buildGrowthSummary,
  buildGrowthAttribution,
  buildMonthlyPerformanceTable,
  buildPortfolioGrowthChartData,
  buildPortfolioJourney,
  hasSufficientSnapshotData,
} from "@/core/calculations/growth-reporting";
import { GrowthEmptyState } from "./GrowthEmptyState";
import { GrowthSummaryCards } from "./GrowthSummaryCards";
import { GrowthAttributionSection } from "./GrowthAttributionSection";
import { PortfolioGrowthChart } from "./PortfolioGrowthChart";
import { MonthlyPerformanceTable } from "./MonthlyPerformanceTable";
import { ContributionAnalyticsSection } from "./ContributionAnalyticsSection";
import { BestWorstMonthCards } from "./BestWorstMonthCards";
import { PortfolioJourneySection } from "./PortfolioJourneySection";

export function GrowthView() {
  const { data, isLoaded } = usePortfolio();

  const reporting = useMemo(() => {
    if (!data?.metrics || !data.fxRateValid) return null;

    const snapshots = data.snapshots;
    const monthlyRows = buildMonthlyPerformanceTable(snapshots);

    return {
      attribution: buildGrowthAttribution(data.metrics),
      summary: buildGrowthSummary(snapshots, data.metrics),
      chartData: buildPortfolioGrowthChartData(snapshots),
      monthlyRows,
      contributionAnalytics: buildContributionAnalytics(data.contributions),
      bestWorst: buildBestWorstMonths(monthlyRows),
      journey: buildPortfolioJourney(
        snapshots,
        data.contributions,
        data.metrics
      ),
      hasEnoughSnapshots: hasSufficientSnapshotData(snapshots.length),
    };
  }, [data]);

  if (!isLoaded || !data) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-surface-border/50" />
        <div className="h-48 animate-pulse rounded-2xl bg-surface-border/30" />
      </div>
    );
  }

  if (!data.fxRateValid || !reporting?.summary) {
    return (
      <div className="space-y-8 pb-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Portfolio Growth
          </h1>
          <p className="text-sm text-slate-500">
            Read-only analytics · Module 6 Reporting Center
          </p>
        </header>
        <FxRateErrorBanner />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Portfolio Growth
        </h1>
        <p className="text-sm text-slate-500">
          Read-only analytics · Modules 1–5 own data · No calculations modified
        </p>
      </header>

      <GrowthSummaryCards summary={reporting.summary} />

      <GrowthAttributionSection attribution={reporting.attribution} />

      {!reporting.hasEnoughSnapshots ? (
        <GrowthEmptyState />
      ) : (
        <>
          <ContributionAnalyticsSection analytics={reporting.contributionAnalytics} />

          <PortfolioJourneySection journey={reporting.journey} />

          <PortfolioGrowthChart data={reporting.chartData} />
          <MonthlyPerformanceTable rows={reporting.monthlyRows} />
          <BestWorstMonthCards data={reporting.bestWorst} />
        </>
      )}
    </div>
  );
}
