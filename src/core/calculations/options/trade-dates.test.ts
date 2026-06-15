import { describe, expect, it } from "vitest";
import {
  compareOptionsTradeDatesDesc,
  formatOptionsTradeDate,
  normalizeOptionsTradeDate,
  normalizeOptionsTradeForStorage,
  optionsTradeDateForInput,
  todayOptionsTradeDate,
} from "./trade-dates";
import type { OptionsTrade } from "@/core/domain/types/options";

describe("normalizeOptionsTradeDate", () => {
  it("accepts YYYY-MM-DD", () => {
    expect(normalizeOptionsTradeDate("2026-06-15")).toBe("2026-06-15");
  });

  it("normalizes ISO datetime prefix to calendar date", () => {
    expect(normalizeOptionsTradeDate("2026-06-15T00:00:00.000Z")).toBe("2026-06-15");
  });

  it("rejects epoch sentinel and invalid values", () => {
    expect(normalizeOptionsTradeDate("1970-01-01")).toBeUndefined();
    expect(normalizeOptionsTradeDate("")).toBeUndefined();
    expect(normalizeOptionsTradeDate("15/06/2026")).toBeUndefined();
  });
});

describe("optionsTradeDateForInput", () => {
  it("returns empty string for invalid dates (not epoch)", () => {
    expect(optionsTradeDateForInput("1970-01-01")).toBe("");
    expect(optionsTradeDateForInput(undefined)).toBe("");
  });

  it("returns YYYY-MM-DD for valid persisted values", () => {
    expect(optionsTradeDateForInput("2025-06-01T12:00:00Z")).toBe("2025-06-01");
  });
});

describe("formatOptionsTradeDate", () => {
  it("formats as DD MMM YYYY", () => {
    expect(formatOptionsTradeDate("2026-06-15")).toMatch(/15 Jun 2026/);
  });

  it("shows em dash for invalid dates", () => {
    expect(formatOptionsTradeDate("1970-01-01")).toBe("—");
    expect(formatOptionsTradeDate("")).toBe("—");
  });
});

describe("compareOptionsTradeDatesDesc", () => {
  it("sorts newest close date first", () => {
    expect(compareOptionsTradeDatesDesc("2026-01-01", "2026-06-01")).toBeGreaterThan(0);
    expect(compareOptionsTradeDatesDesc("2026-06-01", "2026-01-01")).toBeLessThan(0);
  });

  it("sorts invalid dates last", () => {
    expect(compareOptionsTradeDatesDesc("invalid", "2026-01-01")).toBeGreaterThan(0);
  });
});

describe("normalizeOptionsTradeForStorage", () => {
  it("coerces datetime fields to YYYY-MM-DD on hydrate/save", () => {
    const trade = {
      id: "t1",
      status: "closed",
      openDate: "2025-06-01T00:00:00.000Z",
      expirationDate: "2025-06-20",
      closeDate: "2025-06-10T00:00:00.000Z",
    } as OptionsTrade;

    const normalized = normalizeOptionsTradeForStorage(trade);
    expect(normalized.openDate).toBe("2025-06-01");
    expect(normalized.expirationDate).toBe("2025-06-20");
    expect(normalized.closeDate).toBe("2025-06-10");
  });

  it("preserves valid dates on edit round-trip", () => {
    const trade = {
      id: "t1",
      status: "closed",
      openDate: "2025-06-01",
      expirationDate: "2025-06-20",
      closeDate: "2025-06-10",
    } as OptionsTrade;

    const normalized = normalizeOptionsTradeForStorage(trade);
    expect(normalized.openDate).toBe("2025-06-01");
    expect(normalized.closeDate).toBe("2025-06-10");
  });
});

describe("todayOptionsTradeDate", () => {
  it("returns YYYY-MM-DD", () => {
    expect(todayOptionsTradeDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
