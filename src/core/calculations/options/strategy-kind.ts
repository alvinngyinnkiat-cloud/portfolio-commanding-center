import type { OptionsStrategy } from "@/core/domain/types/options";

export type CreditStrategy =
  | "sellPut"
  | "sellCall"
  | "bullPut"
  | "bearCall"
  | "ironCondor";

export type DebitStrategy = "buyCall" | "buyPut";

export type NakedCreditStrategy = "sellPut" | "sellCall";
export type DebitOptionStrategy = DebitStrategy;

const CREDIT_STRATEGIES = new Set<OptionsStrategy>([
  "sellPut",
  "sellCall",
  "bullPut",
  "bearCall",
  "ironCondor",
]);

const DEBIT_STRATEGIES = new Set<OptionsStrategy>(["buyCall", "buyPut"]);

export function isCreditStrategy(strategy: OptionsStrategy): strategy is CreditStrategy {
  return CREDIT_STRATEGIES.has(strategy);
}

export function isDebitStrategy(strategy: OptionsStrategy): strategy is DebitStrategy {
  return DEBIT_STRATEGIES.has(strategy);
}

export function isNakedCreditStrategy(
  strategy: OptionsStrategy
): strategy is NakedCreditStrategy {
  return strategy === "sellPut" || strategy === "sellCall";
}

export function requiresManualMaxRisk(strategy: OptionsStrategy): boolean {
  return strategy === "custom" || strategy === "sellCall";
}

export function getOpenPremiumFieldLabel(strategy: OptionsStrategy): string {
  return isDebitStrategy(strategy)
    ? "Premium Paid (Option Price)"
    : "Premium Received (Option Price)";
}

export function getClosePremiumFieldLabel(strategy: OptionsStrategy): string {
  return isDebitStrategy(strategy)
    ? "Close Premium (Option Price)"
    : "Close Debit (Option Price)";
}
