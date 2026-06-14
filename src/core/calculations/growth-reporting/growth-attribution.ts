import type { PortfolioMetrics } from "@/core/domain/types";

export interface GrowthAttributionData {
  ownPortfolio: number;
  totalContribution: number;
  investmentGain: number;
  contributionPercent: number;
  investmentGainPercent: number;
  investmentLabel: "Investment Gain" | "Investment Loss";
  investmentPercentLabel: "Investment Gain %" | "Investment Loss %";
}

export interface GrowthAttributionChartSlice {
  name: string;
  value: number;
  color: string;
}

const CONTRIBUTION_COLOR = "#22c55e";
const GAIN_COLOR = "#3b82f6";
const LOSS_COLOR = "#ef4444";

/** Read-only attribution from current dashboard metrics. */
export function buildGrowthAttribution(
  metrics: PortfolioMetrics
): GrowthAttributionData {
  const ownPortfolio = metrics.totalPortfolioValue;
  const totalContribution = metrics.totalContribution;
  const investmentGain = ownPortfolio - totalContribution;

  const contributionPercent =
    ownPortfolio !== 0 ? (totalContribution / ownPortfolio) * 100 : 0;
  const investmentGainPercent =
    ownPortfolio !== 0 ? (investmentGain / ownPortfolio) * 100 : 0;

  const isLoss = investmentGain < 0;

  return {
    ownPortfolio,
    totalContribution,
    investmentGain,
    contributionPercent,
    investmentGainPercent,
    investmentLabel: isLoss ? "Investment Loss" : "Investment Gain",
    investmentPercentLabel: isLoss ? "Investment Loss %" : "Investment Gain %",
  };
}

/** Donut slices — positive: sum to ownPortfolio; negative: contribution + |loss| reconciles via signed gain. */
export function buildGrowthAttributionChartSlices(
  attribution: GrowthAttributionData
): GrowthAttributionChartSlice[] {
  const { ownPortfolio, totalContribution, investmentGain, investmentLabel } =
    attribution;

  if (investmentGain >= 0) {
    return [
      {
        name: "Contribution",
        value: totalContribution,
        color: CONTRIBUTION_COLOR,
      },
      {
        name: "Investment Gain",
        value: investmentGain,
        color: GAIN_COLOR,
      },
    ];
  }

  return [
    {
      name: "Contribution",
      value: totalContribution,
      color: CONTRIBUTION_COLOR,
    },
    {
      name: "Investment Loss",
      value: Math.abs(investmentGain),
      color: LOSS_COLOR,
    },
  ];
}

/** Signed reconciliation: contribution + investmentGain = ownPortfolio. */
export function reconcileAttribution(attribution: GrowthAttributionData): boolean {
  return (
    Math.abs(
      attribution.totalContribution +
        attribution.investmentGain -
        attribution.ownPortfolio
    ) < 0.01
  );
}

/** Positive case: contribution % + investment gain % = 100%. */
export function attributionPercentsSumTo100(
  attribution: GrowthAttributionData
): boolean {
  if (attribution.investmentGain < 0) return false;
  return (
    Math.abs(
      attribution.contributionPercent + attribution.investmentGainPercent - 100
    ) < 0.05
  );
}

export function attributionChartTotal(attribution: GrowthAttributionData): number {
  return attribution.ownPortfolio;
}
