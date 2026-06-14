import type { StockTransaction } from "@/core/domain/types";

export interface StockTransactionRepository {
  list(): StockTransaction[];
  upsert(transaction: StockTransaction): void;
  delete(id: string): void;
  replaceAll(transactions: StockTransaction[]): void;
}
