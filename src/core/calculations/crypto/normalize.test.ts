import { describe, expect, it } from "vitest";
import {
  normalizeCryptoAllocationSettings,
  normalizeCryptoHolding,
} from "./normalize";

describe("normalizeCryptoHolding", () => {
  it("fills missing numeric fields with zero defaults", () => {
    const holding = normalizeCryptoHolding({
      id: "h1",
      assetName: "BTC",
    });

    expect(holding).toEqual({
      id: "h1",
      assetName: "BTC",
      investedSgd: 0,
      feesSgd: undefined,
      currentValueSgd: 0,
      notes: undefined,
    });
  });

  it("returns null when id is missing", () => {
    expect(normalizeCryptoHolding({ assetName: "ETH" })).toBeNull();
  });
});

describe("normalizeCryptoAllocationSettings", () => {
  it("merges partial settings with defaults", () => {
    expect(normalizeCryptoAllocationSettings({ topHolding: 40 })).toEqual({
      topHolding: 40,
      secondToFifth: 25,
      sixthToTenth: 15,
      others: 10,
    });
  });
});
