import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCANNER_WATCHLIST,
  getActiveWatchlistEntries,
  resolveFetchSymbol,
  SCANNER_CATEGORIES,
} from "./watchlist";

describe("scanner watchlist", () => {
  it("maps XSP display ticker to ^XSP fetch symbol", () => {
    const xsp = DEFAULT_SCANNER_WATCHLIST.find((row) => row.ticker === "XSP");
    expect(xsp).toBeDefined();
    expect(xsp?.fetchSymbol).toBe("^XSP");
    expect(xsp?.ticker).toBe("XSP");
  });

  it("forces ^XSP when stored fetch symbol is wrong", () => {
    expect(resolveFetchSymbol("XSP", "XSP")).toBe("^XSP");
  });

  it("returns only active entries for scanning", () => {
    const entries = DEFAULT_SCANNER_WATCHLIST.map((row, index) => ({
      ...row,
      active: index !== 0,
    }));
    const active = getActiveWatchlistEntries(entries);
    expect(active).toHaveLength(DEFAULT_SCANNER_WATCHLIST.length - 1);
    expect(active.some((row) => row.ticker === "XSP")).toBe(false);
  });

  it("includes Custom as a valid category", () => {
    expect(SCANNER_CATEGORIES).toEqual([
      "ETF",
      "Sector Leaders",
      "MAG 7",
      "Pullbacks",
      "Custom",
    ]);
  });
});
