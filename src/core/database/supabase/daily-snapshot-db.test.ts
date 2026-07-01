import { describe, expect, it } from "vitest";
import { dailySnapshotToRow, rowToDailySnapshot } from "./daily-snapshot-db";

describe("daily-snapshot-db", () => {
  it("round-trips core snapshot fields", () => {
    const snapshot = rowToDailySnapshot({
      snapshot_date: "2026-07-01",
      created_at: "2026-07-01T15:59:00.000Z",
      type: "automatic",
      my_portfolio_sgd: 42_000,
      total_portfolio_sgd: 45_000,
      client_equity_sgd: 3_000,
      us_stocks_sgd: 20_000,
      sg_stocks_sgd: 5_000,
      crypto_sgd: 8_000,
      personal_cash_sgd: 9_000,
      total_contribution_sgd: 30_000,
      fx_rate_used: 1.35,
      extended_data: { netOptionsMarketValueSgd: 500 },
    });

    expect(snapshot.date).toBe("2026-07-01");
    expect(snapshot.snapshotType).toBe("automatic");
    expect(snapshot.ownPortfolio).toBe(42_000);

    const row = dailySnapshotToRow(snapshot);
    expect(row.snapshot_date).toBe("2026-07-01");
    expect(row.type).toBe("automatic");
    expect(row.my_portfolio_sgd).toBe(42_000);
  });
});
