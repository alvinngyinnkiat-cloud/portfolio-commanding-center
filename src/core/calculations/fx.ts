export function usdToSgd(usd: number, fxRate: number): number {
  return usd * fxRate;
}

export function sgdToUsd(sgd: number, fxRate: number): number {
  if (fxRate <= 0) return 0;
  return sgd / fxRate;
}

export function calculateTotalCashSgd(
  usdTradingCashUsd: number,
  sgdTradingCashSgd: number,
  cryptoCashSgd: number,
  fxRate: number
): number {
  return usdTradingCashUsd * fxRate + sgdTradingCashSgd + cryptoCashSgd;
}
