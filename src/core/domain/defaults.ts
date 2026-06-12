import type { ContributionTransaction } from "./types/contribution";
import type { Goal } from "./types/goal";
import type { DailySnapshot } from "./types/snapshot";
import type { DashboardSettings } from "./types/settings";

export const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
  usdSgdFxRate: 1.35,
  stockCashUsd: 5000,
  cryptoCashSgd: 2000,
  manualValues: {
    usStocksEtfUsd: 50000,
    sgStocksSgd: 30000,
    cryptoSgd: 15000,
    clientPortfolioSgd: 20000,
    clientPortfolioUsd: 15000,
  },
};

export const DEFAULT_CONTRIBUTIONS: ContributionTransaction[] = [
  {
    id: "contrib-1",
    date: "2025-01-15",
    type: "deposit",
    category: "stock",
    amountSgd: 10000,
    notes: "Initial stock deposit",
  },
  {
    id: "contrib-2",
    date: "2025-02-10",
    type: "deposit",
    category: "crypto",
    amountSgd: 5000,
    notes: "Crypto deposit",
  },
  {
    id: "contrib-3",
    date: "2025-03-05",
    type: "deposit",
    category: "stock",
    amountSgd: 8000,
    notes: "Monthly stock deposit",
  },
];

export const DEFAULT_GOALS: Goal[] = [
  {
    id: "goal-1",
    name: "First $100K",
    targetAmountSgd: 100000,
    targetDate: "2026-12-31",
    active: true,
  },
  {
    id: "goal-2",
    name: "Retirement Fund",
    targetAmountSgd: 500000,
    active: true,
  },
];

export const DEFAULT_SNAPSHOTS: DailySnapshot[] = [
  { date: "2025-06-01", ownPortfolio: 85000, totalPortfolio: 105000, clientPortfolio: 20000, totalContribution: 20000 },
  { date: "2025-06-02", ownPortfolio: 85200, totalPortfolio: 105200, clientPortfolio: 20000, totalContribution: 20000 },
  { date: "2025-06-03", ownPortfolio: 84800, totalPortfolio: 104800, clientPortfolio: 20000, totalContribution: 20000 },
  { date: "2025-06-04", ownPortfolio: 85500, totalPortfolio: 105500, clientPortfolio: 20000, totalContribution: 20000 },
  { date: "2025-06-05", ownPortfolio: 86000, totalPortfolio: 106000, clientPortfolio: 20000, totalContribution: 20000 },
  { date: "2025-06-06", ownPortfolio: 85800, totalPortfolio: 105800, clientPortfolio: 20000, totalContribution: 20000 },
  { date: "2025-06-07", ownPortfolio: 86200, totalPortfolio: 106200, clientPortfolio: 20000, totalContribution: 20000 },
  { date: "2025-06-08", ownPortfolio: 86500, totalPortfolio: 106500, clientPortfolio: 20000, totalContribution: 20000 },
  { date: "2025-06-09", ownPortfolio: 86300, totalPortfolio: 106300, clientPortfolio: 20000, totalContribution: 20000 },
  { date: "2025-06-10", ownPortfolio: 86800, totalPortfolio: 106800, clientPortfolio: 20000, totalContribution: 20000 },
  { date: "2025-06-11", ownPortfolio: 87000, totalPortfolio: 107000, clientPortfolio: 20000, totalContribution: 20000 },
  { date: "2025-06-12", ownPortfolio: 87200, totalPortfolio: 107200, clientPortfolio: 20000, totalContribution: 23000 },
];
