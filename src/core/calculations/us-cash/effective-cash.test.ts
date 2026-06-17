import { describe, expect, it } from "vitest";
import { buildUsEffectiveCashFields } from "./effective-cash";

describe("buildUsEffectiveCashFields", () => {
  it("uses system calculated cash when override is blank", () => {
    const result = buildUsEffectiveCashFields(3337.63, null);
    expect(result.usAvailableTradingCashUsd).toBe(3337.63);
    expect(result.usesBrokerUsdCashOverride).toBe(false);
    expect(result.historicalReconciliationDifferenceUsd).toBeNull();
  });

  it("uses broker override when set", () => {
    const result = buildUsEffectiveCashFields(3337.63, 1341.21);
    expect(result.usAvailableTradingCashUsd).toBe(1341.21);
    expect(result.systemCalculatedUsCashUsd).toBe(3337.63);
    expect(result.historicalReconciliationDifferenceUsd).toBeCloseTo(
      1996.42,
      2
    );
    expect(result.usesBrokerUsdCashOverride).toBe(true);
  });
});
