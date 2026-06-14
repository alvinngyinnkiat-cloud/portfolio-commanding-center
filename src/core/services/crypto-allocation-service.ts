import type { CryptoAllocationSettings } from "@/core/domain/types";
import type { CryptoAllocationRepository } from "@/core/database/repositories/crypto-allocation-repository";

export class CryptoAllocationService {
  constructor(private readonly repo: CryptoAllocationRepository) {}

  get(): CryptoAllocationSettings {
    return this.repo.get();
  }

  save(settings: CryptoAllocationSettings): void {
    this.repo.save(settings);
  }
}
