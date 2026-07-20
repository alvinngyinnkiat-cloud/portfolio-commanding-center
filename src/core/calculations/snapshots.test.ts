import { describe, expect, it } from "vitest";
import type { DailySnapshot } from "@/core/domain/types";
import {
  createDailySnapshot,
  getSnapshotChartValue,
} from "./snapshots";
import { emptyModuleContributionInputs } from "./portfolio-test-helpers";
import { calculatePortfolioMetrics } from "./portfolio";

function baseSnapshot(
  overrides: Partial<DailySnapshot> = {}
): DailySnapshot {
  return {
    date: "2026-06-01",
    createdAt: "2026-06-01T12:00:00.000Z",
    snapshotType: "manual",
    ownPortfolio: 50_000,
    totalPortfolio: 60_000,
    clientPortfolio: 10_000,
    totalContribution: 40_000,
    usStocksEtfSgd: 20_000,
    sgStocksSgd: 5_000,
    cryptoSgd: 8_000,
    personalCashSgd: 17_000,
    cashSgd: 17_000,
    cryptoHoldingsValueSgd: 8_000,
    totalCashSgd: 17_000,
    netOptionsMarketValueSgd: -500,
    ...overrides,
  };
}

describe("getSnapshotChartValue", () => {
  it("Portfolio series uses Own Portfolio only", () => {
    const snapshot = baseSnapshot({ ownPortfolio: 42_500 });
    expect(getSnapshotChartValue(snapshot, "ownPortfolio")).toBe(42_500);
  });

  it("legacy US Stocks chart adds net options when own portfolio reconciles", () => {
    const snapshot = baseSnapshot({
      usStocksEtfSgd: 20_000,
      netOptionsMarketValueSgd: -500,
      sgStocksSgd: 5_000,
      cryptoHoldingsValueSgd: 8_000,
      totalCashSgd: 17_000,
      ownPortfolio: 49_500,
    });
    expect(getSnapshotChartValue(snapshot, "usStocksEtfSgd")).toBe(19_500);
  });

  it("new US Stocks chart uses stored US Stock Holdings Value directly", () => {
    const snapshot = baseSnapshot({
      usStocksEtfSgd: 19_500,
      netOptionsMarketValueSgd: -500,
      sgStocksSgd: 5_000,
      cryptoHoldingsValueSgd: 8_000,
      totalCashSgd: 17_000,
      ownPortfolio: 49_500,
    });
    expect(getSnapshotChartValue(snapshot, "usStocksEtfSgd")).toBe(19_500);
  });

  it("SG Stocks uses SG holdings value", () => {
    const snapshot = baseSnapshot({ sgStocksSgd: 5_000 });
    expect(getSnapshotChartValue(snapshot, "sgStocksSgd")).toBe(5_000);
  });

  it("Crypto uses crypto holdings value only", () => {
    const snapshot = baseSnapshot({
      cryptoHoldingsValueSgd: 8_000,
      cryptoSgd: 12_000,
    });
    expect(getSnapshotChartValue(snapshot, "cryptoSgd")).toBe(8_000);
  });

  it("Personal Cash uses total cash across all categories", () => {
    const snapshot = baseSnapshot({
      totalCashSgd: 17_000,
      personalCashSgd: 12_000,
      cashSgd: 12_000,
    });
    expect(getSnapshotChartValue(snapshot, "cashSgd")).toBe(17_000);
  });

  it("falls back for legacy snapshots without new fields", () => {
    const legacy = baseSnapshot({
      netOptionsMarketValueSgd: undefined,
      cryptoHoldingsValueSgd: undefined,
      totalCashSgd: undefined,
      cryptoSgd: 10_000,
      personalCashSgd: 15_000,
      cashSgd: 15_000,
    });
    expect(getSnapshotChartValue(legacy, "usStocksEtfSgd")).toBe(20_000);
    expect(getSnapshotChartValue(legacy, "cryptoSgd")).toBe(10_000);
    expect(getSnapshotChartValue(legacy, "cashSgd")).toBe(15_000);
  });
});

describe("createDailySnapshot", () => {
  it("captures standardised chart fields at snapshot time", () => {
    const inputs = {
      usStocksEtfUsd: 10_000,
      sgStocksSgd: 5_000,
      cryptoSgd: 12_000,
      cryptoHoldingCount: 1,
      usdTradingCashUsd: 2_000,
      sgdTradingCashSgd: 1_000,
      cryptoCashSgd: 500,
      usAvailableTradingCashUsd: 2_000,
      sgAvailableTradingCashSgd: 1_000,
      clientPortfolioUsd: 0,
      clientPortfolioSgd: 0,
      fxRate: 1.35,
      contributions: [],
      ...emptyModuleContributionInputs(),
      usMarketValueSgd: 13_500,
      netOptionsMarketValueSgd: -270,
      cryptoHoldingsValueSgd: 10_000,
      totalCryptoValueSgd: 10_500,
      totalStockValueSgd: 20_000,
    };
    const metrics = calculatePortfolioMetrics(inputs);
    const snapshot = createDailySnapshot(inputs, metrics, {
      snapshotType: "manual",
    });

    expect(snapshot.ownPortfolio).toBe(metrics.ownPortfolio);
    expect(getSnapshotChartValue(snapshot, "ownPortfolio")).toBe(
      metrics.ownPortfolio
    );
    expect(snapshot.usStocksEtfSgd).toBeCloseTo(13_230, 2);
    expect(getSnapshotChartValue(snapshot, "usStocksEtfSgd")).toBeCloseTo(
      snapshot.usStocksEtfSgd,
      2
    );
    expect(getSnapshotChartValue(snapshot, "cryptoSgd")).toBe(10_000);
    expect(getSnapshotChartValue(snapshot, "cashSgd")).toBe(metrics.totalCashSgd);
  });
});
