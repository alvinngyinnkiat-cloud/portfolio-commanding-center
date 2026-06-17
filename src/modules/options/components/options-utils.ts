import type {
  OptionsCapacityStatus,
  OptionsCloseMethod,
  OptionsDteStatus,
} from "@/core/domain/types/options";
import { formatCloseMethodLabel, getTradeCloseMethod } from "@/core/calculations/options/realized-pl";
import type { BreakevenDifference } from "@/core/calculations/options/open-trade-display";
import type { TargetExitKind } from "@/core/calculations/options/open-trade-display";
import { coerceNumber } from "@/shared/lib/coerce-number";

export function plColorClass(value: number | null | undefined, missing = false): string {
  if (missing) return "text-slate-300";
  const n = coerceNumber(value);
  if (n > 0) return "text-emerald-400";
  if (n < 0) return "text-accent-red";
  return "text-slate-300";
}

export function plTrend(
  value: number | null | undefined
): "positive" | "negative" | "neutral" {
  const n = coerceNumber(value);
  if (n > 0) return "positive";
  if (n < 0) return "negative";
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

export function dteWarningColorClass(daysToExpiration: number): string {
  if (daysToExpiration <= 7) return "text-accent-red";
  if (daysToExpiration <= 14) return "text-amber-300";
  return "text-slate-400";
}

export function dteStatusBadgeClass(status: OptionsDteStatus): string {
  if (status === "ACTION_REQUIRED") return "bg-accent-red/15 text-accent-red";
  if (status === "WATCH") return "bg-amber-500/15 text-amber-300";
  return "bg-emerald-500/15 text-emerald-400";
}

export function formatSignedPercent(
  value: number | null | undefined,
  decimals = 1
): string {
  const n = coerceNumber(value);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(decimals)}%`;
}

export function formatSignedUsdCompact(value: number | null | undefined): string {
  const n = coerceNumber(value);
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
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
  { value: "sellPut", label: "SELL PUT" },
  { value: "sellCall", label: "SELL CALL" },
  { value: "bullPut", label: "BULL PUT" },
  { value: "bearCall", label: "BEAR CALL" },
  { value: "ironCondor", label: "IRON CONDOR" },
  { value: "buyCall", label: "BUY CALL" },
  { value: "buyPut", label: "BUY PUT" },
  { value: "custom", label: "CUSTOM" },
] as const;

export const CLOSE_METHOD_OPTIONS = [
  { value: "normal", label: "Normal Close" },
  { value: "manual_pl", label: "Manual Realized P/L" },
] as const;

export function closeMethodBadgeClass(closeMethod?: OptionsCloseMethod): string {
  return getTradeCloseMethod(closeMethod) === "manual_pl"
    ? "bg-amber-500/15 text-amber-300"
    : "bg-surface text-slate-400";
}

export function closeMethodLabel(closeMethod?: OptionsCloseMethod): string {
  return formatCloseMethodLabel(closeMethod);
}
