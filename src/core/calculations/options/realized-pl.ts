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
