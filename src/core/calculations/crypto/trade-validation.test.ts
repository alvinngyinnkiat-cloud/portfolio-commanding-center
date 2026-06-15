import { describe, expect, it } from "vitest";
import { validateCryptoTradeDraft } from "./trade-validation";

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
