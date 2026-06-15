import { describe, expect, it } from "vitest";
import type { CryptoHolding, CryptoTrade } from "@/core/domain/types";
import {
  hasLegacyCryptoHoldingsToMigrate,
  migrateLegacyCryptoHoldingsToTrades,
} from "./migrate-crypto-trades";

const holding: CryptoHolding = {
  id: "h1",
  assetName: "BTC",
  investedSgd: 1000,
  feesSgd: 10,
  currentValueSgd: 1200,
};

describe("migrateLegacyCryptoHoldingsToTrades", () => {
  it("does not run when trades already exist", () => {
    const trades: CryptoTrade[] = [
      {
        id: "t1",
        date: "2024-05-10",
        assetName: "ETH",
        type: "buy",
        amountSgd: 500,
      },
    ];

    expect(migrateLegacyCryptoHoldingsToTrades([holding], trades)).toBe(trades);
  });

  it("does not run when legacy migration flag is set", () => {
    expect(
      migrateLegacyCryptoHoldingsToTrades([holding], [], true)
    ).toEqual([]);
  });

  it("leaves legacy trade date empty instead of using epoch or today", () => {
    const migrated = migrateLegacyCryptoHoldingsToTrades([holding], []);

    expect(migrated).toHaveLength(1);
    expect(migrated[0].date).toBe("");
    expect(migrated[0].id).toBe("legacy-h1");
  });

  it("reports pending migration only when holdings have cost basis", () => {
    expect(hasLegacyCryptoHoldingsToMigrate([holding], [], false)).toBe(true);
    expect(
      hasLegacyCryptoHoldingsToMigrate(
        [{ ...holding, investedSgd: 0, feesSgd: 0 }],
        [],
        false
      )
    ).toBe(false);
    expect(hasLegacyCryptoHoldingsToMigrate([holding], [], true)).toBe(false);
  });
});
