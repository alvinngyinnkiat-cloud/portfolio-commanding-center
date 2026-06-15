import { describe, expect, it } from "vitest";
import {
  resolveOpenTradeDraft,
  validateClosedTradeEditDraft,
  type ClosedTradeEditDraft,
} from "./validation";
import { calculateRealizedPlUsd, resolveClosedTradeRealizedPlUsd } from "./realized-pl";
import { DEFAULT_OPTIONS_SETTINGS } from "@/core/domain/defaults-options";
import type { OptionsTrade } from "@/core/domain/types/options";

const closedTrade: OptionsTrade = {
  id: "t1",
  status: "closed",
  tradeType: "personal",
  userSharePercent: 100,
  clientSharePercent: 0,
  strategy: "bullPut",
  underlying: "NVDA",
  expirationDate: "2025-06-20",
  contracts: 2,
  shortStrikeUsd: 100,
  longStrikeUsd: 95,
  openDate: "2025-06-01",
  closeDate: "2025-06-10",
  openPremiumUsd: 420,
  openFeesUsd: 2.5,
  maxRiskUsd: 582.5,
  closePremiumUsd: 48,
  closeFeesUsd: 2.5,
  realizedPlUsd: 367,
  createdAt: "2025-06-01T00:00:00.000Z",
  updatedAt: "2025-06-10T00:00:00.000Z",
};

function baseDraft(overrides: Partial<ClosedTradeEditDraft> = {}): ClosedTradeEditDraft {
  return {
    tradeType: "personal",
    userSharePercent: 100,
    clientSharePercent: 0,
    strategy: "bullPut",
    underlying: "NVDA",
    expirationDate: "2025-06-20",
    contracts: 2,
    shortStrikeUsd: 100,
    longStrikeUsd: 95,
    openDate: "2025-06-01",
    openPremiumUsd: 420,
    openFeesUsd: 2.5,
    closeDate: "2025-06-10",
    closeMethod: "normal" as const,
    closePremiumUsd: 48,
    closeFeesUsd: 2.5,
    ...overrides,
  };
}

describe("validateClosedTradeEditDraft", () => {
  it("accepts valid closed trade edits", () => {
    const errors = validateClosedTradeEditDraft(
      closedTrade,
      baseDraft(),
      DEFAULT_OPTIONS_SETTINGS
    );
    expect(errors).toHaveLength(0);
  });

  it("rejects close date before open date", () => {
    const errors = validateClosedTradeEditDraft(
      closedTrade,
      baseDraft({ closeDate: "2025-05-31" }),
      DEFAULT_OPTIONS_SETTINGS
    );
    expect(errors.some((e) => e.field === "closeDate")).toBe(true);
  });

  it("rejects editing open trades", () => {
    const errors = validateClosedTradeEditDraft(
      { ...closedTrade, status: "open" },
      baseDraft(),
      DEFAULT_OPTIONS_SETTINGS
    );
    expect(errors.some((e) => e.field === "status")).toBe(true);
  });
});

describe("closed trade realized P/L recalculation", () => {
  it("uses close debit dollar value from option price × 100 × contracts", () => {
    const draft = baseDraft({
      closePremiumUsd: 48,
      closeFeesUsd: 2.5,
    });
    const resolved = resolveOpenTradeDraft(draft);
    const realized = calculateRealizedPlUsd({
      openPremiumUsd: resolved.openPremiumUsd,
      openFeesUsd: resolved.openFeesUsd,
      closePremiumUsd: draft.closePremiumUsd,
      closeFeesUsd: draft.closeFeesUsd,
    });
    expect(realized).toBe(367);
  });

  it("uses manual realized P/L when close method is manual_pl", () => {
    const realized = resolveClosedTradeRealizedPlUsd({
      closeMethod: "manual_pl",
      openPremiumUsd: 420,
      openFeesUsd: 2.5,
      manualRealizedPlUsd: -1190.59,
    });
    expect(realized).toBe(-1190.59);
  });
});
