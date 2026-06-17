import type { PortfolioInputs } from "@/core/domain/types";

/** Zero module contribution and capital-model legs for tests and fixtures. */
export function emptyModuleContributionInputs(): Pick<
  PortfolioInputs,
  | "totalStockContributionSgd"
  | "usStockContributionSgd"
  | "sgStockContributionSgd"
  | "totalStockValueSgd"
  | "stockHoldingsValueSgd"
  | "stockProfitLossSgd"
  | "stockAvailableTradingCashSgd"
  | "usMarketValueSgd"
  | "sgMarketValueSgd"
  | "usAvailableTradingCashUsd"
  | "sgAvailableTradingCashSgd"
  | "cryptoContributionSgd"
  | "totalCryptoValueSgd"
  | "cryptoHoldingsValueSgd"
  | "cryptoProfitLossSgd"
  | "cryptoAvailableTradingCashSgd"
  | "personalCashContributionSgd"
  | "optionsValueSgd"
  | "clientStartingCapitalUsd"
  | "clientStartingCapitalSgd"
  | "clientRealizedPlUsd"
  | "clientUnrealizedPlSgd"
> {
  return {
    totalStockContributionSgd: 0,
    usStockContributionSgd: 0,
    sgStockContributionSgd: 0,
    totalStockValueSgd: 0,
    stockHoldingsValueSgd: 0,
    stockProfitLossSgd: 0,
    stockAvailableTradingCashSgd: 0,
    usMarketValueSgd: 0,
    sgMarketValueSgd: 0,
    usAvailableTradingCashUsd: 0,
    sgAvailableTradingCashSgd: 0,
    cryptoContributionSgd: 0,
    totalCryptoValueSgd: 0,
    cryptoHoldingsValueSgd: 0,
    cryptoProfitLossSgd: 0,
    cryptoAvailableTradingCashSgd: 0,
    personalCashContributionSgd: 0,
    optionsValueSgd: 0,
    netOptionsMarketValueSgd: null,
    clientStartingCapitalUsd: 0,
    clientStartingCapitalSgd: 0,
    clientRealizedPlUsd: 0,
    clientUnrealizedPlSgd: 0,
  };
}
