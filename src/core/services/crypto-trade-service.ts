import type { CryptoTradeRepository } from "@/core/database/repositories/crypto-trade-repository";
import type { CryptoHoldingRepository } from "@/core/database/repositories/crypto-holding-repository";
import type { CryptoTrade } from "@/core/domain/types";
import { rebuildHoldingsFromTrades } from "@/core/calculations/crypto/trades";
import {
  validateCryptoTradeDraft,
  type CryptoTradeDraft,
} from "@/core/calculations/crypto/trade-validation";
import { generateId } from "@/core/database/local/local-storage";

export class CryptoTradeService {
  constructor(
    private readonly trades: CryptoTradeRepository,
    private readonly holdings: CryptoHoldingRepository
  ) {}

  list(): CryptoTrade[] {
    return this.trades.list();
  }

  upsertFromDraft(
    draft: CryptoTradeDraft,
    id?: string
  ): CryptoTrade | null {
    const validation = validateCryptoTradeDraft(draft, this.holdings.list());
    if (!validation.valid || !validation.values) return null;

    const existing = this.trades.list();
    const trade: CryptoTrade = {
      id: id ?? generateId(),
      createdAt:
        id != null
          ? existing.find((row) => row.id === id)?.createdAt ??
            new Date().toISOString()
          : new Date().toISOString(),
      ...validation.values,
    };
    const idx = existing.findIndex((row) => row.id === trade.id);
    const nextTrades =
      idx >= 0
        ? existing.map((row) => (row.id === trade.id ? trade : row))
        : [...existing, trade];

    this.syncHoldings(nextTrades);
    this.trades.upsert(trade);
    return trade;
  }

  delete(id: string): void {
    const nextTrades = this.trades.list().filter((row) => row.id !== id);
    this.syncHoldings(nextTrades);
    this.trades.delete(id);
  }

  replaceAll(trades: CryptoTrade[]): void {
    this.trades.replaceAll(trades);
    this.syncHoldings(trades);
  }

  private syncHoldings(trades: CryptoTrade[]): void {
    const rebuilt = rebuildHoldingsFromTrades(trades, this.holdings.list());
    this.holdings.replaceAll(rebuilt);
  }
}
