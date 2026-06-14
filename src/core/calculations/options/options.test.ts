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

  it("unrealized P/L = premium - open fees - current value", () => {
    expect(
      calculateUnrealizedPlUsd({
        openPremiumUsd: 420,
        openFeesUsd: 2.5,
        currentValueUsd: 380,
      })
    ).toBe(37.5);
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

  it("sums closed realized options P/L only", () => {
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
    ];
    expect(sumRealizedOptionsPlUsd(trades)).toBe(100);
  });
});
