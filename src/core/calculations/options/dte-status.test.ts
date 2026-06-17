import { describe, expect, it } from "vitest";
import {
  compareOpenTradesByDte,
  compareOpenTradesByOpenDate,
  deriveDteStatus,
  summarizeActionRequiredOpenRisk,
} from "./dte-status";

describe("deriveDteStatus", () => {
  it("DTE > 21 is Normal", () => {
    expect(deriveDteStatus(22)).toBe("NORMAL");
    expect(deriveDteStatus(45)).toBe("NORMAL");
  });

  it("DTE 8-21 is Watch", () => {
    expect(deriveDteStatus(8)).toBe("WATCH");
    expect(deriveDteStatus(21)).toBe("WATCH");
  });

  it("DTE <= 7 is Action Required", () => {
    expect(deriveDteStatus(7)).toBe("ACTION_REQUIRED");
    expect(deriveDteStatus(0)).toBe("ACTION_REQUIRED");
  });
});

describe("compareOpenTradesByDte", () => {
  it("sorts lowest DTE first", () => {
    const sorted = [
      { daysToExpiration: 14, trade: { expirationDate: "2025-03-01", underlying: "MSFT" } },
      { daysToExpiration: 5, trade: { expirationDate: "2025-02-01", underlying: "GOOG" } },
      { daysToExpiration: 30, trade: { expirationDate: "2025-04-01", underlying: "NVDA" } },
      { daysToExpiration: 7, trade: { expirationDate: "2025-02-05", underlying: "XOM" } },
      { daysToExpiration: 10, trade: { expirationDate: "2025-02-20", underlying: "AVGO" } },
    ].sort(compareOpenTradesByDte);

    expect(sorted.map((r) => r.daysToExpiration)).toEqual([5, 7, 10, 14, 30]);
  });

  it("breaks ties by expiration date then ticker", () => {
    const sorted = [
      { daysToExpiration: 14, trade: { expirationDate: "2025-03-15", underlying: "MSFT" } },
      { daysToExpiration: 14, trade: { expirationDate: "2025-03-01", underlying: "GOOG" } },
      { daysToExpiration: 14, trade: { expirationDate: "2025-03-15", underlying: "AVGO" } },
      { daysToExpiration: 14, trade: { expirationDate: "2025-03-01", underlying: "XOM" } },
    ].sort(compareOpenTradesByDte);

    expect(sorted.map((r) => r.trade.underlying)).toEqual([
      "GOOG",
      "XOM",
      "AVGO",
      "MSFT",
    ]);
  });
});

describe("compareOpenTradesByOpenDate", () => {
  it("sorts newest open date first", () => {
    const sorted = [
      { trade: { openDate: "2024-10-21", createdAt: "2024-10-21T10:00:00Z" } },
      { trade: { openDate: "2025-01-10", createdAt: "2025-01-10T10:00:00Z" } },
      { trade: { openDate: "2024-12-11", createdAt: "2024-12-11T10:00:00Z" } },
      { trade: { openDate: "2024-11-06", createdAt: "2024-11-06T10:00:00Z" } },
    ].sort(compareOpenTradesByOpenDate);

    expect(sorted.map((row) => row.trade.openDate)).toEqual([
      "2025-01-10",
      "2024-12-11",
      "2024-11-06",
      "2024-10-21",
    ]);
  });
});

describe("summarizeActionRequiredOpenRisk", () => {
  it("counts trades and sums risk where DTE <= 7", () => {
    const result = summarizeActionRequiredOpenRisk([
      { daysToExpiration: 5, maxRiskUsd: 400 },
      { daysToExpiration: 7, maxRiskUsd: 200 },
      { daysToExpiration: 8, maxRiskUsd: 999 },
      { daysToExpiration: 21, maxRiskUsd: 100 },
    ]);

    expect(result.tradesRequiringActionCount).toBe(2);
    expect(result.openRiskRequiringActionUsd).toBe(600);
  });
});
