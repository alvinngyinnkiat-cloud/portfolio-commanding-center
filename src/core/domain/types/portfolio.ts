import type { ContributionTransaction } from "./contribution";
import type { Goal } from "./goal";

/** Placeholder manual values — replaced by Stock/Client modules in future phases */
export interface ManualPortfolioValues {
  usStocksEtfUsd: number;
  sgStocksSgd: number;
  cryptoSgd: number;
  clientPortfolioSgd: number;
  clientPortfolioUsd: number;
}

/** Boundary type between data sources and calculation layer */
export interface PortfolioInputs {
  usStocksEtfUsd: number;
  sgStocksSgd: number;
  cryptoSgd: number;
  stockCashUsd: number;
  cryptoCashSgd: number;
  clientPortfolioSgd: number;
  clientPortfolioUsd: number;
  fxRate: number;
  contributions: ContributionTransaction[];
}

export interface PortfolioMetrics {
  usStocksEtfSgd: number;
  usStocksEtfUsd: number;
  sgStocksSgd: number;
  cryptoSgd: number;
  totalCashSgd: number;
  stockCashSgd: number;
  totalPortfolio: number;
  clientPortfolio: number;
  ownPortfolio: number;
  stockDeposits: number;
  cryptoDeposits: number;
  withdrawals: number;
  totalContribution: number;
  ownPL: number;
  ownPLPercent: number;
}

export interface PortfolioBreakdown {
  usStocksEtfSgd: number;
  usStocksEtfUsd: number;
  sgStocksSgd: number;
  cryptoSgd: number;
  totalCashSgd: number;
  stockCashUsd: number;
  cryptoCashSgd: number;
}

export interface AssetAllocationItem {
  name: string;
  value: number;
  color: string;
}

export interface GoalProgress {
  goal: Goal;
  currentOwnPortfolio: number;
  remaining: number;
  progressPercent: number;
}
