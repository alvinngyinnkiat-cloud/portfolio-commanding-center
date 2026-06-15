import type { OptionsCloseMethod, OptionsStrategy } from "@/core/domain/types/options";
import { calculateRealizedPlUsd } from "./realized-pl";

export function calculatePartialCloseRealizedPlUsd(input: {
  strategy: OptionsStrategy;
  closeMethod: OptionsCloseMethod;
  openPremiumUsd: number;
  openFeesUsd: number;
  closePremiumUsd?: number;
  closeFeesUsd?: number;
  manualRealizedPlUsd?: number;
}): number {
  if (input.closeMethod === "manual_pl") {
    return input.manualRealizedPlUsd ?? 0;
  }

  return calculateRealizedPlUsd({
    strategy: input.strategy,
    openPremiumUsd: input.openPremiumUsd,
    openFeesUsd: input.openFeesUsd,
    closePremiumUsd: input.closePremiumUsd ?? 0,
    closeFeesUsd: input.closeFeesUsd ?? 0,
  });
}

export function resolvePartialCloseRealizedPlUsd(input: {
  strategy: OptionsStrategy;
  closeMethod?: OptionsCloseMethod;
  originalOpenPremiumUsd: number;
  originalOpenFeesUsd: number;
  originalContracts: number;
  contractsClosed: number;
  closePremiumUsd?: number;
  closeFeesUsd?: number;
  manualRealizedPlUsd?: number;
}): number {
  const share =
    input.originalContracts > 0
      ? input.contractsClosed / input.originalContracts
      : 0;
  const allocated = {
    openPremiumUsd: input.originalOpenPremiumUsd * share,
    openFeesUsd: input.originalOpenFeesUsd * share,
  };

  const closeMethod = input.closeMethod ?? "normal";
  if (closeMethod === "manual_pl") {
    return input.manualRealizedPlUsd ?? 0;
  }

  return calculatePartialCloseRealizedPlUsd({
    strategy: input.strategy,
    closeMethod: "normal",
    openPremiumUsd: allocated.openPremiumUsd,
    openFeesUsd: allocated.openFeesUsd,
    closePremiumUsd: input.closePremiumUsd,
    closeFeesUsd: input.closeFeesUsd,
  });
}
