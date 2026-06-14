import { describe, expect, it } from "vitest";
import {
  buildStackedOptionPrice,
  calculateBearCallBreakevenDifference,
  calculateBullPutBreakevenDifference,
  calculateIronCondorBreakevenDifference,
  calculateOptionDollarValue,
  calculatePerShareOptionPrice,
  formatTargetExit,
  summarizeOpenTradesHeader,
  summarizeOpenTradesOwnership,
} from "./open-trade-display";
import type { OptionsOpenTradeRow } from "@/core/domain/types/options";

describe("option price stacking", () => {
  it("derives per-share price and dollar value", () => {
    expect(calculateOptionDollarValue(0.24, 1)).toBe(24);
    expect(calculatePerShareOptionPrice(24, 1)).toBe(0.24);
    expect(buildStackedOptionPrice(264, 2)).toEqual({
      pricePerShare: 1.32,
      dollarValueUsd: 264,
    });
  });

  it("premium option price converts to dollar value for calculations", () => {
    expect(calculateOptionDollarValue(1, 1)).toBe(100);
    expect(calculateOptionDollarValue(1, 2)).toBe(200);
    expect(calculatePerShareOptionPrice(100, 1)).toBe(1);
    expect(calculatePerShareOptionPrice(200, 2)).toBe(1);
  });
});

describe("breakeven difference", () => {
  it("bull put: current - breakeven", () => {
    const diff = calculateBullPutBreakevenDifference(110, 97.9125);
    expect(diff.differenceUsd).toBeCloseTo(12.0875, 4);
    expect(diff.differencePercent).toBeCloseTo(12.345, 2);
  });

  it("bear call: breakeven - current", () => {
    const diff = calculateBearCallBreakevenDifference(110, 112.485);
    expect(diff.differenceUsd).toBeCloseTo(2.485, 3);
    expect(diff.differencePercent).toBeCloseTo(2.209, 2);
  });

  it("iron condor: shows smaller buffer with active side label", () => {
    const inside = calculateIronCondorBreakevenDifference(150, 104.05, 195.95);
    expect(inside.lowerBufferUsd).toBeCloseTo(45.95, 2);
    expect(inside.upperBufferUsd).toBeCloseTo(45.95, 2);
    expect(inside.differenceUsd).toBeCloseTo(45.95, 2);
    expect(inside.isAtRisk).toBe(false);

    const below = calculateIronCondorBreakevenDifference(100, 104.05, 195.95);
    expect(below.lowerBufferUsd).toBeCloseTo(-4.05, 2);
    expect(below.upperBufferUsd).toBeCloseTo(95.95, 2);
    expect(below.differenceUsd).toBeCloseTo(-4.05, 2);
    expect(below.activeSide).toBe("lower");
    expect(below.isAtRisk).toBe(true);

    const upperTighter = calculateIronCondorBreakevenDifference(
      194,
      104.05,
      195.95
    );
    expect(upperTighter.activeSide).toBe("upper");
    expect(upperTighter.differenceUsd).toBeCloseTo(1.95, 2);
  });
});

describe("formatTargetExit", () => {
  it("shows days until DTE - 7 target", () => {
    expect(formatTargetExit(46)).toEqual({
      kind: "days",
      label: "39 days",
      daysUntilTarget: 39,
    });
    expect(formatTargetExit(10)).toEqual({
      kind: "days",
      label: "3 days",
      daysUntilTarget: 3,
    });
  });

  it("shows Exit Now at 7 DTE and Overdue below", () => {
    expect(formatTargetExit(7)).toEqual({ kind: "exit_now", label: "Exit Now" });
    expect(formatTargetExit(5)).toEqual({ kind: "overdue", label: "Overdue" });
  });
});

describe("summarizeOpenTradesHeader", () => {
  it("aggregates open trade monitoring stats", () => {
    const rows = [
      {
        trade: { maxRiskUsd: 400 },
        unrealizedPlUsd: 50,
        daysToExpiration: 5,
      },
      {
        trade: { maxRiskUsd: 200 },
        unrealizedPlUsd: -10,
        daysToExpiration: 12,
      },
      {
        trade: { maxRiskUsd: 100 },
        unrealizedPlUsd: null,
        daysToExpiration: 30,
      },
    ] as OptionsOpenTradeRow[];

    const summary = summarizeOpenTradesHeader(rows);
    expect(summary.openTradeCount).toBe(3);
    expect(summary.totalOpenRiskUsd).toBe(700);
    expect(summary.totalUnrealizedPlUsd).toBe(40);
    expect(summary.tradesAtOrBelow7Dte).toBe(1);
    expect(summary.tradesAtOrBelow21Dte).toBe(2);
    expect(summary.nearestExpiryDte).toBe(5);
  });

  it("summarizes ownership unrealized legs for shared open trades", () => {
    const rows = [
      {
        trade: { maxRiskUsd: 300, tradeType: "shared" },
        unrealizedPlUsd: 200,
        userUnrealizedPlUsd: 120,
        clientUnrealizedPlUsd: 80,
        daysToExpiration: 10,
      },
      {
        trade: { maxRiskUsd: 100, tradeType: "shared" },
        unrealizedPlUsd: null,
        userUnrealizedPlUsd: null,
        clientUnrealizedPlUsd: null,
        daysToExpiration: 20,
      },
    ] as OptionsOpenTradeRow[];

    const summary = summarizeOpenTradesOwnership(rows);
    expect(summary.totalUnrealizedPlUsd).toBe(200);
    expect(summary.userUnrealizedPlUsd).toBe(120);
    expect(summary.clientUnrealizedPlUsd).toBe(80);
  });
});
