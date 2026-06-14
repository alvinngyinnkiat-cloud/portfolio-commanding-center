import { describe, expect, it } from "vitest";
import {
  calculate75PercentTpExitPriceUsd,
  calculateNetCreditUsd,
} from "./profit-target";

describe("profit target calculations", () => {
  it("net credit = premium − opening fees only", () => {
    expect(calculateNetCreditUsd(420, 2.5)).toBe(417.5);
    expect(calculateNetCreditUsd(100, 5)).toBe(95);
  });

  it("75% TP exit price = 25% of net credit (close fees excluded)", () => {
    expect(calculate75PercentTpExitPriceUsd(417.5)).toBeCloseTo(104.375, 4);
    expect(calculate75PercentTpExitPriceUsd(95)).toBeCloseTo(23.75, 4);
  });
});
