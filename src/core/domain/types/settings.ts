import type { ManualPortfolioValues } from "./portfolio";

export interface DashboardSettings {
  /** App-wide USD/SGD rate — null when missing or invalid (≤ 0) */
  usdSgdFxRate: number | null;
  manualValues: ManualPortfolioValues;
}
