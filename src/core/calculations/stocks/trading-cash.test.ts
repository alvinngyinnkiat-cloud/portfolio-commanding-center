import { describe, expect, it } from "vitest";
import type { StockTransaction } from "@/core/domain/types";
import {
  calculateAvailableTradingCash,
  calculateSgAvailableCashSgd,
  summarizeMarketTradingCashFlow,
} from "./trading-cash";

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

describe("available trading cash", () => {
  it("acceptance: net cash 24.3k SGD, contribution 10k USD → US$8k available at FX 1.35", () => {
    const netStockCashContributedUsd = 18_000;
    const stockContributionUsd = 10_000;
    const available = calculateAvailableTradingCash(
      netStockCashContributedUsd,
      stockContributionUsd
    );

    expect(available).toBe(8_000);
  });

  it("acceptance: total value = holdings + available cash; P/L = holdings − contribution", () => {
    const usHoldingValueUsd = 10_259.5;
    const netStockCashContributedUsd = 18_000;
    const stockContributionUsd = 10_000;
    const fxRate = 1.35;

    const available = calculateAvailableTradingCash(
      netStockCashContributedUsd,
      stockContributionUsd
    );
    const totalValueUsd = usHoldingValueUsd + available;
    const plUsd = usHoldingValueUsd - stockContributionUsd;
    const plSgd = plUsd * fxRate;

    expect(available).toBe(8_000);
    expect(totalValueUsd).toBeCloseTo(18_259.5, 2);
    expect(plUsd).toBeCloseTo(259.5, 2);
    expect(plSgd).toBeCloseTo(350.33, 2);
  });

  it("aggregates sell proceeds and dividends for SG available cash ledger", () => {
    const transactions: StockTransaction[] = [
      tx({
        id: "buy-1",
        market: "SG",
        transactionType: "buy",
        grossAmount: 1_000,
        fees: 5,
        netAmount: -1_005,
        currency: "SGD",
      }),
      tx({
        id: "sell-1",
        market: "SG",
        transactionType: "sell",
        grossAmount: 600,
        fees: 2,
        netAmount: 598,
        currency: "SGD",
      }),
      tx({
        id: "div-1",
        market: "SG",
        transactionType: "dividend",
        grossAmount: 50,
        netAmount: 50,
        currency: "SGD",
      }),
    ];

    const flow = summarizeMarketTradingCashFlow(transactions, "SG");
    const sgAvailable = calculateSgAvailableCashSgd(5_000, transactions);

    expect(flow.sellProceeds).toBe(598);
    expect(flow.dividends).toBe(50);
    expect(sgAvailable).toBe(4_643);
  });

  it("sell cash effect uses gross proceeds minus fees, not netAmount alone", () => {
    const transactions: StockTransaction[] = [
      tx({
        id: "sell-1",
        transactionType: "sell",
        grossAmount: 600,
        fees: 2,
        netAmount: 999,
      }),
    ];
    const flow = summarizeMarketTradingCashFlow(transactions, "US");
    expect(flow.sellProceeds).toBe(598);
  });

  it("scopes flows by market", () => {
    const transactions: StockTransaction[] = [
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
    ];

    const usFlow = summarizeMarketTradingCashFlow(transactions, "US");
    const sgFlow = summarizeMarketTradingCashFlow(transactions, "SG");

    expect(usFlow.netBuySpend).toBe(500);
    expect(sgFlow.netBuySpend).toBe(200);
  });

  describe("Module 2 acceptance — SG available cash", () => {
    const sgContribution = 11_568.43;
    const priorSurplus = 714.82;

    it("test 1: SG buy reduces cash by total spend", () => {
      const transactions: StockTransaction[] = [
        tx({
          id: "sell-prior",
          market: "SG",
          transactionType: "sell",
          grossAmount: priorSurplus,
          netAmount: priorSurplus,
          currency: "SGD",
        }),
        tx({
          id: "sti-buy",
          market: "SG",
          ticker: "STI",
          transactionType: "buy",
          quantity: 100,
          price: 1,
          grossAmount: 100,
          netAmount: -100,
          currency: "SGD",
        }),
      ];

      const cash = calculateSgAvailableCashSgd(sgContribution, transactions);
      expect(cash).toBeCloseTo(12_183.25, 2);
    });

    it("test 1b: SG buy reduces cash when grossAmount is missing but qty × price exists", () => {
      const transactions: StockTransaction[] = [
        tx({
          id: "sell-prior",
          market: "SG",
          transactionType: "sell",
          grossAmount: priorSurplus,
          netAmount: priorSurplus,
          currency: "SGD",
        }),
        tx({
          id: "sti-buy",
          market: "SG",
          ticker: "STI",
          transactionType: "buy",
          quantity: 100,
          price: 1,
          grossAmount: 0,
          netAmount: 0,
          currency: "SGD",
        }),
      ];

      const cash = calculateSgAvailableCashSgd(sgContribution, transactions);
      expect(cash).toBeCloseTo(12_183.25, 2);
    });

    it("test 2: SG sell increases cash by proceeds minus fees", () => {
      const transactions: StockTransaction[] = [
        tx({
          id: "sell-1",
          market: "SG",
          transactionType: "sell",
          grossAmount: 500,
          fees: 5,
          netAmount: 495,
          currency: "SGD",
        }),
      ];

      const cash = calculateSgAvailableCashSgd(sgContribution, transactions);
      expect(cash).toBeCloseTo(sgContribution + 495, 2);
    });

    it("test 3: SG dividend increases cash", () => {
      const transactions: StockTransaction[] = [
        tx({
          id: "div-1",
          market: "SG",
          transactionType: "dividend",
          grossAmount: 100,
          netAmount: 100,
          currency: "SGD",
        }),
      ];

      const cash = calculateSgAvailableCashSgd(sgContribution, transactions);
      expect(cash).toBeCloseTo(sgContribution + 100, 2);
    });

    it("test 4: SG standalone fee decreases cash", () => {
      const transactions: StockTransaction[] = [
        tx({
          id: "fee-1",
          market: "SG",
          transactionType: "fee",
          fees: 10,
          netAmount: -10,
          currency: "SGD",
        }),
      ];

      const cash = calculateSgAvailableCashSgd(sgContribution, transactions);
      expect(cash).toBeCloseTo(sgContribution - 10, 2);
    });
  });
});
