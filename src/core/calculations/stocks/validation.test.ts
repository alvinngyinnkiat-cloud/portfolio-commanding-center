import { describe, expect, it } from "vitest";
import type { StockTransactionDraft } from "./validation";
import {
  buildStockTransactionFromDraft,
  validateStockTransactionDraft,
  validateStockTransactionUpsert,
  validateTransactionLedger,
} from "./validation";

function baseDraft(
  overrides: Partial<StockTransactionDraft> = {}
): StockTransactionDraft {
  return {
    date: "2025-01-15",
    market: "US",
    ticker: "AAPL",
    assetName: "Apple Inc.",
    instrumentType: "stock",
    transactionType: "buy",
    quantity: "10",
    price: "150",
    fees: "5",
    amount: "",
    notes: "",
    ...overrides,
  };
}

describe("stock transaction validation", () => {
  it("requires transaction date", () => {
    const result = validateStockTransactionDraft(baseDraft({ date: "" }));
    expect(result.valid).toBe(false);
    expect(result.errors.date).toBeDefined();
  });

  it("requires quantity > 0 for buy", () => {
    const result = validateStockTransactionDraft(baseDraft({ quantity: "0" }));
    expect(result.valid).toBe(false);
    expect(result.errors.quantity).toMatch(/greater than zero/i);
  });

  it("requires price >= 0 for sell", () => {
    const negative = validateStockTransactionDraft(
      baseDraft({ transactionType: "sell", price: "-1" })
    );
    expect(negative.valid).toBe(false);
    expect(negative.errors.price).toBeDefined();

    const zero = validateStockTransactionDraft(
      baseDraft({ transactionType: "sell", price: "0" })
    );
    expect(zero.valid).toBe(true);
  });

  it("requires market US or SG", () => {
    const result = validateStockTransactionDraft(baseDraft({ market: "HK" }));
    expect(result.valid).toBe(false);
    expect(result.errors.market).toMatch(/US or SG/i);
  });

  it("assigns currency from market on build", () => {
    const us = buildStockTransactionFromDraft(
      baseDraft({ market: "US" }),
      "2025-01-01T00:00:00.000Z",
      "tx-us"
    );
    const sg = buildStockTransactionFromDraft(
      baseDraft({
        market: "SG",
        ticker: "D05",
        assetName: "DBS",
        quantity: "100",
        price: "35",
      }),
      "2025-01-01T00:00:00.000Z",
      "tx-sg"
    );

    expect(us?.currency).toBe("USD");
    expect(sg?.currency).toBe("SGD");
  });

  it("rejects sell exceeding owned shares", () => {
    const existingBuy = buildStockTransactionFromDraft(
      baseDraft({ date: "2025-01-01" }),
      "2025-01-01T00:00:00.000Z",
      "buy-1"
    )!;

    const result = validateStockTransactionUpsert(
      baseDraft({
        transactionType: "sell",
        quantity: "11",
        price: "180",
        fees: "0",
      }),
      [existingBuy],
      "2025-02-01T00:00:00.000Z",
      "sell-1"
    );

    expect(result.valid).toBe(false);
    expect(result.errors.quantity).toMatch(/Cannot sell more/i);
    expect(result.errors.ledger).toBeDefined();
  });

  it("allows valid sell within owned quantity", () => {
    const existingBuy = buildStockTransactionFromDraft(
      baseDraft({ date: "2025-01-01" }),
      "2025-01-01T00:00:00.000Z",
      "buy-1"
    )!;

    const result = validateStockTransactionUpsert(
      baseDraft({
        transactionType: "sell",
        quantity: "5",
        price: "180",
        fees: "3",
      }),
      [existingBuy],
      "2025-02-01T00:00:00.000Z",
      "sell-1"
    );

    expect(result.valid).toBe(true);
    expect(result.transaction?.quantity).toBe(5);
    expect(result.transaction?.netAmount).toBe(897);
  });

  it("rejects stored rows with mismatched currency", () => {
    const buy = buildStockTransactionFromDraft(
      baseDraft(),
      "2025-01-01T00:00:00.000Z",
      "buy-1"
    )!;
    const bad = { ...buy, currency: "SGD" as const };

    const result = validateTransactionLedger([bad]);
    expect(result.valid).toBe(false);
    expect(result.errors.currency).toBeDefined();
  });

  it("validates dividend without quantity or price", () => {
    const result = validateStockTransactionDraft(
      baseDraft({
        transactionType: "dividend",
        quantity: "",
        price: "",
        amount: "25",
        fees: "0",
      })
    );
    expect(result.valid).toBe(true);
  });

  it("validates fee amount > 0", () => {
    const result = validateStockTransactionDraft(
      baseDraft({
        transactionType: "fee",
        quantity: "",
        price: "",
        amount: "0",
      })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeDefined();
  });

  it("updates an existing transaction in place with the same id and createdAt", () => {
    const createdAt = "2025-01-01T00:00:00.000Z";
    const existingBuy = buildStockTransactionFromDraft(
      baseDraft({ date: "2025-01-01" }),
      createdAt,
      "tx-1"
    )!;

    const result = validateStockTransactionUpsert(
      baseDraft({
        id: "tx-1",
        quantity: "20",
        price: "160",
        fees: "0",
      }),
      [existingBuy],
      createdAt,
      "tx-1"
    );

    expect(result.valid).toBe(true);
    expect(result.transaction?.id).toBe("tx-1");
    expect(result.transaction?.createdAt).toBe(createdAt);
    expect(result.transaction?.quantity).toBe(20);
    expect(result.transaction?.price).toBe(160);
  });

  it("rejects edit that would sell more shares than owned", () => {
    const createdAt = "2025-01-01T00:00:00.000Z";
    const existingBuy = buildStockTransactionFromDraft(
      baseDraft({ date: "2025-01-01", quantity: "10" }),
      createdAt,
      "buy-1"
    )!;

    const result = validateStockTransactionUpsert(
      baseDraft({
        id: "buy-1",
        transactionType: "sell",
        quantity: "11",
        price: "180",
        fees: "0",
      }),
      [existingBuy],
      createdAt,
      "buy-1"
    );

    expect(result.valid).toBe(false);
    expect(result.errors.quantity).toMatch(/Cannot sell more/i);
  });

  it("allows editing a buy date after an existing sell when net holdings stay valid", () => {
    const createdAt = "2025-01-01T00:00:00.000Z";
    const existingBuy = buildStockTransactionFromDraft(
      baseDraft({
        date: "2025-01-01",
        ticker: "NVDA",
        assetName: "NVIDIA",
        quantity: "82",
        price: "100",
        fees: "0",
      }),
      createdAt,
      "buy-1"
    )!;
    const existingSell = buildStockTransactionFromDraft(
      baseDraft({
        date: "2025-06-01",
        ticker: "NVDA",
        assetName: "NVIDIA",
        transactionType: "sell",
        quantity: "82",
        price: "120",
        fees: "0",
      }),
      "2025-06-01T00:00:00.000Z",
      "sell-1"
    )!;

    const result = validateStockTransactionUpsert(
      baseDraft({
        id: "buy-1",
        date: "2025-07-01",
        ticker: "NVDA",
        assetName: "NVIDIA",
        quantity: "82",
        price: "100",
        fees: "0",
      }),
      [existingBuy, existingSell],
      createdAt,
      "buy-1"
    );

    expect(result.valid).toBe(true);
    expect(result.transaction?.date).toBe("2025-07-01");
    expect(result.transaction?.createdAt).toBe(createdAt);
  });

  it("rejects editing a buy when net holdings would become negative", () => {
    const createdAt = "2025-01-01T00:00:00.000Z";
    const existingBuy = buildStockTransactionFromDraft(
      baseDraft({ date: "2025-01-01", quantity: "100" }),
      createdAt,
      "buy-1"
    )!;
    const existingSell = buildStockTransactionFromDraft(
      baseDraft({
        date: "2025-06-01",
        transactionType: "sell",
        quantity: "80",
        price: "180",
        fees: "0",
      }),
      "2025-06-01T00:00:00.000Z",
      "sell-1"
    )!;

    const result = validateStockTransactionUpsert(
      baseDraft({
        id: "buy-1",
        quantity: "50",
        price: "150",
        fees: "0",
      }),
      [existingBuy, existingSell],
      createdAt,
      "buy-1"
    );

    expect(result.valid).toBe(false);
    expect(result.errors.ledger).toMatch(/negative/i);
  });
});
