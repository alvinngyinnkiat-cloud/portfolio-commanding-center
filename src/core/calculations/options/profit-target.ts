/** Net credit at open — opening fees only; close fees entered on close. */
export function calculateNetCreditUsd(
  openPremiumUsd: number,
  openFeesUsd: number
): number {
  return openPremiumUsd - openFeesUsd;
}

/**
 * 75% profit take exit price (cost to close target).
 * Keeps 75% of net credit; exit when close debit ≈ 25% of net credit.
 * Close fees are excluded — entered separately when closing.
 */
export function calculate75PercentTpExitPriceUsd(netCreditUsd: number): number {
  return netCreditUsd * 0.25;
}
