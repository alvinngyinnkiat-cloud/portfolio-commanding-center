import { describe, expect, it } from "vitest";
import {
  isMarketPriceUpdateDue,
  isSingaporeTimeAtOrAfter,
} from "./price-schedule";

describe("stock price schedule", () => {
  it("1. US positions update at 6:00 AM SGT", () => {
    const usSixAmSgt = new Date("2026-06-12T22:00:00.000Z");
    expect(isMarketPriceUpdateDue("US", null, usSixAmSgt)).toBe(true);
    expect(
      isSingaporeTimeAtOrAfter(6, 0, usSixAmSgt)
    ).toBe(true);
  });

  it("does not update US before 6:00 AM SGT", () => {
    const beforeUsWindow = new Date("2026-06-12T21:59:00.000Z");
    expect(isMarketPriceUpdateDue("US", null, beforeUsWindow)).toBe(false);
  });

  it("2. SG positions update at 6:00 PM SGT", () => {
    const sgSixPmSgt = new Date("2026-06-13T10:00:00.000Z");
    expect(isMarketPriceUpdateDue("SG", null, sgSixPmSgt)).toBe(true);
    expect(
      isSingaporeTimeAtOrAfter(18, 0, sgSixPmSgt)
    ).toBe(true);
  });

  it("does not update SG before 6:00 PM SGT", () => {
    const beforeSgWindow = new Date("2026-06-13T09:59:00.000Z");
    expect(isMarketPriceUpdateDue("SG", null, beforeSgWindow)).toBe(false);
  });

  it("does not run twice on the same SGT day", () => {
    const usSixAmSgt = new Date("2026-06-12T22:00:00.000Z");
    expect(
      isMarketPriceUpdateDue("US", "2026-06-13", usSixAmSgt)
    ).toBe(false);
  });
});
