import type { ContributionTransaction } from "./contribution";
import type { Goal } from "./goal";

/** Placeholder manual values — replaced by Stock/Client modules in future phases */
export interface ManualPortfolioValues {
  usStocksEtfUsd: number;
  sgStocksSgd: number;
  cryptoSgd: number;
  /** Legacy manual client USD — superseded by Options Tracker Client Summary when set */
  clientPortfolioUsd: number;
}

export interface CashBalances {
  usdTradingCashUsd: number;
  sgdTradingCashSgd: number;
  cryptoCashSgd: number;
}

/** Boundary type between data sources and calculation layer */
export interface PortfolioInputs {
  usStocksEtfUsd: number;
  sgStocksSgd: number;
  cryptoSgd: number;
  cryptoHoldingCount: number;
  usdTradingCashUsd: number;
  sgdTradingCashSgd: number;
  cryptoCashSgd: number;
  /** Module 2 — US Available Cash Engine (USD) */
  usAvailableTradingCashUsd: number;
  /** Module 2 — SG Available Cash (SGD) */
  sgAvailableTradingCashSgd: number;
  clientPortfolioUsd: number;
  clientPortfolioSgd: number;
  /** Options Client Summary — for Total Portfolio netting (not full equity) */
  clientStartingCapitalUsd: number;
  clientStartingCapitalSgd: number;
  clientRealizedPlUsd: number;
  clientUnrealizedPlSgd: number;
  fxRate: number;
  contributions: ContributionTransaction[];
  /** Module 2 — capital deployed (buy + fees from ledger) */
  totalStockContributionSgd: number;
  usStockContributionSgd: number;
  sgStockContributionSgd: number;
  /** Module 2 — capital model outputs (adapter pass-through) */
  totalStockValueSgd: number;
  stockHoldingsValueSgd: number;
  stockProfitLossSgd: number;
  stockAvailableTradingCashSgd: number;
  usMarketValueSgd: number;
  sgMarketValueSgd: number;
  /** Module 3 — capital deployed (buy + fees) */
  cryptoContributionSgd: number;
  /** Module 3 — capital model outputs (adapter pass-through) */
  totalCryptoValueSgd: number;
  cryptoHoldingsValueSgd: number;
  cryptoProfitLossSgd: number;
  cryptoAvailableTradingCashSgd: number;
  /** Personal cash capital injected */
  personalCashContributionSgd: number;
  /** @deprecated Options unrealised P/L is not added separately — embedded in stock value */
  optionsValueSgd: number;
}

export interface PortfolioMetrics {
  usStocksEtfSgd: number;
  usStocksEtfUsd: number;
  sgStocksSgd: number;
  cryptoSgd: number;
  cryptoHoldingCount: number;
  totalCashSgd: number;
  personalCashSgd: number;
  clientCashSgd: number;
  usdTradingCashUsd: number;
  usdTradingCashSgd: number;
  sgdTradingCashSgd: number;
  cryptoCashSgd: number;
  clientPortfolio: number;
  clientPortfolioUsd: number;
  /** Total Portfolio = US + SG + Crypto net value (holdings + cash per module) */
  totalPortfolio: number;
  clientOwnershipPercent: number;
  /** Module 2 — capital deployed (US + SG legs from ledger) */
  usStockContributionSgd: number;
  sgStockContributionSgd: number;
  totalStockContributionSgd: number;
  /** Module 2 — capital model (adapter pass-through) */
  totalStockValueSgd: number;
  stockHoldingsValueSgd: number;
  stockProfitLossSgd: number;
  stockAvailableTradingCashSgd: number;
  usMarketValueSgd: number;
  sgMarketValueSgd: number;
  /** Module 3 — capital deployed */
  cryptoContributionSgd: number;
  /** Module 3 — capital model (adapter pass-through) */
  totalCryptoValueSgd: number;
  cryptoHoldingsValueSgd: number;
  cryptoProfitLossSgd: number;
  cryptoAvailableTradingCashSgd: number;
  /** Personal cash capital injected */
  personalCashContributionSgd: number;
  /** @deprecated Options unrealised P/L is not added separately — embedded in stock value */
  optionsValueSgd: number;
  /** Stock Contribution + Crypto Contribution */
  totalContribution: number;
  /** Own Portfolio = Total Portfolio − Client Equity */
  totalPortfolioValue: number;
  /** Stock P/L + Crypto P/L */
  totalPL: number;
  totalPLPercent: number;
  /** @deprecated use totalPL — kept for snapshot/chart compatibility */
  ownPL: number;
  /** @deprecated use totalPLPercent */
  ownPLPercent: number;
  /** @deprecated use totalPortfolioValue — kept for goal/snapshot compatibility */
  ownPortfolio: number;
  usdOverdeploymentUsd: number;
}

export interface PortfolioBreakdown {
  usStocksEtfSgd: number;
  usStocksEtfUsd: number;
  sgStocksSgd: number;
  cryptoSgd: number;
  totalCashSgd: number;
  personalCashSgd: number;
  clientCashSgd: number;
  usdTradingCashUsd: number;
  sgdTradingCashSgd: number;
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

export interface StockAllocationPreview {
  usdAllocationPercent: number;
  sgdAllocationPercent: number;
  usdAmountSgd: number;
  sgdAmountSgd: number;
  usdAmountUsd: number;
}

export interface ContributionCashImpact {
  usdTradingCashUsd: number;
  sgdTradingCashSgd: number;
  cryptoCashSgd: number;
}
