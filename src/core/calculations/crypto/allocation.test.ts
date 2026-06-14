import { describe, expect, it } from "vitest";
import {
  DEFAULT_CRYPTO_ALLOCATION,
  calculateAllocationTotal,
  isAllocationValid,
  buildCashDeploymentBuckets,
} from "./allocation";

describe("allocation", () => {
  it("defaults total 100%", () => {
    expect(calculateAllocationTotal(DEFAULT_CRYPTO_ALLOCATION)).toBe(100);
    expect(isAllocationValid(DEFAULT_CRYPTO_ALLOCATION)).toBe(true);
  });

  it("detects invalid totals", () => {
    const invalid = { ...DEFAULT_CRYPTO_ALLOCATION, topHolding: 60 };
    expect(isAllocationValid(invalid)).toBe(false);
  });

  it("builds deployment buckets from crypto cash", () => {
    const buckets = buildCashDeploymentBuckets(1000, DEFAULT_CRYPTO_ALLOCATION);

    expect(buckets).toHaveLength(4);
    expect(buckets[0]).toEqual({
      label: "Top Holding",
      percent: 50,
      amountSgd: 500,
    });
    expect(buckets[1].amountSgd).toBe(250);
    expect(buckets[2].amountSgd).toBe(150);
    expect(buckets[3].amountSgd).toBe(100);
  });
});
