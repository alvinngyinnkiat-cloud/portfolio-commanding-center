import { describe, expect, it } from "vitest";
import {
  normalizeLocalDateString,
  parseIsoDateString,
  parseLocalDate,
  toLocalDateString,
} from "./date";

describe("parseIsoDateString", () => {
  it("accepts valid YYYY-MM-DD", () => {
    expect(parseIsoDateString("2026-06-15")).toBe("2026-06-15");
  });

  it("rejects locale DD/MM/YYYY strings", () => {
    expect(parseIsoDateString("15/06/2026")).toBeNull();
    expect(parseIsoDateString("06/15/2026")).toBeNull();
  });

  it("rejects invalid calendar dates", () => {
    expect(parseIsoDateString("2026-02-30")).toBeNull();
    expect(parseIsoDateString("2026-13-01")).toBeNull();
    expect(parseIsoDateString("2026-00-10")).toBeNull();
  });

  it("rejects empty and whitespace", () => {
    expect(parseIsoDateString("")).toBeNull();
    expect(parseIsoDateString("   ")).toBeNull();
    expect(parseIsoDateString(null)).toBeNull();
  });

  it("never coerces invalid input to epoch", () => {
    const parsed = parseLocalDate("not-a-date");
    expect(Number.isNaN(parsed.getTime())).toBe(true);
    expect(parsed.getTime()).not.toBe(0);
  });
});

describe("normalizeLocalDateString", () => {
  it("matches strict ISO parsing", () => {
    expect(normalizeLocalDateString("2024-03-18")).toBe("2024-03-18");
    expect(normalizeLocalDateString("18/03/2024")).toBeNull();
  });
});

describe("toLocalDateString", () => {
  it("formats local calendar date as YYYY-MM-DD", () => {
    expect(toLocalDateString(new Date(2026, 5, 15))).toBe("2026-06-15");
  });
});
