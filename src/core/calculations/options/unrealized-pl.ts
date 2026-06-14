export function calculateUnrealizedPlUsd(input: {
  openPremiumUsd: number;
  openFeesUsd: number;
  currentValueUsd: number;
}): number {
  return (
    input.openPremiumUsd - input.openFeesUsd - input.currentValueUsd
  );
}
