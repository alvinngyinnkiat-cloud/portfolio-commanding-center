/**
 * Dashboard aggregation — read-only sums of module-owned values.
 * Dashboard never owns holdings, contributions, or P/L inputs.
 */

export interface DashboardContributionInputs {
  totalStockContributionSgd: number;
  cryptoContributionSgd: number;
}

export interface DashboardPortfolioInputs {
  totalStockValueSgd: number;
  totalCryptoValueSgd: number;
}

export interface DashboardPLInputs {
  stockProfitLossSgd: number;
  cryptoProfitLossSgd: number;
}

export interface DashboardTotalPortfolioInputs {
  ownPortfolioSgd: number;
  clientStartingCapitalSgd: number;
  clientUnrealizedPlSgd: number;
}

/** Total Contribution = Stock Contribution + Crypto Contribution. */
export function aggregateTotalContribution(
  inputs: DashboardContributionInputs
): number {
  return inputs.totalStockContributionSgd + inputs.cryptoContributionSgd;
}

/**
 * Total Portfolio = Total Stock Value + Total Crypto Value.
 * Options market value is embedded in stock totals — no separate add-on.
 */
export function aggregateTotalPortfolioValue(
  inputs: DashboardPortfolioInputs
): number {
  return inputs.totalStockValueSgd + inputs.totalCryptoValueSgd;
}

/** @deprecated Client capital was previously folded into total portfolio — use stock + crypto only. */
export function aggregateTotalPortfolioWithClient(
  inputs: DashboardTotalPortfolioInputs
): number {
  return (
    inputs.ownPortfolioSgd +
    inputs.clientStartingCapitalSgd +
    inputs.clientUnrealizedPlSgd
  );
}

/** Total P/L = Stock P/L + Crypto P/L. */
export function aggregateTotalPL(inputs: DashboardPLInputs): number {
  return inputs.stockProfitLossSgd + inputs.cryptoProfitLossSgd;
}

export function aggregatePLPercent(
  totalPL: number,
  totalContribution: number
): number {
  return totalContribution > 0 ? (totalPL / totalContribution) * 100 : 0;
}

/** @deprecated use aggregateTotalPortfolioValue — legacy My Portfolio incl. cash/options */
export interface LegacyDashboardPortfolioInputs {
  stocksSgd: number;
  cryptoSgd: number;
  personalCashSgd: number;
  optionsValueSgd: number;
}

export function aggregateMyPortfolio(
  inputs: LegacyDashboardPortfolioInputs
): number {
  return (
    inputs.stocksSgd +
    inputs.cryptoSgd +
    inputs.personalCashSgd +
    inputs.optionsValueSgd
  );
}

/** @deprecated use aggregateTotalPL */
export function aggregateMyPL(
  myPortfolio: number,
  totalContribution: number
): { ownPL: number; ownPLPercent: number } {
  const ownPL = myPortfolio - totalContribution;
  const ownPLPercent =
    totalContribution > 0 ? (ownPL / totalContribution) * 100 : 0;
  return { ownPL, ownPLPercent };
}
