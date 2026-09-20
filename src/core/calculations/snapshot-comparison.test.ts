import { describe, expect, it } from "vitest";
import type { DailySnapshot } from "@/core/domain/types";
import {
  computeMyPortfolioChange,
  pickSnapshotComparisonPair,
} from "./snapshot-comparison";

function snap(
  overrides: Partial<DailySnapshot> & Pick<DailySnapshot, "date">
): DailySnapshot {
  return {
    createdAt: `${overrides.date}T12:00:00.000Z`,
    snapshotType: "manual",
    ownPortfolio: 10_000,
    totalPortfolio: 10_000,
    clientPortfolio: null,
    totalContribution: 0,
    usStocksEtfSgd: 0,
    sgStocksSgd: 0,
    cryptoSgd: 0,
    personalCashSgd: 0,
    cashSgd: 0,
    ...overrides,
  };
}

describe("pickSnapshotComparisonPair", () => {
  it("compares latest date against previous distinct date", () => {
    const pair = pickSnapshotComparisonPair([
      snap({ date: "2026-09-19", ownPortfolio: 44_804.32 }),
      snap({ date: "2026-09-20", ownPortfolio: 45_280.6, createdAt: "2026-09-20T07:23:00.000Z" }),
      snap({ date: "2026-09-20", ownPortfolio: 45_000, createdAt: "2026-09-20T06:10:00.000Z" }),
    ]);

    expect(pair?.latest.date).toBe("2026-09-20");
    expect(pair?.latest.createdAt).toBe("2026-09-20T07:23:00.000Z");
    expect(pair?.previous?.date).toBe("2026-09-19");
  });

  it("returns null previous when only one snapshot exists", () => {
    const pair = pickSnapshotComparisonPair([
      snap({ date: "2026-09-20", ownPortfolio: 45_280.6 }),
    ]);
    expect(pair?.previous).toBeNull();
  });
});

describe("computeMyPortfolioChange", () => {
  it("computes absolute and percent change", () => {
    const change = computeMyPortfolioChange(
      snap({ date: "2026-09-20", ownPortfolio: 45_280.6 }),
      snap({ date: "2026-09-19", ownPortfolio: 44_804.32 })
    );
    expect(change.dollars).toBeCloseTo(476.28, 2);
    expect(change.percent).toBeCloseTo(1.06, 2);
  });

  it("returns zero change when values match", () => {
    const change = computeMyPortfolioChange(
      snap({ date: "2026-09-20", ownPortfolio: 45_280.6 }),
      snap({ date: "2026-09-19", ownPortfolio: 45_280.6 })
    );
    expect(change.dollars).toBe(0);
    expect(change.percent).toBe(0);
  });
});
