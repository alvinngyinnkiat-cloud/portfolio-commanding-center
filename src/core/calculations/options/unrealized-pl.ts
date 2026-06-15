import type { OptionsStrategy } from "@/core/domain/types/options";
import { isDebitStrategy } from "./strategy-kind";

export function calculateUnrealizedPlUsd(input: {
  strategy?: OptionsStrategy;
  openPremiumUsd: number;
  openFeesUsd: number;
  currentValueUsd: number;
}): number {
  if (input.strategy != null && isDebitStrategy(input.strategy)) {
    return (
      input.currentValueUsd - input.openPremiumUsd - input.openFeesUsd
    );
  }

  return input.openPremiumUsd - input.openFeesUsd - input.currentValueUsd;
}
