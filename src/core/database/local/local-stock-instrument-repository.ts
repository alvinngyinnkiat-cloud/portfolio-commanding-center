import type { StockInstrument } from "@/core/domain/types";
import type { StockInstrumentRepository } from "../repositories/stock-instrument-repository";
import { STORAGE_KEYS } from "./storage-keys";
import { readJson, writeJson } from "./local-storage";

const EMPTY_INSTRUMENTS: StockInstrument[] = [];

export class LocalStockInstrumentRepository implements StockInstrumentRepository {
  list(): StockInstrument[] {
    return readJson(STORAGE_KEYS.stockInstruments, EMPTY_INSTRUMENTS);
  }

  upsert(instrument: StockInstrument): void {
    const list = this.list();
    const idx = list.findIndex(
      (row) => row.market === instrument.market && row.ticker === instrument.ticker
    );
    if (idx >= 0) {
      list[idx] = instrument;
    } else {
      list.push(instrument);
    }
    this.replaceAll(list);
  }

  delete(market: StockInstrument["market"], ticker: string): void {
    this.replaceAll(
      this.list().filter((row) => !(row.market === market && row.ticker === ticker))
    );
  }

  replaceAll(instruments: StockInstrument[]): void {
    writeJson(STORAGE_KEYS.stockInstruments, instruments);
  }
}
