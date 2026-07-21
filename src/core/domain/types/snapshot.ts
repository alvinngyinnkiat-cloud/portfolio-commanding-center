import type { PortfolioBreakdown } from "./portfolio";

export type SnapshotType = "manual" | "automatic";

/**
 * Daily snapshot for My Portfolio tracking and asset-class history.
 * Asset SGD fields mirror dashboard breakdown at capture time (from module
 * sources when available; placeholder manual values until modules ship).
 */
export interface DailySnapshot {
  date: string;
  /** Full capture timestamp (ISO 8601) */
  createdAt: string;
  snapshotType: SnapshotType;
  ownPortfolio: number;
  totalPortfolio: number;
  clientPortfolio: number;
  totalContribution: number;
  /** US Stock Holdings Value (SGD) at capture — excludes US Cash (counted in Personal Cash) */
  usStocksEtfSgd: number;
  sgStocksSgd: number;
  cryptoSgd: number;
  /** Personal Cash (My Portfolio cash component) */
  personalCashSgd: number;
  /** Legacy alias — same as personalCashSgd for chart series key `cashSgd` */
  cashSgd: number;
  /** US Stock Holdings Value (SGD) at capture — legacy snapshots stored raw US holdings */
  netOptionsMarketValueSgd?: number | null;
  /** Crypto holdings only (SGD) — chart Crypto series */
  cryptoHoldingsValueSgd?: number;
  /** All cash categories combined (SGD) — chart Personal Cash series */
  totalCashSgd?: number;
  /** Detailed cash sub-accounts + USD ref at capture (optional audit payload) */
  breakdown?: PortfolioBreakdown;
  fxRateUsed?: number;
}

/** Chart / stats series keys for Daily Portfolio Worth */
export type SnapshotChartSeries =
  | "ownPortfolio"
  | "usStocksEtfSgd"
  | "sgStocksSgd"
  | "cryptoSgd"
  | "cashSgd";
