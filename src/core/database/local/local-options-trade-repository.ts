import type { OptionsTrade } from "@/core/domain/types/options";
import {
  normalizeOptionsTradeForStorage,
  normalizeOptionsTradesForStorage,
} from "@/core/calculations/options/trade-dates";
import { createSafetyBackup } from "@/core/database/options/options-safety-backup";
import type { OptionsTradeRepository } from "../repositories/options-repository";
import { STORAGE_KEYS } from "./storage-keys";
import { readJson, writeJson } from "./local-storage";

function persistLocalTrades(list: OptionsTrade[], allowEmpty = false): void {
  if (list.length === 0 && !allowEmpty) {
    const existing = readJson<OptionsTrade[]>(STORAGE_KEYS.optionsTrades, []);
    if (existing.length > 0) {
      console.warn(
        "[Options Safety] Skipped writing empty local copy — existing trades preserved."
      );
      return;
    }
  }
  writeJson(STORAGE_KEYS.optionsTrades, list);
}

function afterOptionsWrite(list: OptionsTrade[], allowEmpty = false): void {
  persistLocalTrades(list, allowEmpty);
  createSafetyBackup(list);
}

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
    afterOptionsWrite(list);
  }

  update(trade: OptionsTrade): void {
    const list = this.list();
    const idx = list.findIndex((row) => row.id === trade.id);
    if (idx < 0) return;
    list[idx] = normalizeOptionsTradeForStorage(trade);
    afterOptionsWrite(list);
  }

  remove(id: string): void {
    const list = this.list().filter((trade) => trade.id !== id);
    afterOptionsWrite(list, true);
  }
}
