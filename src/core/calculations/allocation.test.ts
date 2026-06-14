import { describe, expect, it } from "vitest";
import {
  calculateAssetAllocation,
  calculateAssetAllocationTotal,
} from "./allocation";
import type { PortfolioMetrics } from "@/core/domain/types";

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
    totalPortfolio: 0,
    clientOwnershipPercent: 0,
    usStockContributionSgd: 10_000,
    sgStockContributionSgd: 5_000,
    totalStockContributionSgd: 15_000,
    totalStockValueSgd: 33_500,
    stockHoldingsValueSgd: 18_500,
    stockProfitLossSgd: 3_500,
    stockAvailableTradingCashSgd: 15_000,
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
      "Total Stock Value",
      "Total Crypto Value",
      "Total Stock Available Cash",
      "Crypto Available Cash",
    ]);
    expect(items[0].value).toBe(18_500);
    expect(items[1].value).toBe(10_000);
    expect(items[2].value).toBe(15_000);
    expect(items[3].value).toBe(2_000);
  });

  it("chart total equals sum of holdings and cash legs", () => {
    const m = metrics();
    const total = calculateAssetAllocationTotal(m);

    expect(total).toBe(45_500);
    expect(total).toBe(
      m.stockHoldingsValueSgd +
        m.cryptoHoldingsValueSgd +
        m.stockAvailableTradingCashSgd +
        m.cryptoAvailableTradingCashSgd
    );
  });

  it("does not include options unrealised or client equity", () => {
    const m = metrics({ optionsValueSgd: 500, clientPortfolio: 20_000 });
    const items = calculateAssetAllocation(m);

    expect(items.reduce((sum, item) => sum + item.value, 0)).toBe(45_500);
  });
});
