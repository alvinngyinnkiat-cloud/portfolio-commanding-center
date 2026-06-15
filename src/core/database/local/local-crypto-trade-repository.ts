import type { CryptoTrade } from "@/core/domain/types";
import type { CryptoTradeRepository } from "../repositories/crypto-trade-repository";
import { STORAGE_KEYS } from "./storage-keys";
import { readJson, writeJson } from "./local-storage";

export class LocalCryptoTradeRepository implements CryptoTradeRepository {
  list(): CryptoTrade[] {
    return readJson<CryptoTrade[]>(STORAGE_KEYS.cryptoTrades, []);
  }

  upsert(trade: CryptoTrade): boolean {
    const list = this.list();
    const idx = list.findIndex((row) => row.id === trade.id);
    if (idx >= 0) {
      list[idx] = trade;
    } else {
      list.push(trade);
    }
    this.replaceAll(list);
    return true;
  }

  delete(id: string): void {
    this.replaceAll(this.list().filter((row) => row.id !== id));
  }

  replaceAll(trades: CryptoTrade[]): void {
    writeJson(STORAGE_KEYS.cryptoTrades, trades);
  }
}
