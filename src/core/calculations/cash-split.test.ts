import { describe, expect, it } from "vitest";
import { splitPersonalAndClientCash } from "./cash-split";

describe("splitPersonalAndClientCash", () => {
  it("acceptance: total 30k cash, client portfolio 20k → personal 10k", () => {
    const { personalCashSgd, clientCashSgd } = splitPersonalAndClientCash(
      30_000,
      20_000
    );
    expect(personalCashSgd).toBe(10_000);
    expect(clientCashSgd).toBe(20_000);
  });

  it("assigns all cash to client when client portfolio exceeds total cash", () => {
    const { personalCashSgd, clientCashSgd } = splitPersonalAndClientCash(
      5_000,
      20_000
    );
    expect(personalCashSgd).toBe(0);
    expect(clientCashSgd).toBe(5_000);
  });

  it("never returns negative personal cash when total cash is negative", () => {
    const { personalCashSgd, clientCashSgd } = splitPersonalAndClientCash(
      -2_000,
      50_000
    );
    expect(personalCashSgd).toBe(0);
    expect(clientCashSgd).toBe(-2_000);
  });

  it("keeps personal + client equal to total cash", () => {
    const cases = [
      [30_000, 20_000],
      [5_000, 20_000],
      [-2_000, 50_000],
      [0, 10_000],
    ] as const;

    for (const [total, client] of cases) {
      const { personalCashSgd, clientCashSgd } = splitPersonalAndClientCash(
        total,
        client
      );
      expect(personalCashSgd).toBeGreaterThanOrEqual(0);
      expect(personalCashSgd + clientCashSgd).toBeCloseTo(total, 5);
    }
  });
});
