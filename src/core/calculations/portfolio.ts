import type {
  PortfolioInputs,
  PortfolioMetrics,
  PortfolioBreakdown,
} from "@/core/domain/types";
import { usdToSgd, calculateTotalCashSgd } from "./fx";
import {
  calculateStockDeposits,
  calculateCryptoDeposits,
  calculateWithdrawals,
} from "./contributions";

export function buildPortfolioBreakdown(
  inputs: PortfolioInputs,
  metrics: Pick<
    PortfolioMetrics,
    | "usStocksEtfSgd"
    | "usStocksEtfUsd"
    | "sgStocksSgd"
    | "cryptoSgd"
    | "totalCashSgd"
  >
): PortfolioBreakdown {
  return {
    usStocksEtfSgd: metrics.usStocksEtfSgd,
    usStocksEtfUsd: metrics.usStocksEtfUsd,
    sgStocksSgd: metrics.sgStocksSgd,
    cryptoSgd: metrics.cryptoSgd,
    totalCashSgd: metrics.totalCashSgd,
    stockCashUsd: inputs.stockCashUsd,
    cryptoCashSgd: inputs.cryptoCashSgd,
  };
}

export function calculatePortfolioMetrics(
  inputs: PortfolioInputs
): PortfolioMetrics {
  const usStocksEtfUsd = inputs.usStocksEtfUsd;
  const usStocksEtfSgd = usdToSgd(usStocksEtfUsd, inputs.fxRate);
  const sgStocksSgd = inputs.sgStocksSgd;
  const cryptoSgd = inputs.cryptoSgd;
  const stockCashSgd = usdToSgd(inputs.stockCashUsd, inputs.fxRate);
  const totalCashSgd = calculateTotalCashSgd(
    inputs.stockCashUsd,
    inputs.cryptoCashSgd,
    inputs.fxRate
  );

  const totalPortfolio =
    usStocksEtfSgd + sgStocksSgd + cryptoSgd + totalCashSgd;

  const clientPortfolio = inputs.clientPortfolioSgd;
  const ownPortfolio = totalPortfolio - clientPortfolio;

  const stockDeposits = calculateStockDeposits(inputs.contributions);
  const cryptoDeposits = calculateCryptoDeposits(inputs.contributions);
  const withdrawals = calculateWithdrawals(inputs.contributions);
  const totalContribution = stockDeposits + cryptoDeposits - withdrawals;

  const ownPL = ownPortfolio - totalContribution;
  const ownPLPercent =
    totalContribution > 0 ? (ownPL / totalContribution) * 100 : 0;

  return {
    usStocksEtfSgd,
    usStocksEtfUsd,
    sgStocksSgd,
    cryptoSgd,
    totalCashSgd,
    stockCashSgd,
    totalPortfolio,
    clientPortfolio,
    ownPortfolio,
    stockDeposits,
    cryptoDeposits,
    withdrawals,
    totalContribution,
    ownPL,
    ownPLPercent,
  };
}
