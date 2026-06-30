import { describe, expect, it } from "vitest";
import type { DailySnapshot } from "@/core/domain/types";
import {
  getAutomaticSnapshotSkipReason,
  getSingaporeDateString,
  hasAutomaticSnapshotForDate,
  hasSnapshotForDate,
  isSingaporeAutomaticSnapshotDue,
  sgtWallTimeToDate,
} from "./snapshot-schedule";

describe("isSingaporeAutomaticSnapshotDue", () => {
  it("does not capture at 12:01 AM SGT on that calendar day", () => {
    const atMidnightAfter = sgtWallTimeToDate(2026, 6, 30, 0, 1);
    expect(isSingaporeAutomaticSnapshotDue(atMidnightAfter)).toBe(false);
    expect(getAutomaticSnapshotSkipReason(atMidnightAfter)).toBe(
      "before_capture_time"
    );
  });

  it("does not capture at 11:58 PM SGT", () => {
    const beforeWindow = sgtWallTimeToDate(2026, 6, 30, 23, 58);
    expect(isSingaporeAutomaticSnapshotDue(beforeWindow)).toBe(false);
  });

  it("captures at 11:59 PM SGT for that calendar date", () => {
    const atCapture = sgtWallTimeToDate(2026, 6, 30, 23, 59);
    expect(isSingaporeAutomaticSnapshotDue(atCapture)).toBe(true);
    expect(getSingaporeDateString(atCapture)).toBe("2026-06-30");
    expect(getAutomaticSnapshotSkipReason(atCapture)).toBeNull();
  });

  it("does not backfill the previous day at 12:00 AM the next day", () => {
    const nextDayMidnight = sgtWallTimeToDate(2026, 7, 1, 0, 0);
    expect(isSingaporeAutomaticSnapshotDue(nextDayMidnight)).toBe(false);
    expect(getSingaporeDateString(nextDayMidnight)).toBe("2026-07-01");
  });

  it("does not capture during daytime hours", () => {
    expect(isSingaporeAutomaticSnapshotDue(sgtWallTimeToDate(2026, 6, 30, 9, 0))).toBe(
      false
    );
    expect(isSingaporeAutomaticSnapshotDue(sgtWallTimeToDate(2026, 6, 30, 18, 30))).toBe(
      false
    );
  });
});

describe("hasAutomaticSnapshotForDate", () => {
  const snapshots: DailySnapshot[] = [
    {
      date: "2026-06-30",
      createdAt: "2026-06-30T15:59:00.000Z",
      snapshotType: "automatic",
      ownPortfolio: 1,
      totalPortfolio: 1,
      clientPortfolio: 0,
      totalContribution: 0,
      usStocksEtfSgd: 0,
      sgStocksSgd: 0,
      cryptoSgd: 0,
      cryptoHoldingsValueSgd: 0,
      netOptionsMarketValueSgd: 0,
      totalCashSgd: 0,
      personalCashSgd: 0,
      cashSgd: 0,
      breakdown: [],
      fxRateUsed: 1.35,
    },
  ];

  it("detects automatic snapshots for deduplication", () => {
    expect(hasAutomaticSnapshotForDate(snapshots, "2026-06-30")).toBe(true);
    expect(hasSnapshotForDate(snapshots, "2026-06-30")).toBe(true);
    expect(hasAutomaticSnapshotForDate(snapshots, "2026-07-01")).toBe(false);
  });
});
