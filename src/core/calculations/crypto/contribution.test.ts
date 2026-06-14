import { describe, expect, it } from "vitest";
import {
  calculateHoldingContribution,
  calculateCryptoContribution,
} from "./contribution";
import type { CryptoHolding } from "@/core/domain/types";

describe("crypto contribution", () => {
  it("sums buy amounts and fees across holdings", () => {
    const holdings: CryptoHolding[] = [
      { id: "1", assetName: "BTC", investedSgd: 500, feesSgd: 5, currentValueSgd: 600 },
      { id: "2", assetName: "ETH", investedSgd: 400, feesSgd: 2, currentValueSgd: 380 },
    ];

    expect(calculateHoldingContribution(holdings[0])).toBe(505);
    expect(calculateCryptoContribution(holdings)).toBe(907);
  });

  it("treats missing fees as zero", () => {
    const holdings: CryptoHolding[] = [
      { id: "1", assetName: "BTC", investedSgd: 500, currentValueSgd: 600 },
    ];

    expect(calculateCryptoContribution(holdings)).toBe(500);
  });
});
