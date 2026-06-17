import { formatUsd } from "@/shared/lib/format";

export interface UsCashComparisonFields {
  usesBrokerUsdCashOverride: boolean;
  systemCalculatedUsCashUsd: number;
  historicalReconciliationDifferenceUsd: number | null;
}

export function formatUsCashComparisonSubValue(
  fields: UsCashComparisonFields
): string | undefined {
  if (!fields.usesBrokerUsdCashOverride) {
    return undefined;
  }

  const lines = [
    `System cash: ${formatUsd(fields.systemCalculatedUsCashUsd)}`,
  ];

  if (fields.historicalReconciliationDifferenceUsd != null) {
    lines.push(
      `Difference: ${formatUsd(fields.historicalReconciliationDifferenceUsd)}`
    );
  }

  return lines.join("\n");
}
