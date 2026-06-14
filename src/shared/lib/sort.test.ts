import { describe, expect, it } from "vitest";
import { sortByDateDesc } from "./sort";

describe("sortByDateDesc", () => {
  it("orders newest transaction dates first", () => {
    const sorted = sortByDateDesc([
      { id: "1", date: "2024-10-21" },
      { id: "2", date: "2025-01-10" },
      { id: "3", date: "2024-12-11" },
      { id: "4", date: "2024-11-06" },
    ]);

    expect(sorted.map((row) => row.date)).toEqual([
      "2025-01-10",
      "2024-12-11",
      "2024-11-06",
      "2024-10-21",
    ]);
  });
});
