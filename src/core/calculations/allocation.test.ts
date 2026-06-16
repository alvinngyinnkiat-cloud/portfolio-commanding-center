import { describe, expect, it } from "vitest";
import {
  calculateAssetAllocation,
  calculateAssetAllocationTotal,
} from "./allocation";
import { calculatePortfolioMetrics } from "./portfolio";
import type { PortfolioMetrics } from "@/core/domain/types";
import { emptyModuleContributionInputs } from "./portfolio-test-helpers";

function metrics(
  overrides: Partial<PortfolioMetrics> = {}
): PortfolioMetrics {
  return {
    usStocksEtfSgd: 13_500,
    usStocksEtfUsd: 10_000,
    sgStocksSgd: 5_000,
    cryptoSgd: 12_000,
    cryptoHoldingCount: 2,
    totalCashSgd: 17_000,
    personalCashSgd: 17_000,
    clientCashSgd: 0,
    usdTradingCashUsd: 8_000,
    usdTradingCashSgd: 10_800,
    sgdTradingCashSgd: 4_200,
    cryptoCashSgd: 2_000,
    clientPortfolio: 0,
    clientPortfolioUsd: 0,
    totalPortfolio: 45_500,
    clientOwnershipPercent: 0,
    usStockContributionSgd: 10_000,
    sgStockContributionSgd: 5_000,
    totalStockContributionSgd: 15_000,
    totalStockValueSgd: 33_500,
    stockHoldingsValueSgd: 18_500,
    stockProfitLossSgd: 3_500,
    stockAvailableTradingCashSgd: 15_000,
    usMarketValueSgd: 24_300,
    sgMarketValueSgd: 9_200,
    cryptoContributionSgd: 8_000,
    totalCryptoValueSgd: 12_000,
    cryptoHoldingsValueSgd: 10_000,
    cryptoProfitLossSgd: 2_000,
    cryptoAvailableTradingCashSgd: 2_000,
    personalCashContributionSgd: 0,
    optionsValueSgd: 0,
    totalContribution: 23_000,
    totalPortfolioValue: 45_500,
    totalPL: 22_500,
    totalPLPercent: 97.83,
    ownPL: 22_500,
    ownPLPercent: 97.83,
    ownPortfolio: 45_500,
    usdOverdeploymentUsd: 0,
    ...overrides,
  };
}

describe("calculateAssetAllocation", () => {
  it("returns four module-owned components", () => {
    const items = calculateAssetAllocation(metrics());

    expect(items).toHaveLength(4);
    expect(items.map((item) => item.name)).toEqual([
      "US Holding Value (SGD)",
      "SG Holding Value (SGD)",
      "Crypto Holding Value (SGD)",
      "Total Cash",
    ]);
    expect(items[0].value).toBe(13_500);
    expect(items[1].value).toBe(5_000);
    expect(items[2].value).toBe(10_000);
    expect(items[3].value).toBe(17_000);
  });

  it("chart total equals holdings plus combined cash", () => {
    const m = metrics();
    const total = calculateAssetAllocationTotal(m);

    expect(total).toBe(45_500);
    expect(total).toBe(
      m.usStocksEtfSgd +
        m.sgStocksSgd +
        m.cryptoHoldingsValueSgd +
        m.totalCashSgd
    );
  });

  it("Total Cash equals US + SG + Crypto cash in SGD", () => {
    const m = metrics();
    expect(m.totalCashSgd).toBe(
      m.usdTradingCashSgd + m.sgdTradingCashSgd + m.cryptoCashSgd
    );
  });

  it("allocation total matches Total Portfolio net-value formula", () => {
    const computed = calculatePortfolioMetrics({
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
      clientPortfolioUsd: 5_000,
      clientPortfolioSgd: 6_750,
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
      usMarketValueSgd: 24_300,
      sgMarketValueSgd: 9_200,
      cryptoContributionSgd: 8_000,
      totalCryptoValueSgd: 12_000,
      cryptoHoldingsValueSgd: 10_000,
      cryptoProfitLossSgd: 2_000,
      cryptoAvailableTradingCashSgd: 2_000,
      optionsValueSgd: 0,
    });

    const allocationTotal = calculateAssetAllocationTotal(computed);
    const totalUsNet = computed.usStocksEtfSgd + computed.usdTradingCashSgd;
    const totalSgNet = computed.sgStocksSgd + computed.sgdTradingCashSgd;
    const totalCryptoNet =
      computed.cryptoHoldingsValueSgd + computed.cryptoCashSgd;

    expect(allocationTotal).toBe(totalUsNet + totalSgNet + totalCryptoNet);
    expect(computed.totalPortfolio).toBe(allocationTotal);
    expect(computed.ownPortfolio).toBe(
      computed.totalPortfolio - computed.clientPortfolio
    );
    expect(computed.clientOwnershipPercent).toBeCloseTo(
      (computed.clientPortfolio / computed.totalPortfolio) * 100,
      2
    );
  });

  it("does not include client equity as an allocation slice", () => {
    const m = metrics({ clientPortfolio: 20_000, totalPortfolio: 45_500 });
    const items = calculateAssetAllocation(m);

    expect(items.reduce((sum, item) => sum + item.value, 0)).toBe(45_500);
    expect(items.some((item) => item.name.toLowerCase().includes("client"))).toBe(
      false
    );
  });
});
