import type { ManualPortfolioValues } from "./portfolio";

export interface DashboardSettings {
  /** App-wide USD/SGD rate — null when missing or invalid (≤ 0) */
  usdSgdFxRate: number | null;
  manualValues: ManualPortfolioValues;
  /** Broker-reported USD cash — used for display and buying capacity when set. */
  brokerUsdCashOverride: number | null;
  /** YYYY-MM-DD when broker USD cash was last confirmed. */
  brokerUsdCashLastUpdated: string | null;
  /** Set after one-time legacy crypto holding → trade synthesis. */
  cryptoLegacyTradesMigrated?: boolean;
}
