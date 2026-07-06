import type { OptionsStrategy } from "@/core/domain/types/options";

export function isFoundationStrategy(strategy: OptionsStrategy): boolean {
  return strategy === "bullPut";
}

export function isSellCallIncomeStrategy(strategy: OptionsStrategy): boolean {
  return strategy === "bearCall" || strategy === "sellCall";
}
