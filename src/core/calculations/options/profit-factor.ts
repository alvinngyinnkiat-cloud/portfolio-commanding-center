export type ProfitFactorKind = "none" | "infinity" | "zero" | "value";

export interface ProfitFactorMetrics {
  grossProfitUsd: number;
  grossLossUsd: number;
  label: string;
  value: number | null;
  kind: ProfitFactorKind;
}

export function calculateProfitFactorMetrics(
  grossProfitUsd: number,
  grossLossUsd: number,
  closedCount: number
): ProfitFactorMetrics {
  if (closedCount === 0) {
    return {
      grossProfitUsd: 0,
      grossLossUsd: 0,
      label: "—",
      value: null,
      kind: "none",
    };
  }

  if (grossProfitUsd <= 0) {
    return {
      grossProfitUsd,
      grossLossUsd,
      label: "0.00",
      value: 0,
      kind: "zero",
    };
  }

  if (grossLossUsd === 0) {
    return {
      grossProfitUsd,
      grossLossUsd: 0,
      label: "∞",
      value: null,
      kind: "infinity",
    };
  }

  const value = grossProfitUsd / grossLossUsd;
  return {
    grossProfitUsd,
    grossLossUsd,
    label: value.toFixed(2),
    value,
    kind: "value",
  };
}

export function profitFactorColorClass(
  kind: ProfitFactorKind,
  value: number | null
): string {
  if (kind === "none") return "text-slate-300";
  if (kind === "infinity") return "text-emerald-300";
  if (kind === "zero") return "text-accent-red";

  if (value == null) return "text-slate-300";
  if (value < 1) return "text-accent-red";
  if (value < 1.5) return "text-amber-300";
  if (value < 2) return "text-emerald-400";
  return "text-emerald-300";
}
