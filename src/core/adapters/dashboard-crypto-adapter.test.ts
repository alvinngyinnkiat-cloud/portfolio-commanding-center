import { describe, expect, it } from "vitest";
import { deriveDashboardCryptoOutputs } from "@/core/adapters/dashboard-crypto-adapter";
import { buildCryptoTrackerSummary } from "@/core/calculations/crypto/summary";
import type { CryptoHolding } from "@/core/domain/types";

describe("deriveDashboardCryptoOutputs", () => {
  it("maps summary to dashboard-ready fields", () => {
    const holdings: CryptoHolding[] = [
      { id: "1", assetName: "BTC", investedSgd: 500, feesSgd: 10, currentValueSgd: 620 },
    ];
    const summary = buildCryptoTrackerSummary(holdings, 1000);
    const outputs = deriveDashboardCryptoOutputs(summary);

    expect(outputs).toEqual({
      cryptoTotalValueSgd: summary.totalValueSgd,
      cryptoHoldingsValueSgd: summary.cryptoHoldingsValueSgd,
      cryptoContributionSgd: summary.cryptoContributionSgd,
      cryptoProfitLossSgd: summary.cryptoProfitLossSgd,
      availableTradingCashSgd: summary.availableTradingCashSgd,
      numberOfHoldings: 1,
    });
  });

  it("maps contribution from deposits minus withdrawals", () => {
    const holdings: CryptoHolding[] = [
      { id: "1", assetName: "BTC", investedSgd: 500, currentValueSgd: 620 },
    ];
    const summary = buildCryptoTrackerSummary(holdings, 5000);
    const outputs = deriveDashboardCryptoOutputs(summary);

    expect(outputs.cryptoContributionSgd).toBe(5000);
    expect(outputs.availableTradingCashSgd).toBe(4500);
    expect(outputs.cryptoTotalValueSgd).toBe(5120);
  });
});
