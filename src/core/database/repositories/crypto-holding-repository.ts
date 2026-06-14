import type { CryptoHolding } from "@/core/domain/types";

export interface CryptoHoldingRepository {
  list(): CryptoHolding[];
  upsert(holding: CryptoHolding): void;
  delete(id: string): void;
  replaceAll(holdings: CryptoHolding[]): void;
}
