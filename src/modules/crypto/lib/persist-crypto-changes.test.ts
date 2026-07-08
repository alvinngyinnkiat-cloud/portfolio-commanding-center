import { beforeEach, describe, expect, it, vi } from "vitest";

const drainMock = vi.fn(async () => {
  await new Promise((resolve) => setTimeout(resolve, 15));
});
const rehydrateMock = vi.fn(async () => ({ holdings: true, trades: true }));

vi.mock("@/core/database/supabase", () => ({
  getPersistenceManager: () => ({
    drainSyncQueue: drainMock,
    rehydrateCryptoFromSupabase: rehydrateMock,
    getStatus: () => "supabase" as const,
    isCryptoTradesSyncAvailable: () => true,
  }),
}));

import {
  persistCryptoChanges,
  resetCryptoPersistQueueForTests,
} from "./persist-crypto-changes";

describe("persistCryptoChanges", () => {
  beforeEach(() => {
    resetCryptoPersistQueueForTests();
    drainMock.mockClear();
    rehydrateMock.mockClear();
  });

  it("waits for persistence drain before reporting success", async () => {
    const result = await persistCryptoChanges();
    expect(result.ok).toBe(true);
    expect(drainMock).toHaveBeenCalledTimes(1);
  });

  it("refetches crypto from Supabase after drain in cloud mode", async () => {
    await persistCryptoChanges();
    expect(rehydrateMock).toHaveBeenCalledTimes(1);
  });

  it("runs concurrent persist requests sequentially", async () => {
    let active = 0;
    let maxActive = 0;

    drainMock.mockImplementation(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
    });

    await Promise.all([persistCryptoChanges(), persistCryptoChanges()]);

    expect(drainMock).toHaveBeenCalledTimes(2);
    expect(maxActive).toBe(1);
  });
});
