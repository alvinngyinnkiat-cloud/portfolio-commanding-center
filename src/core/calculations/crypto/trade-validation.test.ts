import { describe, expect, it } from "vitest";
import { validateCryptoTradeDraft, cryptoTradeToDraft } from "./trade-validation";

describe("validateCryptoTradeDraft", () => {
  const base = {
    assetName: "BTC",
    type: "buy" as const,
    amountSgd: "1000",
    feesSgd: "0",
    notes: "",
  };

  it("accepts YYYY-MM-DD from HTML date input", () => {
    const result = validateCryptoTradeDraft({ ...base, date: "2026-06-15" });
    expect(result.valid).toBe(true);
    expect(result.values?.date).toBe("2026-06-15");
  });

  it("rejects locale date strings and blocks save", () => {
    const result = validateCryptoTradeDraft({ ...base, date: "15/06/2026" });
    expect(result.valid).toBe(false);
    expect(result.errors.date).toBeDefined();
    expect(result.values).toBeUndefined();
  });

  it("rejects missing date", () => {
    const result = validateCryptoTradeDraft({ ...base, date: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.date).toBeDefined();
  });
});

describe("cryptoTradeToDraft", () => {
  it("maps persisted trade fields to form draft", () => {
    const draft = cryptoTradeToDraft({
      id: "t1",
      date: "2026-06-15",
      assetName: "BTC",
      type: "buy",
      amountSgd: 500,
      feesSgd: 2.5,
      notes: "note",
      createdAt: "2026-06-15T00:00:00.000Z",
    });

    expect(draft).toEqual({
      date: "2026-06-15",
      assetName: "BTC",
      type: "buy",
      amountSgd: "500",
      feesSgd: "2.5",
      notes: "note",
    });
  });
});
