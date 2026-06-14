import type { StockFxConversion } from "@/core/domain/types/stock-fx-conversion";
import type { StockFxConversionRepository } from "../repositories/stock-fx-conversion-repository";
import { STORAGE_KEYS } from "./storage-keys";
import { readJson, writeJson } from "./local-storage";

export class LocalStockFxConversionRepository implements StockFxConversionRepository {
  list(): StockFxConversion[] {
    return readJson(STORAGE_KEYS.stockFxConversions, []);
  }

  upsert(conversion: StockFxConversion): void {
    const list = this.list();
    const idx = list.findIndex((row) => row.id === conversion.id);
    if (idx >= 0) {
      list[idx] = conversion;
    } else {
      list.push(conversion);
    }
    this.replaceAll(list);
  }

  delete(id: string): void {
    this.replaceAll(this.list().filter((row) => row.id !== id));
  }

  replaceAll(conversions: StockFxConversion[]): void {
    writeJson(STORAGE_KEYS.stockFxConversions, conversions);
  }
}
