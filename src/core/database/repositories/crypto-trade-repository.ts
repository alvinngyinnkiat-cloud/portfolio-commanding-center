import type { CryptoTrade } from "@/core/domain/types";

export interface CryptoTradeRepository {
  list(): CryptoTrade[];
  upsert(trade: CryptoTrade): boolean;
  delete(id: string): void;
  replaceAll(trades: CryptoTrade[]): void;
}
