import { describe, expect, it } from "vitest";
import { buildOptionsClientSummary } from "./client-summary";
import { DEFAULT_OPTIONS_SETTINGS } from "@/core/domain/defaults-options";
import type {
  OptionsClosedTradeRow,
  OptionsOpenTradeRow,
} from "@/core/domain/types/options";

describe("buildOptionsClientSummary", () => {
  it("computes client equity and return from settings and shared trades", () => {
    const settings = {
      ...DEFAULT_OPTIONS_SETTINGS,
      clientName: "Sister Portfolio",
      clientStartingCapitalUsd: 3000,
    };

    const openRows = [
      {
        trade: { tradeType: "shared", maxRiskUsd: 1500 },
        clientUnrealizedPlUsd: 100,
      },
      {
        trade: { tradeType: "shared", maxRiskUsd: 2500 },
        clientUnrealizedPlUsd: null,
      },
      {
        trade: { tradeType: "personal", maxRiskUsd: 999 },
        clientUnrealizedPlUsd: 500,
      },
    ] as OptionsOpenTradeRow[];

    const closedRows = [
      {
        trade: { tradeType: "shared", realizedPlUsd: 400 },
        clientRealizedPlUsd: 250,
      },
      {
        trade: { tradeType: "personal", realizedPlUsd: 100 },
        clientRealizedPlUsd: 0,
      },
    ] as OptionsClosedTradeRow[];

    const summary = buildOptionsClientSummary(settings, openRows, closedRows);

    expect(summary.clientName).toBe("Sister Portfolio");
    expect(summary.startingCapitalUsd).toBe(3000);
    expect(summary.clientRealizedPlUsd).toBe(250);
    expect(summary.clientUnrealizedPlUsd).toBe(100);
    expect(summary.clientEquityUsd).toBe(3350);
    expect(summary.returnPercent).toBeCloseTo(11.6667, 3);
    expect(summary.openSharedTradeCount).toBe(2);
    expect(summary.openSharedRiskUsd).toBe(4000);
  });

  it("uses zero unrealized in equity when no shared trades are marked", () => {
    const summary = buildOptionsClientSummary(
      { ...DEFAULT_OPTIONS_SETTINGS, clientStartingCapitalUsd: 3000 },
      [
        {
          trade: { tradeType: "shared", maxRiskUsd: 1000 },
          clientUnrealizedPlUsd: null,
        },
      ] as OptionsOpenTradeRow[],
      []
    );

    expect(summary.clientUnrealizedPlUsd).toBeNull();
    expect(summary.clientEquityUsd).toBe(3000);
    expect(summary.returnPercent).toBe(0);
  });

  it("returns null return percent when starting capital is zero", () => {
    const summary = buildOptionsClientSummary(
      { ...DEFAULT_OPTIONS_SETTINGS, clientStartingCapitalUsd: 0, clientName: "" },
      [],
      []
    );

    expect(summary.returnPercent).toBeNull();
  });
});
