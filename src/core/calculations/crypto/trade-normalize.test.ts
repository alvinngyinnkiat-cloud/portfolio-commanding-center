import { describe, expect, it } from "vitest";
import { normalizeCryptoTrade } from "./trade-normalize";

describe("normalizeCryptoTrade", () => {
  it("preserves YYYY-MM-DD dates from persistence", () => {
    const trade = normalizeCryptoTrade({
      id: "t1",
      date: "2024-03-18",
      assetName: "BTC",
      type: "buy",
      amountSgd: 1000,
    });

    expect(trade?.date).toBe("2024-03-18");
  });

  it("rejects rows without a valid date", () => {
    expect(
      normalizeCryptoTrade({
        id: "t1",
        date: "",
        assetName: "BTC",
        type: "buy",
        amountSgd: 1000,
      })
    ).toBeNull();
  });

  it("rejects locale-formatted dates from persistence", () => {
    expect(
      normalizeCryptoTrade({
        id: "t1",
        date: "15/06/2026",
        assetName: "BTC",
        type: "buy",
        amountSgd: 1000,
      })
    ).toBeNull();
  });

  it("allows legacy rows without a transaction date", () => {
    const trade = normalizeCryptoTrade({
      id: "legacy-h1",
      date: "",
      assetName: "BTC",
      type: "buy",
      amountSgd: 1000,
    });

    expect(trade?.date).toBe("");
  });
});
