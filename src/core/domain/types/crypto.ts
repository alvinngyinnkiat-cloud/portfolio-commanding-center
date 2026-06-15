export interface CryptoHolding {

  id: string;

  assetName: string;

  /** Buy transaction amount (capital injected into this holding). */

  investedSgd: number;

  /** Associated fees for the buy transaction. */

  feesSgd?: number;

  currentValueSgd: number;

  notes?: string;

}



export type CryptoTradeType = "buy" | "sell";



export interface CryptoTrade {

  id: string;

  date: string;

  assetName: string;

  type: CryptoTradeType;

  amountSgd: number;

  feesSgd?: number;

  notes?: string;

  createdAt?: string;

}



export type CryptoHoldingCategory =

  | "Top Holding"

  | "2nd–5th Holdings"

  | "6th–10th Holdings"

  | "Others";



export interface CryptoAllocationSettings {

  topHolding: number;

  secondToFifth: number;

  sixthToTenth: number;

  others: number;

}



export interface CryptoHoldingRow extends CryptoHolding {

  rank: number;

  category: CryptoHoldingCategory;

  contributionSgd: number;

  profitLossSgd: number;

  profitLossPercent: number;

  portfolioPercent: number;

}



export interface CryptoTrackerSummary {

  totalValueSgd: number;

  cryptoHoldingsValueSgd: number;

  cryptoContributionSgd: number;

  availableTradingCashSgd: number;

  totalCryptoCashContributed: number;

  cryptoProfitLossSgd: number;

  cryptoProfitLossPercent: number;

  holdingCount: number;

  /** Informational — sum of all trade fees; not used in portfolio math. */
  totalFeesPaidSgd: number;

  feesThisMonthSgd: number;

  feesThisYearSgd: number;

}



/** Prepared outputs for future Dashboard integration. */

export interface DashboardCryptoOutputs {

  cryptoTotalValueSgd: number;

  cryptoHoldingsValueSgd: number;

  cryptoContributionSgd: number;

  cryptoProfitLossSgd: number;

  availableTradingCashSgd: number;

  numberOfHoldings: number;

}



export interface CryptoAllocationBucket {

  label: string;

  percent: number;

  amountSgd: number;

}


