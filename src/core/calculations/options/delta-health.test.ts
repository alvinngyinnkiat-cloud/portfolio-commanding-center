import { describe, expect, it } from "vitest";
import type { OptionsTrade } from "@/core/domain/types/options";
import {
  buildDeltaHealth,
  buildDeltaSideHealth,
  deriveDeltaTrend,
  deriveIronCondorDeltaOverall,
} from "./delta-health";

describe("deriveDeltaTrend", () => {
  it("treats lower delta as improving for short premium", () => {
    expect(deriveDeltaTrend(0.26, 0.25, "shortPremium")).toBe("improving");
    expect(deriveDeltaTrend(0.26, 0.26, "shortPremium")).toBe("stable");
    expect(deriveDeltaTrend(0.26, 0.3, "shortPremium")).toBe("worsening");
  });

  it("treats higher delta as improving for long call", () => {
    expect(deriveDeltaTrend(0.4, 0.55, "longCall")).toBe("improving");
    expect(deriveDeltaTrend(0.4, 0.4, "longCall")).toBe("stable");
    expect(deriveDeltaTrend(0.55, 0.4, "longCall")).toBe("worsening");
  });

  it("uses absolute delta for long put", () => {
    expect(deriveDeltaTrend(0.3, 0.45, "longPut")).toBe("improving");
    expect(deriveDeltaTrend(-0.3, -0.45, "longPut")).toBe("improving");
    expect(deriveDeltaTrend(0.45, 0.3, "longPut")).toBe("worsening");
  });
});

describe("buildDeltaSideHealth", () => {
  it("labels short premium improving side", () => {
    const side = buildDeltaSideHealth("", 0.26, 0.25, "shortPremium");
    expect(side?.trend).toBe("improving");
    expect(side?.statusLabel).toBe("Delta Improving");
    expect(side?.message).toBe("Risk Decreasing");
    expect(side?.color).toBe("green");
    expect(side?.deltaChange).toBeCloseTo(-0.01);
  });

  it("labels long call improving side", () => {
    const side = buildDeltaSideHealth("", 0.4, 0.55, "longCall");
    expect(side?.statusLabel).toBe("Delta Improving");
    expect(side?.message).toBe("Trade Strengthening");
    expect(side?.color).toBe("green");
  });
});

describe("buildDeltaHealth QA scenarios", () => {
  it("bull put: opening 0.26 current 0.25 is improving", () => {
    const health = buildDeltaHealth({
      strategy: "bullPut",
      openingShortPutDelta: 0.26,
      currentShortPutDelta: 0.25,
    } as OptionsTrade);

    expect(health?.putSide?.trend).toBe("improving");
    expect(health?.putSide?.statusLabel).toBe("Delta Improving");
    expect(health?.putSide?.message).toBe("Risk Decreasing");
    expect(health?.putSide?.color).toBe("green");
  });

  it("bear call: opening 0.30 current 0.25 is improving", () => {
    const health = buildDeltaHealth({
      strategy: "bearCall",
      openingShortCallDelta: 0.3,
      currentShortCallDelta: 0.25,
    } as OptionsTrade);

    expect(health?.callSide?.trend).toBe("improving");
    expect(health?.callSide?.message).toBe("Risk Decreasing");
    expect(health?.callSide?.color).toBe("green");
  });

  it("buy call: opening 0.40 current 0.55 is improving", () => {
    const health = buildDeltaHealth({
      strategy: "buyCall",
      openingShortCallDelta: 0.4,
      currentShortCallDelta: 0.55,
    } as OptionsTrade);

    expect(health?.callSide?.trend).toBe("improving");
    expect(health?.callSide?.message).toBe("Trade Strengthening");
    expect(health?.callSide?.color).toBe("green");
  });

  it("buy put: opening 0.30 current 0.45 is improving", () => {
    const health = buildDeltaHealth({
      strategy: "buyPut",
      openingShortPutDelta: 0.3,
      currentShortPutDelta: 0.45,
    } as OptionsTrade);

    expect(health?.putSide?.trend).toBe("improving");
    expect(health?.putSide?.message).toBe("Trade Strengthening");
    expect(health?.putSide?.color).toBe("green");
  });
});

describe("deriveIronCondorDeltaOverall", () => {
  it("maps leg combinations to overall status", () => {
    expect(
      deriveIronCondorDeltaOverall("improving", "improving")?.overallStatus
    ).toBe("healthy");
    expect(
      deriveIronCondorDeltaOverall("improving", "stable")?.overallStatus
    ).toBe("healthy");
    expect(
      deriveIronCondorDeltaOverall("improving", "worsening")?.overallStatus
    ).toBe("monitor");
    expect(
      deriveIronCondorDeltaOverall("stable", "worsening")?.overallStatus
    ).toBe("review");
    expect(
      deriveIronCondorDeltaOverall("worsening", "worsening")?.overallStatus
    ).toBe("threatened");
  });

  it("derives iron condor overall from both short legs", () => {
    const health = buildDeltaHealth({
      strategy: "ironCondor",
      openingPutSideDelta: 0.2,
      currentPutSideDelta: 0.15,
      openingCallSideDelta: 0.18,
      currentCallSideDelta: 0.22,
    } as OptionsTrade);

    expect(health?.putSide?.trend).toBe("improving");
    expect(health?.callSide?.trend).toBe("worsening");
    expect(health?.overallStatus).toBe("monitor");
    expect(health?.overallLabel).toBe("Monitor");
  });
});
