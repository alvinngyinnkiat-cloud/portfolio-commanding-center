import type {
  IncomeDecisionStatus,
  SellCallTimingRule,
} from "@/core/domain/types/income";

export interface SellCallWindowInput {
  foundationChecklistPass: boolean;
  isCovered: boolean;
  currentPriceUsd: number | null;
  foundationBreakevenUsd: number | null;
  atr14: number | null;
  atrMultiplier: number;
  avgPriceUsd: number | null;
  avgPricePrevUsd: number | null;
}

export function calculateFoundationTriggerPrice(
  foundationBreakevenUsd: number | null,
  atr14: number | null,
  atrMultiplier: number
): number | null {
  if (
    foundationBreakevenUsd == null ||
    atr14 == null ||
    !Number.isFinite(foundationBreakevenUsd) ||
    !Number.isFinite(atr14)
  ) {
    return null;
  }
  return foundationBreakevenUsd + atr14 * atrMultiplier;
}

export function evaluateSellCallTimingRules(
  input: SellCallWindowInput
): SellCallTimingRule[] {
  const triggerPrice = calculateFoundationTriggerPrice(
    input.foundationBreakevenUsd,
    input.atr14,
    input.atrMultiplier
  );

  const rule1Pass =
    input.currentPriceUsd != null &&
    triggerPrice != null &&
    input.currentPriceUsd >= triggerPrice;

  const rule2Pass =
    input.avgPricePrevUsd != null &&
    input.avgPriceUsd != null &&
    input.avgPricePrevUsd > input.avgPriceUsd;

  return [
    {
      id: "foundation_trigger",
      label: "Rule 1 — Foundation Trigger",
      pass: rule1Pass,
      detail:
        triggerPrice != null && input.currentPriceUsd != null
          ? `Current Price ${formatPrice(input.currentPriceUsd)} ≥ Trigger ${formatPrice(triggerPrice)}`
          : "Missing price, breakeven, or ATR14",
    },
    {
      id: "momentum_confirmation",
      label: "Rule 2 — Momentum Confirmation",
      pass: rule2Pass,
      detail:
        input.avgPricePrevUsd != null && input.avgPriceUsd != null
          ? `Previous Avg ${formatPrice(input.avgPricePrevUsd)} > Current Avg ${formatPrice(input.avgPriceUsd)}`
          : "Missing average price history",
    },
  ];
}

export function deriveIncomeDecisionStatus(
  input: SellCallWindowInput
): IncomeDecisionStatus {
  if (input.isCovered) {
    return "covered";
  }

  if (!input.foundationChecklistPass) {
    return "checklist_incomplete";
  }

  const rules = evaluateSellCallTimingRules(input);
  const rule1Pass = rules[0]?.pass ?? false;
  const rule2Pass = rules[1]?.pass ?? false;

  if (!rule1Pass) {
    return "waiting_for_trigger";
  }

  if (!rule2Pass) {
    return "waiting_for_confirmation";
  }

  return "sell_call_window_open";
}

export function incomeDecisionLabel(status: IncomeDecisionStatus): string {
  switch (status) {
    case "waiting_for_trigger":
      return "🟡 WAITING FOR TRIGGER";
    case "waiting_for_confirmation":
      return "🟠 WAITING FOR CONFIRMATION";
    case "sell_call_window_open":
      return "🟢 SELL CALL WINDOW OPEN";
    case "covered":
      return "🔵 Covered";
    default:
      return "Foundation checklist incomplete";
  }
}

export function deriveTriggerStatusLabel(
  currentPriceUsd: number | null,
  triggerPriceUsd: number | null
): string {
  if (currentPriceUsd == null || triggerPriceUsd == null) {
    return "Unavailable";
  }
  if (currentPriceUsd >= triggerPriceUsd) {
    return "Trigger reached";
  }
  return "Below trigger";
}

export function deriveDistanceToTriggerUsd(
  currentPriceUsd: number | null,
  triggerPriceUsd: number | null
): number | null {
  if (currentPriceUsd == null || triggerPriceUsd == null) {
    return null;
  }
  return currentPriceUsd - triggerPriceUsd;
}

function formatPrice(value: number): string {
  return `$${value.toFixed(2)}`;
}
