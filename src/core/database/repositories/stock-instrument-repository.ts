import type { StockInstrument } from "@/core/domain/types";

export interface StockInstrumentRepository {
  list(): StockInstrument[];
  upsert(instrument: StockInstrument): void;
  delete(market: StockInstrument["market"], ticker: string): void;
  replaceAll(instruments: StockInstrument[]): void;
}
