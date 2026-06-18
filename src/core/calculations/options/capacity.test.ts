import { describe, expect, it } from "vitest";
import type { OptionsTrade } from "@/core/domain/types/options";
import {
  CAPACITY_NEAR_TERM_DTE_MAX,
  countsTowardCapacityRisk,
  deriveCapacityStatus,
  sumOpenRiskUsd,
  sumOpenRiskUsdForCapacity,
} from "./capacity";

function openTrade(
  overrides: Partial<OptionsTrade> & Pick<OptionsTrade, "id" | "maxRiskUsd">
): OptionsTrade {
  return {
    status: "open",
    tradeType: "personal",
    userSharePercent: 100,
    clientSharePercent: 0,
    strategy: "sellPut",
    underlying: "SPY",
    expirationDate: "2026-07-01",
    contracts: 1,
    openDate: "2026-01-01",
    openPremiumUsd: 100,
    openFeesUsd: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("sumOpenRiskUsdForCapacity", () => {
  const asOf = "2026-06-01";

  it("includes risk when DTE <= 45", () => {
    const trades = [
      openTrade({
        id: "near",
        maxRiskUsd: 400,
        expirationDate: "2026-07-01",
      }),
    ];
    expect(sumOpenRiskUsdForCapacity(trades, asOf)).toBe(400);
  });

  it("excludes risk when DTE > 45", () => {
    const trades = [
      openTrade({
        id: "far",
        maxRiskUsd: 900,
        expirationDate: "2026-12-18",
      }),
    ];
    expect(sumOpenRiskUsdForCapacity(trades, asOf)).toBe(0);
    expect(sumOpenRiskUsd(trades)).toBe(900);
  });

  it("includes risk when expiration is missing (safety fallback)", () => {
    const trades = [
      openTrade({
        id: "missing",
        maxRiskUsd: 250,
        expirationDate: "",
      }),
    ];
    expect(sumOpenRiskUsdForCapacity(trades, asOf)).toBe(250);
  });

  it("sums only near-term legs from a mixed book", () => {
    const trades = [
      openTrade({ id: "a", maxRiskUsd: 300, expirationDate: "2026-06-20" }),
      openTrade({ id: "b", maxRiskUsd: 500, expirationDate: "2026-12-01" }),
      openTrade({ id: "c", maxRiskUsd: 200, expirationDate: "2026-07-10" }),
    ];
    expect(sumOpenRiskUsdForCapacity(trades, asOf)).toBe(500);
    expect(sumOpenRiskUsd(trades)).toBe(1_000);
  });

  it(`uses DTE threshold of ${CAPACITY_NEAR_TERM_DTE_MAX}`, () => {
    const onBoundary = openTrade({
      id: "boundary",
      maxRiskUsd: 100,
      expirationDate: "2026-07-16",
    });
    const overBoundary = openTrade({
      id: "over",
      maxRiskUsd: 100,
      expirationDate: "2026-07-17",
    });
    expect(countsTowardCapacityRisk(onBoundary, asOf)).toBe(true);
    expect(countsTowardCapacityRisk(overBoundary, asOf)).toBe(false);
  });
});

describe("deriveCapacityStatus", () => {
  it("OK when remaining capacity is positive", () => {
    expect(deriveCapacityStatus(100)).toBe("OK");
  });

  it("NO_TRADE when remaining capacity is zero or negative", () => {
    expect(deriveCapacityStatus(0)).toBe("NO_TRADE");
    expect(deriveCapacityStatus(-1)).toBe("NO_TRADE");
  });
});
