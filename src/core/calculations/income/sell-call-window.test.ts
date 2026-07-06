import { describe, expect, it } from "vitest";
import {
  calculateFoundationTriggerPrice,
  deriveIncomeDecisionStatus,
  evaluateSellCallTimingRules,
} from "./sell-call-window";

describe("sell-call-window", () => {
  const baseInput = {
    foundationChecklistPass: true,
    currentPriceUsd: 110,
    foundationBreakevenUsd: 100,
    atr14: 2,
    atrMultiplier: 2.5,
    avgPriceUsd: 108,
    avgPricePrevUsd: 109,
  };

  it("computes foundation trigger price", () => {
    expect(calculateFoundationTriggerPrice(100, 2, 2.5)).toBe(105);
  });

  it("returns waiting for trigger when price is below trigger", () => {
    expect(
      deriveIncomeDecisionStatus({
        ...baseInput,
        currentPriceUsd: 104,
      })
    ).toBe("waiting_for_trigger");
  });

  it("returns waiting for confirmation when rule 1 passes and rule 2 fails", () => {
    expect(
      deriveIncomeDecisionStatus({
        ...baseInput,
        currentPriceUsd: 106,
        avgPricePrevUsd: 107,
        avgPriceUsd: 108,
      })
    ).toBe("waiting_for_confirmation");
  });

  it("returns sell call window open when both rules pass", () => {
    expect(deriveIncomeDecisionStatus(baseInput)).toBe("sell_call_window_open");
  });

  it("resets to waiting for trigger when price falls below trigger before confirmation", () => {
    const rules = evaluateSellCallTimingRules({
      ...baseInput,
      currentPriceUsd: 104,
      avgPricePrevUsd: 109,
      avgPriceUsd: 108,
    });
    expect(rules[0]?.pass).toBe(false);
    expect(
      deriveIncomeDecisionStatus({
        ...baseInput,
        currentPriceUsd: 104,
        avgPricePrevUsd: 109,
        avgPriceUsd: 108,
      })
    ).toBe("waiting_for_trigger");
  });
});
