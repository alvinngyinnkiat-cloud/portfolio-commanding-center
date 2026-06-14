import { describe, expect, it, vi } from "vitest";
import { runScannerManualRefresh } from "./scanner-refresh-service";

describe("runScannerManualRefresh", () => {
  it("updates candles then runs scan", async () => {
    const updateCandles = vi.fn(async () => ({
      updated: true,
      symbolsRequested: 1,
      symbolsUpdated: 1,
      symbolsFailed: 0,
    }));
    const runScan = vi.fn(() => ({
      refreshStatus: "success" as const,
    }));

    const result = await runScannerManualRefresh(
      updateCandles,
      runScan as never
    );

    expect(updateCandles.mock.invocationCallOrder[0]).toBeLessThan(
      runScan.mock.invocationCallOrder[0]
    );
    expect(result.outcome).toBe("success");
  });
});
