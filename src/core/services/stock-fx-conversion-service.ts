import type { StockFxConversion } from "@/core/domain/types/stock-fx-conversion";
import type { StockFxConversionRepository } from "@/core/database/repositories/stock-fx-conversion-repository";
import { sortByDateDesc } from "@/shared/lib/sort";

export class StockFxConversionService {
  constructor(private repo: StockFxConversionRepository) {}

  list(): StockFxConversion[] {
    return sortByDateDesc(
      this.repo.list().map((row) => ({
        ...row,
        createdAt: row.createdAt ?? new Date().toISOString(),
      }))
    );
  }

  upsert(conversion: StockFxConversion): void {
    this.repo.upsert(conversion);
  }

  delete(id: string): void {
    this.repo.delete(id);
  }
}
