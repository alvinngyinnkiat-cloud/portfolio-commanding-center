export interface UsEffectiveCashFields {
  /** Shared cash engine output — reporting reference only. */
  systemCalculatedUsCashUsd: number;
  brokerUsdCashOverrideUsd: number | null;
  /** Broker override when set; otherwise system calculated. */
  usAvailableTradingCashUsd: number;
  /** System − effective when override is active. */
  historicalReconciliationDifferenceUsd: number | null;
  usesBrokerUsdCashOverride: boolean;
}

export function normalizeBrokerUsdCashOverride(
  value: unknown
): number | null {
  if (value == null || value === "") {
    return null;
  }
  const parsed =
    typeof value === "number" ? value : parseFloat(String(value).trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildUsEffectiveCashFields(
  systemCalculatedUsd: number,
  brokerUsdCashOverride: number | null | undefined
): UsEffectiveCashFields {
  const brokerUsdCashOverrideUsd = normalizeBrokerUsdCashOverride(
    brokerUsdCashOverride
  );
  const usesBrokerUsdCashOverride = brokerUsdCashOverrideUsd != null;
  const usAvailableTradingCashUsd = usesBrokerUsdCashOverride
    ? brokerUsdCashOverrideUsd
    : systemCalculatedUsd;

  return {
    systemCalculatedUsCashUsd: systemCalculatedUsd,
    brokerUsdCashOverrideUsd,
    usAvailableTradingCashUsd,
    historicalReconciliationDifferenceUsd: usesBrokerUsdCashOverride
      ? systemCalculatedUsd - brokerUsdCashOverrideUsd
      : null,
    usesBrokerUsdCashOverride,
  };
}
