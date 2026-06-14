import type { CryptoHolding } from "@/core/domain/types";
import type { CryptoHoldingRepository } from "../repositories/crypto-holding-repository";
import { STORAGE_KEYS } from "./storage-keys";
import { readJson, writeJson } from "./local-storage";

export class LocalCryptoHoldingRepository implements CryptoHoldingRepository {
  list(): CryptoHolding[] {
    return readJson<CryptoHolding[]>(STORAGE_KEYS.cryptoHoldings, []);
  }

  upsert(holding: CryptoHolding): void {
    const list = this.list();
    const idx = list.findIndex((h) => h.id === holding.id);
    if (idx >= 0) {
      list[idx] = holding;
    } else {
      list.push(holding);
    }
    this.replaceAll(list);
  }

  delete(id: string): void {
    this.replaceAll(this.list().filter((h) => h.id !== id));
  }

  replaceAll(holdings: CryptoHolding[]): void {
    writeJson(STORAGE_KEYS.cryptoHoldings, holdings);
  }
}
