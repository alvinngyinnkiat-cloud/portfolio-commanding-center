import { describe, expect, it } from "vitest";
import type { CryptoHolding, CryptoTrade } from "@/core/domain/types";
import { toLocalDateString } from "@/shared/lib/date";
import {
  hasLegacyCryptoHoldingsToMigrate,
  LEGACY_CRYPTO_TRADE_DATE,
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

  it("uses a stable legacy date instead of today", () => {
    const today = toLocalDateString();
    const migrated = migrateLegacyCryptoHoldingsToTrades([holding], []);

    expect(migrated).toHaveLength(1);
    expect(migrated[0].date).toBe(LEGACY_CRYPTO_TRADE_DATE);
    expect(migrated[0].date).not.toBe(today);
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
