import type { OptionsTrade } from "@/core/domain/types/options";
import { normalizeOptionsTradeForStorage, normalizeOptionsTradesForStorage } from "@/core/calculations/options/trade-dates";
import type { OptionsTradeRepository } from "../repositories/options-repository";
import { STORAGE_KEYS } from "./storage-keys";
import { readJson, writeJson } from "./local-storage";

export class LocalOptionsTradeRepository implements OptionsTradeRepository {
  list(): OptionsTrade[] {
    return normalizeOptionsTradesForStorage(
      readJson<OptionsTrade[]>(STORAGE_KEYS.optionsTrades, [])
    );
  }

  getById(id: string): OptionsTrade | null {
    return this.list().find((trade) => trade.id === id) ?? null;
  }

  append(trade: OptionsTrade): void {
    const list = this.list();
    list.push(normalizeOptionsTradeForStorage(trade));
    writeJson(STORAGE_KEYS.optionsTrades, list);
  }

  update(trade: OptionsTrade): void {
    const list = this.list();
    const idx = list.findIndex((row) => row.id === trade.id);
    if (idx < 0) return;
    list[idx] = normalizeOptionsTradeForStorage(trade);
    writeJson(STORAGE_KEYS.optionsTrades, list);
  }

  remove(id: string): void {
    writeJson(
      STORAGE_KEYS.optionsTrades,
      this.list().filter((trade) => trade.id !== id)
    );
  }
}
