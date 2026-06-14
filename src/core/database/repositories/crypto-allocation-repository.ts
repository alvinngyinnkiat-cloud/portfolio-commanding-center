import type { CryptoAllocationSettings } from "@/core/domain/types";

export interface CryptoAllocationRepository {
  get(): CryptoAllocationSettings;
  save(settings: CryptoAllocationSettings): void;
}
