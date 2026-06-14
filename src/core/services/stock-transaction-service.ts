import type { StockTransaction } from "@/core/domain/types";
import type { StockTransactionRepository } from "@/core/database/repositories/stock-transaction-repository";
import type { StockInstrumentRepository } from "@/core/database/repositories/stock-instrument-repository";
import { marketToCurrency, normalizeTicker } from "@/core/calculations/stocks/normalize";
import {
  type StockTransactionDraft,
  type StockValidationResult,
  validateStockTransactionUpsert,
} from "@/core/calculations/stocks/validation";
import { generateId } from "@/core/database/local/local-storage";

export type StockUpsertResult =
  | { ok: true; transaction: StockTransaction }
  | { ok: false; errors: StockValidationResult["errors"] };

export class StockTransactionService {
  constructor(
    private transactionRepo: StockTransactionRepository,
    private instrumentRepo: StockInstrumentRepository
  ) {}

  list(): StockTransaction[] {
    return this.transactionRepo
      .list()
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }

  upsert(draft: StockTransactionDraft): StockUpsertResult {
    const existing = this.transactionRepo.list();
    const id = draft.id ?? generateId();
    const existingRow = existing.find((tx) => tx.id === id);
    const createdAt = existingRow?.createdAt ?? new Date().toISOString();

    const result = validateStockTransactionUpsert(
      { ...draft, id },
      existing,
      createdAt,
      id
    );

    if (!result.valid || !result.transaction) {
      return { ok: false, errors: result.errors };
    }

    this.transactionRepo.upsert(result.transaction);
    this.syncInstrument(result.transaction);
    return { ok: true, transaction: result.transaction };
  }

  delete(id: string): void {
    this.transactionRepo.delete(id);
  }

  private syncInstrument(transaction: StockTransaction): void {
    const ticker = normalizeTicker(transaction.ticker);
    this.instrumentRepo.upsert({
      market: transaction.market,
      ticker,
      assetName: transaction.assetName,
      currency: marketToCurrency(transaction.market),
    });
  }
}
