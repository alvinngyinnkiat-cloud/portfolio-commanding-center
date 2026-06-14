/**
 * Client funds held in brokerage cash must not count toward My Portfolio.
 * Total Cash = Personal Cash + Client Cash.
 */
export function splitPersonalAndClientCash(
  totalCashSgd: number,
  clientPortfolioSgd: number
): { personalCashSgd: number; clientCashSgd: number } {
  const personalCashSgd = Math.max(
    0,
    totalCashSgd - Math.min(clientPortfolioSgd, totalCashSgd)
  );
  const clientCashSgd = totalCashSgd - personalCashSgd;
  return { personalCashSgd, clientCashSgd };
}

export function calculateClientOwnershipPercent(
  clientPortfolioSgd: number,
  totalPortfolioSgd: number
): number {
  return totalPortfolioSgd > 0
    ? (clientPortfolioSgd / totalPortfolioSgd) * 100
    : 0;
}
