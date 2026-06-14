import type { DailySnapshot } from "@/core/domain/types";
import type { PortfolioMetrics } from "@/core/domain/types";

export type GrowthPeriodKey = "sinceStart" | "1m" | "3m" | "6m" | "1y";

export interface GrowthDelta {
  dollars: number | null;
  percent: number | null;
  insufficientData: boolean;
}

export interface GrowthSummaryData {
  currentOwnPortfolio: number;
  currentTotalPortfolio: number;
  totalContribution: number;
  totalPL: number;
  totalPLPercent: number;
  periodGrowth: Record<GrowthPeriodKey, GrowthDelta>;
}

export interface PortfolioGrowthChartPoint {
  date: string;
  ownPortfolio: number;
  totalPortfolio: number;
  totalContribution: number;
  totalPL: number;
}

export interface MonthlyPerformanceRow {
  month: string;
  monthLabel: string;
  startingOwnPortfolio: number;
  endingOwnPortfolio: number;
  monthlyContributionAdded: number;
  monthlyPLChange: number;
  monthlyGrowthDollars: number;
  monthlyGrowthPercent: number | null;
  snapshotCount: number;
}

export interface ContributionAnalyticsData {
  totalContributionSgd: number;
  stockContributionSgd: number;
  cryptoContributionSgd: number;
  averageMonthlyContributionSgd: number | null;
  highestMonth: { month: string; amountSgd: number } | null;
  lowestMonth: { month: string; amountSgd: number } | null;
  monthlyBars: Array<{
    month: string;
    monthLabel: string;
    stockSgd: number;
    cryptoSgd: number;
    totalSgd: number;
  }>;
}

export interface BestWorstMonthData {
  bestByDollars: { month: string; value: number } | null;
  worstByDollars: { month: string; value: number } | null;
  bestByPercent: { month: string; value: number } | null;
  worstByPercent: { month: string; value: number } | null;
  insufficientData: boolean;
}

export interface PortfolioJourneyData {
  firstSnapshotDate: string | null;
  firstContributionDate: string | null;
  currentPortfolioValue: number;
  totalContributionsSgd: number;
  totalGrowthSinceStart: number | null;
  daysSinceStarted: number | null;
}

export interface GrowthReportingInput {
  snapshots: DailySnapshot[];
  metrics: PortfolioMetrics | null;
}
