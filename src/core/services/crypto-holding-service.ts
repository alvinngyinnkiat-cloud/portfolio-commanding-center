import type { CryptoHolding } from "@/core/domain/types";
import type { CryptoHoldingRepository } from "@/core/database/repositories/crypto-holding-repository";
import {
  validateCryptoHoldingDraft,
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

  delete(id: string): void {
    this.repo.delete(id);
  }
}
