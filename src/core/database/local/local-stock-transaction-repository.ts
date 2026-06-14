import type { StockTransaction } from "@/core/domain/types";
import type { StockTransactionRepository } from "../repositories/stock-transaction-repository";
import { STORAGE_KEYS } from "./storage-keys";
import { readJson, writeJson } from "./local-storage";

const EMPTY_TRANSACTIONS: StockTransaction[] = [];

export class LocalStockTransactionRepository implements StockTransactionRepository {
  list(): StockTransaction[] {
    return readJson(STORAGE_KEYS.stockTransactions, EMPTY_TRANSACTIONS);
  }

  upsert(transaction: StockTransaction): void {
    const list = this.list();
    const idx = list.findIndex((row) => row.id === transaction.id);
    if (idx >= 0) {
      list[idx] = transaction;
    } else {
      list.push(transaction);
    }
    this.replaceAll(list);
  }

  delete(id: string): void {
    this.replaceAll(this.list().filter((row) => row.id !== id));
  }

  replaceAll(transactions: StockTransaction[]): void {
    writeJson(STORAGE_KEYS.stockTransactions, transactions);
  }
}
