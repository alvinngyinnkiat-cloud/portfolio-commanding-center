export function usdToSgd(usd: number, fxRate: number): number {
  return usd * fxRate;
}

export function calculateTotalCashSgd(
  stockCashUsd: number,
  cryptoCashSgd: number,
  fxRate: number
): number {
  return stockCashUsd * fxRate + cryptoCashSgd;
}
