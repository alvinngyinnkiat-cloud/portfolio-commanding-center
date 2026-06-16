import type {
  PortfolioInputs,
  PortfolioMetrics,
  PortfolioBreakdown,
} from "@/core/domain/types";
import { usdToSgd } from "./fx";
import {
  aggregateTotalContribution,
  aggregateTotalPortfolioValue,
  aggregatePLPercent,
} from "./dashboard-aggregation";
import { calculateUsdOverdeployment } from "./contribution-cash";
import { normalizeCashBalances } from "@/core/domain/defaults";
import { calculateClientOwnershipPercent } from "./cash-split";

export function buildPortfolioBreakdown(
  inputs: PortfolioInputs,
  metrics: Pick<
    PortfolioMetrics,
    | "usStocksEtfSgd"
    | "usStocksEtfUsd"
    | "sgStocksSgd"
    | "cryptoSgd"
    | "totalCashSgd"
    | "personalCashSgd"
    | "clientCashSgd"
  >
): PortfolioBreakdown {
  return {
    usStocksEtfSgd: metrics.usStocksEtfSgd,
    usStocksEtfUsd: metrics.usStocksEtfUsd,
    sgStocksSgd: metrics.sgStocksSgd,
    cryptoSgd: metrics.cryptoSgd,
    totalCashSgd: metrics.totalCashSgd,
    personalCashSgd: metrics.personalCashSgd,
    clientCashSgd: metrics.clientCashSgd,
    ...normalizeCashBalances({
      usdTradingCashUsd: inputs.usAvailableTradingCashUsd,
      sgdTradingCashSgd: inputs.sgAvailableTradingCashSgd,
      cryptoCashSgd: inputs.cryptoAvailableTradingCashSgd,
    }),
  };
}

export function calculateClientPortfolioSgd(
  clientPortfolioUsd: number | undefined,
  fxRate: number
): number {
  return usdToSgd(clientPortfolioUsd ?? 0, fxRate);
}

export function calculatePortfolioMetrics(
  inputs: PortfolioInputs
): PortfolioMetrics {
  const usStocksEtfUsd = inputs.usStocksEtfUsd;
  const usStocksEtfSgd = usdToSgd(usStocksEtfUsd, inputs.fxRate);
  const sgStocksSgd = inputs.sgStocksSgd;
  const cryptoSgd = inputs.totalCryptoValueSgd;
  const cryptoHoldingCount = inputs.cryptoHoldingCount;

  const usdTradingCashUsd = inputs.usAvailableTradingCashUsd;
  const usdTradingCashSgd = usdToSgd(usdTradingCashUsd, inputs.fxRate);
  const sgdTradingCashSgd = inputs.sgAvailableTradingCashSgd;
  const cryptoCashSgd = inputs.cryptoAvailableTradingCashSgd;

  const totalCashSgd =
    usdTradingCashSgd + sgdTradingCashSgd + cryptoCashSgd;

  const clientPortfolio = inputs.clientPortfolioSgd;
  const clientPortfolioUsd = inputs.clientPortfolioUsd;
  const personalCashSgd = totalCashSgd;
  const clientCashSgd = 0;

  const totalPortfolio = aggregateTotalPortfolioValue({
    totalStockValueSgd: inputs.totalStockValueSgd,
    totalCryptoValueSgd: inputs.totalCryptoValueSgd,
  });

  const clientEquity = clientPortfolio;
  const ownPortfolio = totalPortfolio - clientEquity;

  const totalContribution = aggregateTotalContribution({
    totalStockContributionSgd: inputs.totalStockContributionSgd,
    cryptoContributionSgd: inputs.cryptoContributionSgd,
  });

  const totalPortfolioValue = ownPortfolio;
  const totalPL = totalPortfolioValue - totalContribution;
  const totalPLPercent = aggregatePLPercent(totalPL, totalContribution);

  const clientOwnershipPercent = calculateClientOwnershipPercent(
    clientEquity,
    totalPortfolio
  );

  const usdOverdeploymentUsd = calculateUsdOverdeployment(
    usStocksEtfUsd,
    usdTradingCashUsd
  );

  return {
    usStocksEtfSgd,
    usStocksEtfUsd,
    sgStocksSgd,
    cryptoSgd,
    cryptoHoldingCount,
    totalCashSgd,
    personalCashSgd,
    clientCashSgd,
    usdTradingCashUsd,
    usdTradingCashSgd,
    sgdTradingCashSgd,
    cryptoCashSgd,
    clientPortfolio,
    clientPortfolioUsd,
    totalPortfolio,
    clientOwnershipPercent,
    usStockContributionSgd: inputs.usStockContributionSgd,
    sgStockContributionSgd: inputs.sgStockContributionSgd,
    totalStockContributionSgd: inputs.totalStockContributionSgd,
    totalStockValueSgd: inputs.totalStockValueSgd,
    stockHoldingsValueSgd: inputs.stockHoldingsValueSgd,
    stockProfitLossSgd: inputs.stockProfitLossSgd,
    stockAvailableTradingCashSgd: inputs.stockAvailableTradingCashSgd,
    usMarketValueSgd: inputs.usMarketValueSgd,
    sgMarketValueSgd: inputs.sgMarketValueSgd,
    cryptoContributionSgd: inputs.cryptoContributionSgd,
    totalCryptoValueSgd: inputs.totalCryptoValueSgd,
    cryptoHoldingsValueSgd: inputs.cryptoHoldingsValueSgd,
    cryptoProfitLossSgd: inputs.cryptoProfitLossSgd,
    cryptoAvailableTradingCashSgd: inputs.cryptoAvailableTradingCashSgd,
    personalCashContributionSgd: inputs.personalCashContributionSgd,
    optionsValueSgd: 0,
    totalContribution,
    totalPortfolioValue,
    totalPL,
    totalPLPercent,
    ownPL: totalPL,
    ownPLPercent: totalPLPercent,
    ownPortfolio,
    usdOverdeploymentUsd,
  };
}
