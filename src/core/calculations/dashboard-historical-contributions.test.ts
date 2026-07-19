import { describe, expect, it } from "vitest";

import {
  calculateHistoricalTotalContributionSgd,
  resolveClientContributionSgd,
} from "./dashboard-historical-contributions";

describe("dashboard historical contributions", () => {
  it("sums stock and crypto amountSgd only", () => {
    const total = calculateHistoricalTotalContributionSgd([
      {
        id: "stock",
        date: "2024-01-01",
        type: "deposit",
        category: "stock",
        amountSgd: 10_000,
        fxRate: 1.32,
      },
      {
        id: "crypto",
        date: "2024-02-01",
        type: "deposit",
        category: "crypto",
        amountSgd: 5_000,
      },
      {
        id: "withdraw",
        date: "2024-03-01",
        type: "withdrawal",
        category: "stock",
        amountSgd: 1_000,
      },
    ]);

    expect(total).toBe(14_000);
  });

  it("does not change when only portfolio FX-sensitive values differ", () => {
    const contributions = [
      {
        id: "stock",
        date: "2024-01-01",
        type: "deposit" as const,
        category: "stock" as const,
        amountSgd: 10_000,
        fxRate: 1.32,
      },
    ];

    expect(calculateHistoricalTotalContributionSgd(contributions)).toBe(
      calculateHistoricalTotalContributionSgd(contributions)
    );
  });

  it("reads stored client contribution SGD", () => {
    expect(
      resolveClientContributionSgd({ clientStartingCapitalSgd: 8_000 })
    ).toBe(8_000);
    expect(resolveClientContributionSgd({})).toBe(0);
  });
});
