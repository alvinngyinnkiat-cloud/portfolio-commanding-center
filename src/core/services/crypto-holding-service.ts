import type { CryptoHolding } from "@/core/domain/types";
import type { CryptoHoldingRepository } from "@/core/database/repositories/crypto-holding-repository";
import {
  validateCryptoHoldingDraft,
  validateCryptoHoldingValueDraft,
  type CryptoHoldingDraft,
} from "@/core/calculations/crypto/validation";
import { generateId } from "@/core/database/local/local-storage";

export class CryptoHoldingService {
  constructor(private readonly repo: CryptoHoldingRepository) {}

  list(): CryptoHolding[] {
    return this.repo.list();
  }

  upsertFromDraft(draft: CryptoHoldingDraft, id?: string): CryptoHolding | null {
    const result = validateCryptoHoldingDraft(draft);
    if (!result.valid || !result.values) return null;

    const holding: CryptoHolding = {
      id: id ?? generateId(),
      ...result.values,
    };
    this.repo.upsert(holding);
    return holding;
  }

  updateValuation(
    id: string,
    draft: { currentValueSgd: string; notes: string }
  ): CryptoHolding | null {
    const existing = this.repo.list().find((row) => row.id === id);
    if (!existing) return null;

    const result = validateCryptoHoldingValueDraft(draft);
    if (!result.valid || !result.values) return null;

    const holding: CryptoHolding = {
      ...existing,
      currentValueSgd: result.values.currentValueSgd,
      notes: result.values.notes,
    };
    this.repo.upsert(holding);
    return holding;
  }

  delete(id: string): void {
    this.repo.delete(id);
  }
}
