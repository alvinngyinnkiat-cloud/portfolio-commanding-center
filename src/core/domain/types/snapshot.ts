import type { PortfolioBreakdown } from "./portfolio";

export interface DailySnapshot {
  date: string;
  ownPortfolio: number;
  totalPortfolio: number;
  clientPortfolio: number;
  totalContribution: number;
  /** Stored at capture time for historical accuracy (mirrors Supabase breakdown_json) */
  breakdown?: PortfolioBreakdown;
  fxRateUsed?: number;
}
