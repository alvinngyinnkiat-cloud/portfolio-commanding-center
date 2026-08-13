import { describe, expect, it, beforeEach, vi } from "vitest";
import type { OptionsTrade } from "@/core/domain/types/options";
import {
  createSafetyBackup,
  readSafetyHistory,
  OPTIONS_SAFETY_HISTORY_KEY,
} from "./options-safety-backup";
import { resolveSafestOptionsTrades } from "./options-hydration";
import { STORAGE_KEYS } from "@/core/database/local/storage-keys";

function installLocalStorageMock(): void {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  });
  vi.stubGlobal("window", {});
  vi.stubGlobal("crypto", { randomUUID: () => "test-uuid" });
}

const trade = (id: string, status: OptionsTrade["status"] = "open"): OptionsTrade =>
  ({
    id,
    status,
    tradeType: "personal",
    strategy: "sellPut",
    underlying: "AAPL",
    openDate: "2026-01-01",
    expirationDate: "2026-02-01",
    contracts: 1,
    maxRiskUsd: 100,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  }) as OptionsTrade;

describe("options-safety-backup", () => {
  beforeEach(() => {
    installLocalStorageMock();
    localStorage.clear();
  });

  it("does not create empty safety backups", () => {
    expect(createSafetyBackup([])).toBeNull();
    expect(readSafetyHistory()).toHaveLength(0);
  });

  it("stores non-empty safety versions", () => {
    const version = createSafetyBackup([trade("t1"), trade("t2", "closed")]);
    expect(version?.tradeCount).toBe(2);
    expect(readSafetyHistory()).toHaveLength(1);
  });

  it("keeps newest 14 versions", () => {
    for (let i = 0; i < 16; i += 1) {
      createSafetyBackup([trade(`t-${i}`)]);
    }
    expect(readSafetyHistory()).toHaveLength(14);
  });
});

describe("resolveSafestOptionsTrades", () => {
  beforeEach(() => {
    installLocalStorageMock();
    localStorage.clear();
  });

  it("prefers supabase when cloud has trades", () => {
    const result = resolveSafestOptionsTrades([trade("cloud")]);
    expect(result.trades).toHaveLength(1);
    expect(result.source).toBe("supabase");
  });

  it("preserves local when cloud is empty", () => {
    localStorage.setItem(
      STORAGE_KEYS.optionsTrades,
      JSON.stringify([trade("local")])
    );
    const result = resolveSafestOptionsTrades([]);
    expect(result.trades).toHaveLength(1);
    expect(result.source).toBe("local");
    expect(result.warning).toContain("Cloud options data is empty");
  });

  it("requires recovery when only safety history has trades", () => {
    createSafetyBackup([trade("history")]);
    localStorage.removeItem(STORAGE_KEYS.optionsTrades);
    const result = resolveSafestOptionsTrades([]);
    expect(result.trades).toHaveLength(0);
    expect(result.loadState.recoveryRequired).toBe(true);
    expect(readSafetyHistory()).toHaveLength(1);
  });

  it("loads verified empty when all sources are empty", () => {
    const result = resolveSafestOptionsTrades([]);
    expect(result.trades).toHaveLength(0);
    expect(result.loadState.status).toBe("loaded");
    expect(result.loadState.recoveryRequired).toBe(false);
  });
});

describe("empty overwrite protection", () => {
  beforeEach(() => {
    installLocalStorageMock();
    localStorage.clear();
    localStorage.setItem(
      STORAGE_KEYS.optionsTrades,
      JSON.stringify([trade("keep-me")])
    );
  });

  it("does not clear safety history when hydrating empty cloud", () => {
    createSafetyBackup([trade("history-backup")]);
    resolveSafestOptionsTrades([]);
    expect(readSafetyHistory()).toHaveLength(1);
    expect(localStorage.getItem(OPTIONS_SAFETY_HISTORY_KEY)).not.toBe("[]");
  });
});
