import { describe, expect, it } from "vitest";
import type { DailySnapshot } from "@/core/domain/types";
import { mergeSnapshotsByDate } from "./snapshot-merge";

function snap(
  date: string,
  createdAt: string,
  ownPortfolio = 10_000
): DailySnapshot {
  return {
    date,
    createdAt,
    snapshotType: "manual",
    ownPortfolio,
    totalPortfolio: ownPortfolio,
    clientPortfolio: 0,
    totalContribution: 0,
    usStocksEtfSgd: 0,
    sgStocksSgd: 0,
    cryptoSgd: 0,
    personalCashSgd: 0,
    cashSgd: 0,
  };
}

describe("mergeSnapshotsByDate", () => {
  it("keeps newer createdAt when dates collide", () => {
    const merged = mergeSnapshotsByDate([
      snap("2026-07-01", "2026-07-01T10:00:00.000Z", 40_000),
      snap("2026-07-01", "2026-07-01T15:59:00.000Z", 42_000),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.ownPortfolio).toBe(42_000);
  });

  it("merges distinct dates from multiple sources", () => {
    const merged = mergeSnapshotsByDate([
      snap("2026-06-30", "2026-06-30T15:59:00.000Z"),
      snap("2026-07-01", "2026-07-01T15:59:00.000Z"),
    ]);

    expect(merged.map((row) => row.date)).toEqual(["2026-06-30", "2026-07-01"]);
  });
});
