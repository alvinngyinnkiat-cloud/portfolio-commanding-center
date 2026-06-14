import type { StockFxConversion } from "@/core/domain/types/stock-fx-conversion";

export interface StockFxConversionRepository {
  list(): StockFxConversion[];
  upsert(conversion: StockFxConversion): void;
  delete(id: string): void;
  replaceAll(conversions: StockFxConversion[]): void;
}
