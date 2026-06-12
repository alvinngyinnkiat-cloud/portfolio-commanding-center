import type { ManualPortfolioValues } from "./portfolio";

export interface DashboardSettings {
  usdSgdFxRate: number;
  stockCashUsd: number;
  cryptoCashSgd: number;
  manualValues: ManualPortfolioValues;
}
