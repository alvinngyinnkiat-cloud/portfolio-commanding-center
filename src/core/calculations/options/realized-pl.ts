import type { OptionsCloseMethod } from "@/core/domain/types/options";

export function calculateRealizedPlUsd(input: {
  openPremiumUsd: number;
  openFeesUsd: number;
  closePremiumUsd: number;
  closeFeesUsd: number;
}): number {
  return (
    input.openPremiumUsd -
    input.openFeesUsd -
    input.closePremiumUsd -
    input.closeFeesUsd
  );
}

export function calculateCloseCostUsd(input: {
  closePremiumUsd: number;
  closeFeesUsd: number;
}): number {
  return input.closePremiumUsd + input.closeFeesUsd;
}

export function getTradeCloseMethod(
  closeMethod?: OptionsCloseMethod
): OptionsCloseMethod {
  return closeMethod ?? "normal";
}

export function resolveClosedTradeRealizedPlUsd(input: {
  closeMethod?: OptionsCloseMethod;
  openPremiumUsd: number;
  openFeesUsd: number;
  closePremiumUsd?: number;
  closeFeesUsd?: number;
  manualRealizedPlUsd?: number;
}): number {
  if (getTradeCloseMethod(input.closeMethod) === "manual_pl") {
    return input.manualRealizedPlUsd ?? 0;
  }

  return calculateRealizedPlUsd({
    openPremiumUsd: input.openPremiumUsd,
    openFeesUsd: input.openFeesUsd,
    closePremiumUsd: input.closePremiumUsd ?? 0,
    closeFeesUsd: input.closeFeesUsd ?? 0,
  });
}

export function formatCloseMethodLabel(closeMethod?: OptionsCloseMethod): string {
  return getTradeCloseMethod(closeMethod) === "manual_pl"
    ? "Manual P/L"
    : "Normal Close";
}
