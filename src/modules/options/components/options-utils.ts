import type { OptionsCapacityStatus, OptionsDteStatus } from "@/core/domain/types/options";
import type { BreakevenDifference } from "@/core/calculations/options/open-trade-display";
import type { TargetExitKind } from "@/core/calculations/options/open-trade-display";

export function plColorClass(value: number, missing = false): string {
  if (missing) return "text-slate-300";
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-accent-red";
  return "text-slate-300";
}

export function plTrend(value: number): "positive" | "negative" | "neutral" {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

export function capacityBadgeClass(status: OptionsCapacityStatus): string {
  if (status === "OK") return "bg-emerald-500/15 text-emerald-400";
  if (status === "AT_LIMIT") return "bg-amber-500/15 text-amber-300";
  return "bg-accent-red/15 text-accent-red";
}

export function capacityLabel(status: OptionsCapacityStatus): string {
  if (status === "OK") return "OK";
  if (status === "AT_LIMIT") return "AT LIMIT";
  return "NO TRADE";
}

export function dteStatusLabel(status: OptionsDteStatus): string {
  if (status === "ACTION_REQUIRED") return "Close Soon";
  if (status === "WATCH") return "Monitor";
  return "Normal";
}

export function dteStatusBadgeClass(status: OptionsDteStatus): string {
  if (status === "ACTION_REQUIRED") return "bg-accent-red/15 text-accent-red";
  if (status === "WATCH") return "bg-amber-500/15 text-amber-300";
  return "bg-emerald-500/15 text-emerald-400";
}

export function formatSignedPercent(value: number, decimals = 1): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatSignedUsdCompact(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export function breakevenDiffColorClass(diff: BreakevenDifference): string {
  if (diff.isAtRisk) return "text-accent-red";
  if (diff.differenceUsd > 0) return "text-emerald-400";
  return "text-slate-300";
}

export function targetExitClass(kind: TargetExitKind): string {
  if (kind === "overdue") return "font-medium text-accent-red";
  if (kind === "exit_now") return "font-medium text-amber-300";
  return "text-slate-300";
}

export { profitFactorColorClass } from "@/core/calculations/options/profit-factor";

export const STRATEGY_OPTIONS = [
  { value: "bullPut", label: "Bull Put" },
  { value: "bearCall", label: "Bear Call" },
  { value: "ironCondor", label: "Iron Condor" },
  { value: "custom", label: "Custom" },
] as const;
