import type { ContributionTransaction } from "@/core/domain/types";
import type { PortfolioMetrics } from "@/core/domain/types";
import { calculateHistoricalTotalContributionSgd } from "./dashboard-historical-contributions";

export const PORTFOLIO_PERFORMANCE_ROUNDING_TOLERANCE = 0.01;

export interface PortfolioPerformanceLeg {
  portfolioValue: number;
  contribution: number;
  profitLoss: number;
  returnPercent: number | null;
}

export interface PortfolioPerformanceSummary {
  own: PortfolioPerformanceLeg;
  total: PortfolioPerformanceLeg;
  client: PortfolioPerformanceLeg;
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function calculateReturnPercent(
  profitLoss: number,
  contribution: number
): number | null {
  if (contribution <= 0) return null;
  const percent = (profitLoss / contribution) * 100;
  return Number.isFinite(percent) ? percent : null;
}

function buildLeg(
  portfolioValue: number,
  contribution: number
): PortfolioPerformanceLeg {
  const profitLoss = portfolioValue - contribution;
  return {
    portfolioValue,
    contribution,
    profitLoss,
    returnPercent: calculateReturnPercent(profitLoss, contribution),
  };
}

function warnReconciliationFailure(
  message: string,
  actual: number,
  expected: number
): void {
  if (process.env.NODE_ENV !== "development") return;
  console.warn(message, { actual, expected, delta: actual - expected });
}

function reconcilePortfolioPerformance(summary: PortfolioPerformanceSummary): void {
  const portfolioSum =
    summary.own.portfolioValue + summary.client.portfolioValue;
  const contributionSum =
    summary.own.contribution + summary.client.contribution;

  if (
    Math.abs(portfolioSum - summary.total.portfolioValue) >
    PORTFOLIO_PERFORMANCE_ROUNDING_TOLERANCE
  ) {
    warnReconciliationFailure(
      "Dashboard portfolio value reconciliation failed",
      portfolioSum,
      summary.total.portfolioValue
    );
  }

  if (
    Math.abs(contributionSum - summary.total.contribution) >
    PORTFOLIO_PERFORMANCE_ROUNDING_TOLERANCE
  ) {
    warnReconciliationFailure(
      "Dashboard contribution reconciliation failed",
      contributionSum,
      summary.total.contribution
    );
  }
}

export interface PortfolioPerformanceSource {
  metrics: Pick<PortfolioMetrics, "totalPortfolio" | "clientPortfolio">;
  contributions: ContributionTransaction[];
  clientContributionSgd: number;
}

export function calculatePortfolioPerformance(
  source: PortfolioPerformanceSource
): PortfolioPerformanceSummary | null {
  const { metrics, contributions, clientContributionSgd } = source;

  const totalPortfolioValue = metrics.totalPortfolio;
  const clientPortfolioValue = metrics.clientPortfolio;
  const totalContribution = calculateHistoricalTotalContributionSgd(contributions);
  const clientContribution = clientContributionSgd;

  const required = [
    totalPortfolioValue,
    clientPortfolioValue,
    totalContribution,
    clientContribution,
  ];

  if (!required.every(isFiniteNumber)) {
    return null;
  }

  const ownPortfolioValue = totalPortfolioValue - clientPortfolioValue;
  const ownContribution = totalContribution - clientContribution;

  const summary: PortfolioPerformanceSummary = {
    own: buildLeg(ownPortfolioValue, ownContribution),
    total: buildLeg(totalPortfolioValue, totalContribution),
    client: buildLeg(clientPortfolioValue, clientContribution),
  };

  reconcilePortfolioPerformance(summary);

  return summary;
}
