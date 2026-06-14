import { describe, expect, it } from "vitest";
import type { CryptoHolding } from "@/core/domain/types";
import {
  buildCryptoHoldingRows,
  getHoldingCategory,
  calculateProfitLossSgd,
  calculateProfitLossPercent,
  calculatePortfolioPercent,
} from "./holdings";

const sampleHoldings: CryptoHolding[] = [
  { id: "1", assetName: "BTC", investedSgd: 500, currentValueSgd: 620 },
  { id: "2", assetName: "ETH", investedSgd: 400, currentValueSgd: 380 },
  { id: "3", assetName: "HYPE", investedSgd: 282, currentValueSgd: 650 },
];

describe("getHoldingCategory", () => {
  it("assigns correct categories by rank", () => {
    expect(getHoldingCategory(1)).toBe("Top Holding");
    expect(getHoldingCategory(2)).toBe("2nd–5th Holdings");
    expect(getHoldingCategory(5)).toBe("2nd–5th Holdings");
    expect(getHoldingCategory(6)).toBe("6th–10th Holdings");
    expect(getHoldingCategory(10)).toBe("6th–10th Holdings");
    expect(getHoldingCategory(11)).toBe("Others");
  });
});

describe("calculateProfitLossSgd", () => {
  it("returns current minus contribution (buy + fees)", () => {
    expect(calculateProfitLossSgd(620, 510)).toBe(110);
    expect(calculateProfitLossSgd(380, 400)).toBe(-20);
  });
});

describe("calculateProfitLossPercent", () => {
  it("returns percentage of invested", () => {
    expect(calculateProfitLossPercent(120, 500)).toBe(24);
  });

  it("returns 0 when invested is 0", () => {
    expect(calculateProfitLossPercent(100, 0)).toBe(0);
  });
});

describe("calculatePortfolioPercent", () => {
  it("uses total holdings as denominator", () => {
    expect(calculatePortfolioPercent(650, 1650)).toBeCloseTo(39.3939, 2);
  });

  it("returns 0 when total holdings is 0", () => {
    expect(calculatePortfolioPercent(100, 0)).toBe(0);
  });
});

describe("buildCryptoHoldingRows", () => {
  it("sorts by current value descending and assigns ranks", () => {
    const rows = buildCryptoHoldingRows(sampleHoldings);

    expect(rows.map((r) => r.assetName)).toEqual(["HYPE", "BTC", "ETH"]);
    expect(rows[0].rank).toBe(1);
    expect(rows[0].category).toBe("Top Holding");
    expect(rows[1].rank).toBe(2);
    expect(rows[1].category).toBe("2nd–5th Holdings");
  });

  it("calculates P/L and portfolio percent using contribution", () => {
    const rows = buildCryptoHoldingRows(sampleHoldings);
    const hype = rows.find((r) => r.assetName === "HYPE")!;

    expect(hype.contributionSgd).toBe(282);
    expect(hype.profitLossSgd).toBe(368);
    expect(hype.profitLossPercent).toBeCloseTo(130.496, 1);
    expect(hype.portfolioPercent).toBeCloseTo(39.39, 1);
  });
});
