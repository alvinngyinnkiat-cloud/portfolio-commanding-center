import { describe, expect, it } from "vitest";
import { calculateRealizedPlUsd } from "./realized-pl";
import { calculateUnrealizedPlUsd } from "./unrealized-pl";
import { deriveCapacityStatus } from "./capacity";
import { splitTradeAmount } from "./split";
import { sumRealizedOptionsPlUsd } from "./helpers";
import type { OptionsTrade } from "@/core/domain/types/options";

describe("options calculations", () => {
  it("realized P/L = premium - open fees - close premium - close fees", () => {
    expect(
      calculateRealizedPlUsd({
        openPremiumUsd: 420,
        openFeesUsd: 2.5,
        closePremiumUsd: 70,
        closeFeesUsd: 2.5,
      })
    ).toBe(345);
  });

  it("unrealized P/L = premium - open fees - current value (credit)", () => {
    expect(
      calculateUnrealizedPlUsd({
        strategy: "bullPut",
        openPremiumUsd: 420,
        openFeesUsd: 2.5,
        currentValueUsd: 380,
      })
    ).toBe(37.5);
  });

  it("unrealized P/L for debit = current value - premium - fees", () => {
    expect(
      calculateUnrealizedPlUsd({
        strategy: "buyPut",
        openPremiumUsd: 200,
        openFeesUsd: 2,
        currentValueUsd: 350,
      })
    ).toBe(148);
  });

  it("capacity status thresholds", () => {
    expect(deriveCapacityStatus(100)).toBe("OK");
    expect(deriveCapacityStatus(0)).toBe("AT_LIMIT");
    expect(deriveCapacityStatus(-1)).toBe("NO_TRADE");
  });

  it("split trade amount 55/45", () => {
    const legs = splitTradeAmount(345, 55, 45);
    expect(legs.userLegUsd).toBe(189.75);
    expect(legs.clientLegUsd).toBe(155.25);
  });

  it("sums realized P/L from closed trades and partial close events on open trades", () => {
    const trades: OptionsTrade[] = [
      {
        id: "1",
        status: "closed",
        realizedPlUsd: 100,
      } as OptionsTrade,
      {
        id: "2",
        status: "open",
        realizedPlUsd: 500,
      } as OptionsTrade,
      {
        id: "3",
        status: "open",
        closeEvents: [
          {
            id: "e1",
            closeDate: "2026-01-01",
            contractsClosed: 1,
            closePremiumUsd: 0,
            closeFeesUsd: 0,
            closeMethod: "manual_pl",
            realizedPlUsd: 75,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      } as OptionsTrade,
    ];
    expect(sumRealizedOptionsPlUsd(trades)).toBe(175);
  });
});
