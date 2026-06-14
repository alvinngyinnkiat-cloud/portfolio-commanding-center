import { describe, expect, it } from "vitest";

import {
  aggregatePLPercent,
  aggregateTotalContribution,
  aggregateTotalPL,
  aggregateTotalPortfolioValue,
  aggregateTotalPortfolioWithClient,
} from "./dashboard-aggregation";

describe("dashboard aggregation", () => {
  it("Total Contribution = Stock Contribution + Crypto Contribution", () => {
    const total = aggregateTotalContribution({
      totalStockContributionSgd: 14_800,
      cryptoContributionSgd: 5_000,
    });

    expect(total).toBe(19_800);
  });

  it("Own Portfolio = Stock + Crypto + Personal Options Unrealised P/L", () => {
    const total = aggregateTotalPortfolioValue({
      totalStockValueSgd: 33_500,
      totalCryptoValueSgd: 12_000,
      optionsValueSgd: 270,
    });

    expect(total).toBe(45_770);
  });

  it("Total Portfolio excludes client realised already in US cash", () => {
    const total = aggregateTotalPortfolioWithClient({
      ownPortfolioSgd: 45_500,
      clientStartingCapitalSgd: 5_400,
      clientUnrealizedPlSgd: 135,
    });

    expect(total).toBe(51_035);
  });

  it("Total P/L = Stock P/L + Crypto P/L", () => {
    const totalPL = aggregateTotalPL({
      stockProfitLossSgd: 2_500,
      cryptoProfitLossSgd: -800,
    });

    expect(totalPL).toBe(1_700);
  });

  it("Total P/L % = Total P/L ÷ Total Contribution × 100", () => {
    const totalPL = 1_700;
    const totalContribution = 19_800;
    const percent = aggregatePLPercent(totalPL, totalContribution);

    expect(percent).toBeCloseTo(8.59, 2);
  });
});
