import { describe, expect, it } from "vitest";
import { calculatePersonalCashContributionSgd } from "./contributions";

describe("personal cash contributions", () => {
  it("sums personal cash deposits minus withdrawals", () => {
    const total = calculatePersonalCashContributionSgd([
      {
        id: "1",
        date: "2025-01-01",
        type: "deposit",
        category: "cash",
        amountSgd: 3_000,
      },
      {
        id: "2",
        date: "2025-02-01",
        type: "withdrawal",
        category: "cash",
        amountSgd: 500,
      },
    ]);

    expect(total).toBe(2_500);
  });

  it("excludes stock and crypto categories", () => {
    const total = calculatePersonalCashContributionSgd([
      {
        id: "1",
        date: "2025-01-01",
        type: "deposit",
        category: "stock",
        amountSgd: 10_000,
      },
      {
        id: "2",
        date: "2025-01-02",
        type: "deposit",
        category: "crypto",
        amountSgd: 5_000,
      },
    ]);

    expect(total).toBe(0);
  });
});
