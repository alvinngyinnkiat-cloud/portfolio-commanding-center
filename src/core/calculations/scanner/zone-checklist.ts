import type { RuleCheck } from "@/core/domain/types/scanner";
import {
  isInMidZone,
  isInSellCallZone,
  isInSellPutZone,
} from "./ema-strategy";

function fmt(value: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  return value.toFixed(digits);
}

export function formatZoneRangeArrow(
  range: { low: number; high: number } | null
): string {
  if (!range) {
    return "—";
  }
  return `${range.low.toFixed(2)} → ${range.high.toFixed(2)}`;
}

export function buildZoneMembershipDetail(
  avgPrice: number | null,
  inside: boolean,
  range: { low: number; high: number } | null
): string {
  const symbol = inside ? "∈" : "∉";
  return `${fmt(avgPrice)} ${symbol} ${formatZoneRangeArrow(range)}`;
}

export function buildSellPutZoneCheck(input: {
  avgPrice: number | null;
  primarySupport: number | null;
  atr14: number | null;
  sellPutRange: { low: number; high: number } | null;
}): RuleCheck {
  const inside = isInSellPutZone(
    input.avgPrice,
    input.primarySupport,
    input.atr14
  );

  return {
    label: inside
      ? "Average Price inside Sell Put Zone"
      : "Average Price outside Sell Put Zone",
    passed: inside,
    detail: buildZoneMembershipDetail(input.avgPrice, inside, input.sellPutRange),
  };
}

export function buildSellCallZoneCheck(input: {
  avgPrice: number | null;
  primaryResistance: number | null;
  atr14: number | null;
  sellCallRange: { low: number; high: number } | null;
}): RuleCheck {
  const inside = isInSellCallZone(
    input.avgPrice,
    input.primaryResistance,
    input.atr14
  );

  return {
    label: inside
      ? "Average Price inside Sell Call Zone"
      : "Average Price outside Sell Call Zone",
    passed: inside,
    detail: buildZoneMembershipDetail(input.avgPrice, inside, input.sellCallRange),
  };
}

export function buildMidZoneCheck(input: {
  avgPrice: number | null;
  midPrice: number | null;
  atr14: number | null;
  icMidZone: { low: number; high: number } | null;
}): RuleCheck {
  const inside = isInMidZone(input.avgPrice, input.midPrice, input.atr14);

  return {
    label: inside
      ? "Average Price inside Adjusted Mid Zone"
      : "Average Price outside Adjusted Mid Zone",
    passed: inside,
    detail: buildZoneMembershipDetail(input.avgPrice, inside, input.icMidZone),
  };
}

export function failedCheckLabels(checklist: RuleCheck[]): string[] {
  return checklist.filter((item) => !item.passed).map((item) => item.label);
}
