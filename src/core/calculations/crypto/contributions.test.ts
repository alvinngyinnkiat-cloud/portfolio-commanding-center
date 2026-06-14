import { describe, expect, it } from "vitest";
import type { ContributionTransaction } from "@/core/domain/types";
import { calculateTotalCryptoCashContributed } from "./contributions";

describe("calculateTotalCryptoCashContributed", () => {
  it("sums crypto deposits minus crypto withdrawals", () => {
    const contributions: ContributionTransaction[] = [
      {
        id: "1",
        date: "2025-01-01",
        type: "deposit",
        category: "crypto",
        amountSgd: 1000,
      },
      {
        id: "2",
        date: "2025-02-01",
        type: "deposit",
        category: "crypto",
        amountSgd: 500,
      },
      {
        id: "3",
        date: "2025-03-01",
        type: "withdrawal",
        category: "crypto",
        amountSgd: 200,
      },
      {
        id: "4",
        date: "2025-04-01",
        type: "deposit",
        category: "stock",
        amountSgd: 3000,
      },
    ];

    expect(calculateTotalCryptoCashContributed(contributions)).toBe(1300);
  });
});
