import { describe, expect, it } from "vitest";
import type { OptionsTrade } from "@/core/domain/types/options";
import type { ContributionTransaction, StockTransaction } from "@/core/domain/types";
import type { StockFxConversion } from "@/core/domain/types/stock-fx-conversion";
import {
  buildUsAvailableCashResult,
  calculateUsAvailableCashUsd,
} from "./ledger";
import { buildUsCashTrace } from "./trace";

function tx(
  overrides: Partial<StockTransaction> & Pick<StockTransaction, "transactionType">
): StockTransaction {
  return {
    id: "tx-1",
    date: "2025-01-01",
    market: "US",
    ticker: "NVDA",
    assetName: "NVIDIA",
    transactionType: overrides.transactionType,
    quantity: overrides.quantity ?? 0,
    price: overrides.price ?? 0,
    grossAmount: overrides.grossAmount ?? 0,
    fees: overrides.fees ?? 0,
    netAmount: overrides.netAmount ?? 0,
    currency: "USD",
    createdAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function fxToUsd(usdAmount: number, sgdAmount: number, id = "fx-1"): StockFxConversion {
  return {
    id,
    date: "2025-01-01",
    direction: "sgd_to_usd",
    sgdAmount,
    usdAmount,
    createdAt: "2025-01-01T00:00:00.000Z",
  };
}

describe("calculateUsAvailableCashUsd", () => {
  it("acceptance: net cash 18k USD, 10k buys → 8k available", () => {
    const available = calculateUsAvailableCashUsd({
      contributions: [],
      fxConversions: [fxToUsd(18_000, 24_300)],
      stockTransactions: [
        tx({
          id: "buy-1",
          transactionType: "buy",
          grossAmount: 10_000,
          netAmount: -10_000,
        }),
      ],
      fxRate: 1.35,
    });

    expect(available).toBe(8_000);
  });

  it("includes sell proceeds and dividends in available cash", () => {
    const result = buildUsAvailableCashResult({
      contributions: [],
      fxConversions: [fxToUsd(5_000, 6_750)],
      stockTransactions: [
        tx({
          id: "buy-1",
          transactionType: "buy",
          grossAmount: 1_000,
          fees: 5,
          netAmount: -1_005,
        }),
        tx({
          id: "sell-1",
          transactionType: "sell",
          grossAmount: 600,
          fees: 2,
          netAmount: 598,
        }),
        tx({
          id: "div-1",
          transactionType: "dividend",
          grossAmount: 50,
          netAmount: 50,
        }),
      ],
      fxRate: 1.35,
    });

    expect(result.breakdown.usNetStockCashUsd).toBe(5_000);
    expect(result.breakdown.stockBuySpendUsd).toBe(1_005);
    expect(result.breakdown.stockSellProceedsUsd).toBe(598);
    expect(result.breakdown.stockDividendsUsd).toBe(50);
    expect(result.usAvailableCashUsd).toBe(4_643);
  });

  it("subtracts USD→SGD conversions from net stock cash", () => {
    const available = calculateUsAvailableCashUsd({
      contributions: [],
      fxConversions: [
        fxToUsd(10_000, 13_500, "fx-in"),
        {
          id: "fx-out",
          date: "2025-02-01",
          direction: "usd_to_sgd",
          sgdAmount: 2_700,
          usdAmount: 2_000,
          createdAt: "2025-02-01T00:00:00.000Z",
        },
      ],
      stockTransactions: [],
      fxRate: 1.35,
    });

    expect(available).toBe(8_000);
  });

  it("includes option open and close cash flows from trades", () => {
    const openCredit: OptionsTrade = {
      id: "open-credit",
      status: "open",
      tradeType: "personal",
      userSharePercent: 100,
      clientSharePercent: 0,
      strategy: "sellPut",
      underlying: "SPY",
      expirationDate: "2026-12-18",
      contracts: 1,
      openDate: "2025-06-01",
      openPremiumUsd: 100,
      openFeesUsd: 3,
      maxRiskUsd: 500,
      createdAt: "2025-06-01T00:00:00.000Z",
      updatedAt: "2025-06-01T00:00:00.000Z",
    };

    const available = calculateUsAvailableCashUsd({
      contributions: [],
      fxConversions: [fxToUsd(10_000, 13_500)],
      stockTransactions: [],
      fxRate: 1.35,
      optionsTrades: [openCredit],
    });

    expect(available).toBe(10_097);
  });

  it("scopes stock flows to US market only", () => {
    const available = calculateUsAvailableCashUsd({
      contributions: [],
      fxConversions: [fxToUsd(10_000, 13_500)],
      stockTransactions: [
        tx({
          id: "us-buy",
          market: "US",
          transactionType: "buy",
          grossAmount: 500,
          netAmount: -500,
          currency: "USD",
        }),
        tx({
          id: "sg-buy",
          market: "SG",
          transactionType: "buy",
          grossAmount: 200,
          netAmount: -200,
          currency: "SGD",
        }),
      ],
      fxRate: 1.35,
    });

    expect(available).toBe(9_500);
  });

  it("subtracts standalone US fees from available cash", () => {
    const available = calculateUsAvailableCashUsd({
      contributions: [],
      fxConversions: [fxToUsd(5_000, 6_750)],
      stockTransactions: [
        tx({
          id: "fee-1",
          transactionType: "fee",
          grossAmount: 0,
          fees: 15,
          netAmount: -15,
        }),
      ],
      fxRate: 1.35,
    });

    expect(available).toBe(4_985);
  });

  it("returns 0 USD net cash when no FX conversions exist", () => {
    const available = calculateUsAvailableCashUsd({
      contributions: [
        {
          id: "c1",
          date: "2025-01-01",
          type: "deposit",
          category: "stock",
          amountSgd: 13_500,
        },
      ],
      fxConversions: [],
      stockTransactions: [],
      fxRate: 1.35,
    });

    expect(available).toBe(0);
  });

  it("uses FX conversion USD amount independent of current FX", () => {
    const available = calculateUsAvailableCashUsd({
      contributions: [],
      fxConversions: [fxToUsd(568.18, 750, "fx-75")],
      stockTransactions: [],
      fxRate: 0,
    });

    expect(available).toBeCloseTo(568.18, 2);
  });

  it("buildUsCashTrace lists broker reconciliation components", () => {
    const openCredit: OptionsTrade = {
      id: "open-credit",
      status: "open",
      tradeType: "personal",
      userSharePercent: 100,
      clientSharePercent: 0,
      strategy: "sellPut",
      underlying: "SPY",
      expirationDate: "2026-12-18",
      contracts: 1,
      openDate: "2025-06-01",
      openPremiumUsd: 100,
      openFeesUsd: 3,
      maxRiskUsd: 500,
      createdAt: "2025-06-01T00:00:00.000Z",
      updatedAt: "2025-06-01T00:00:00.000Z",
    };

    const result = buildUsAvailableCashResult({
      contributions: [],
      fxConversions: [fxToUsd(1_000, 1_350)],
      stockTransactions: [],
      fxRate: 1.35,
      optionsTrades: [openCredit],
    });
    const trace = buildUsCashTrace(result);

    expect(trace.at(-1)?.amountUsd).toBe(result.usAvailableCashUsd);
    expect(result.usAvailableCashUsd).toBe(1_097);
    expect(trace.find((line) => line.label.includes("Option open"))?.amountUsd).toBe(
      97
    );
  });
});
