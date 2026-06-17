import { describe, expect, it } from "vitest";
import { calculatePortfolioMetrics } from "./portfolio";
import { emptyModuleContributionInputs } from "./portfolio-test-helpers";

describe("calculatePortfolioMetrics capital model", () => {
  it("aggregates module adapter outputs without recalculating", () => {
    const metrics = calculatePortfolioMetrics({
      ...emptyModuleContributionInputs(),
      usStocksEtfUsd: 10_000,
      sgStocksSgd: 5_000,
      cryptoSgd: 12_000,
      cryptoHoldingCount: 2,
      usdTradingCashUsd: 8_000,
      sgdTradingCashSgd: 4_200,
      cryptoCashSgd: 2_000,
      usAvailableTradingCashUsd: 8_000,
      sgAvailableTradingCashSgd: 4_200,
      clientPortfolioUsd: 0,
      clientPortfolioSgd: 0,
      clientStartingCapitalUsd: 0,
      clientStartingCapitalSgd: 0,
      clientRealizedPlUsd: 0,
      clientUnrealizedPlSgd: 0,
      fxRate: 1.35,
      contributions: [],
      totalStockContributionSgd: 15_000,
      usStockContributionSgd: 10_000,
      sgStockContributionSgd: 5_000,
      totalStockValueSgd: 33_500,
      stockHoldingsValueSgd: 18_500,
      stockProfitLossSgd: 3_500,
      stockAvailableTradingCashSgd: 15_000,
      cryptoContributionSgd: 8_000,
      totalCryptoValueSgd: 12_000,
      cryptoHoldingsValueSgd: 10_000,
      cryptoProfitLossSgd: 2_000,
      cryptoAvailableTradingCashSgd: 2_000,
      optionsValueSgd: 0,
    });

    expect(metrics.totalPortfolio).toBe(45_500);
    expect(metrics.ownPortfolio).toBe(45_500);
    expect(metrics.totalPortfolioValue).toBe(45_500);
    expect(metrics.totalContribution).toBe(23_000);
    expect(metrics.totalPL).toBe(22_500);
    expect(metrics.totalPLPercent).toBeCloseTo(97.83, 2);
    expect(metrics.totalCashSgd).toBe(17_000);
    expect(metrics.personalCashSgd).toBe(17_000);
    expect(metrics.clientCashSgd).toBe(0);
    expect(metrics.totalStockValueSgd).toBe(33_500);
    expect(metrics.totalCryptoValueSgd).toBe(12_000);
    expect(metrics.stockAvailableTradingCashSgd).toBe(15_000);
    expect(metrics.cryptoAvailableTradingCashSgd).toBe(2_000);
    expect(metrics.ownPortfolio).toBe(metrics.totalPortfolioValue);
    expect(metrics.ownPL).toBe(metrics.totalPL);
  });

  it("Own Portfolio = Total Portfolio − Client Equity", () => {
    const metrics = calculatePortfolioMetrics({
      ...emptyModuleContributionInputs(),
      usStocksEtfUsd: 0,
      sgStocksSgd: 0,
      cryptoSgd: 0,
      cryptoHoldingCount: 0,
      usdTradingCashUsd: 0,
      sgdTradingCashSgd: 0,
      cryptoCashSgd: 0,
      usAvailableTradingCashUsd: 0,
      sgAvailableTradingCashSgd: 0,
      clientPortfolioUsd: 200,
      clientPortfolioSgd: 270,
      clientStartingCapitalUsd: 0,
      clientStartingCapitalSgd: 0,
      clientRealizedPlUsd: 0,
      clientUnrealizedPlSgd: 0,
      fxRate: 1.35,
      contributions: [],
      totalStockValueSgd: 10_000,
      totalCryptoValueSgd: 5_000,
      optionsValueSgd: 270,
    });

    expect(metrics.totalPortfolio).toBe(15_000);
    expect(metrics.ownPortfolio).toBe(14_730);
    expect(metrics.totalPortfolioValue).toBe(14_730);
    expect(metrics.optionsValueSgd).toBe(0);
  });

  it("nets client realised from total portfolio", () => {
    const metrics = calculatePortfolioMetrics({
      usStocksEtfUsd: 0,
      sgStocksSgd: 0,
      cryptoSgd: 10_000,
      cryptoHoldingCount: 1,
      usdTradingCashUsd: 10_000,
      sgdTradingCashSgd: 0,
      cryptoCashSgd: 0,
      usAvailableTradingCashUsd: 10_000,
      sgAvailableTradingCashSgd: 0,
      clientPortfolioUsd: 5_400,
      clientPortfolioSgd: 7_290,
      clientStartingCapitalUsd: 4_000,
      clientStartingCapitalSgd: 5_400,
      clientRealizedPlUsd: 1_000,
      clientUnrealizedPlSgd: 135,
      fxRate: 1.35,
      contributions: [],
      totalStockContributionSgd: 0,
      usStockContributionSgd: 0,
      sgStockContributionSgd: 0,
      totalStockValueSgd: 13_500,
      stockHoldingsValueSgd: 0,
      stockProfitLossSgd: 0,
      stockAvailableTradingCashSgd: 13_500,
      cryptoContributionSgd: 0,
      totalCryptoValueSgd: 10_000,
      cryptoHoldingsValueSgd: 10_000,
      cryptoProfitLossSgd: 0,
      cryptoAvailableTradingCashSgd: 0,
      personalCashContributionSgd: 0,
      optionsValueSgd: 0,
    });

    expect(metrics.totalPortfolio).toBe(23_500);
    expect(metrics.ownPortfolio).toBeCloseTo(16_210, 2);
    expect(metrics.totalPortfolioValue).toBeCloseTo(16_210, 2);
    expect(metrics.clientPortfolio).toBe(7_290);
    expect(metrics.clientOwnershipPercent).toBeCloseTo(31.02, 1);
  });
});
