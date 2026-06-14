import type { CryptoAllocationSettings } from "@/core/domain/types";
import type { CryptoAllocationRepository } from "../repositories/crypto-allocation-repository";
import { DEFAULT_CRYPTO_ALLOCATION } from "@/core/calculations/crypto/allocation";
import { STORAGE_KEYS } from "./storage-keys";
import { readJson, writeJson } from "./local-storage";

export class LocalCryptoAllocationRepository implements CryptoAllocationRepository {
  get(): CryptoAllocationSettings {
    return readJson<CryptoAllocationSettings>(
      STORAGE_KEYS.cryptoAllocationSettings,
      DEFAULT_CRYPTO_ALLOCATION
    );
  }

  save(settings: CryptoAllocationSettings): void {
    writeJson(STORAGE_KEYS.cryptoAllocationSettings, settings);
  }
}
