import { describe, expect, it } from "vitest";
import { createEmptyCache, normalizeCache } from "./cache";
import {
  hasLegacyStockDeposits,
  migrateLegacyStockDepositsToCashFlow,
  MIGRATED_STOCK_FX_ID_PREFIX,
} from "@/core/calculations/stocks/migrate-stock-cash-flow";

describe("normalizeCache", () => {
  it("does not recreate migrated FX rows on every normalize pass", () => {
    const cache = createEmptyCache();
    cache.contributions = [
      {
        id: "dep-1",
        date: "2025-01-01",
        type: "deposit",
        category: "stock",
        amountSgd: 13_500,
        usdAllocationPercent: 100,
        fxRate: 1.35,
      },
    ];
    cache.stockFxConversions = [];

    const normalized = normalizeCache(cache);

    expect(normalized.stockFxConversions).toHaveLength(0);
    expect(normalized.contributions[0]?.usdAllocationPercent).toBe(100);
  });
});

describe("hasLegacyStockDeposits", () => {
  it("detects legacy stock deposits with USD allocation", () => {
    expect(
      hasLegacyStockDeposits([
        {
          id: "dep-1",
          date: "2025-01-01",
          type: "deposit",
          category: "stock",
          amountSgd: 1_000,
          usdAllocationPercent: 50,
        },
      ])
    ).toBe(true);
  });

  it("returns false for new cash-flow deposits without USD allocation fields", () => {
    expect(
      hasLegacyStockDeposits([
        {
          id: "dep-1",
          date: "2025-01-01",
          type: "deposit",
          category: "stock",
          amountSgd: 1_000,
        },
      ])
    ).toBe(false);
  });

  it("returns false after legacy fields are cleared", () => {
    const migrated = migrateLegacyStockDepositsToCashFlow(
      [
        {
          id: "dep-1",
          date: "2025-01-01",
          type: "deposit",
          category: "stock",
          amountSgd: 13_500,
          usdAllocationPercent: 100,
          fxRate: 1.35,
        },
      ],
      [],
      1.35
    );

    expect(hasLegacyStockDeposits(migrated.contributions)).toBe(false);
    expect(migrated.fxConversions[0]?.id).toBe(
      `${MIGRATED_STOCK_FX_ID_PREFIX}dep-1`
    );
  });

  it("does not recreate a deleted synthetic FX row once legacy fields are cleared", () => {
    const migrated = migrateLegacyStockDepositsToCashFlow(
      [
        {
          id: "dep-1",
          date: "2025-01-01",
          type: "deposit",
          category: "stock",
          amountSgd: 13_500,
          usdAllocationPercent: 100,
          fxRate: 1.35,
        },
      ],
      [],
      1.35
    );

    const afterDelete = {
      ...migrated,
      fxConversions: migrated.fxConversions.filter(
        (row) => row.id !== `${MIGRATED_STOCK_FX_ID_PREFIX}dep-1`
      ),
    };

    const rerun = migrateLegacyStockDepositsToCashFlow(
      afterDelete.contributions,
      afterDelete.fxConversions,
      1.35
    );

    expect(rerun.fxConversions).toHaveLength(0);
  });
});
