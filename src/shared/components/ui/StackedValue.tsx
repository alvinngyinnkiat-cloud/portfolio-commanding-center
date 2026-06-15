import type { ReactNode } from "react";

interface StackedValueProps {
  primary: ReactNode;
  secondary?: ReactNode;
  align?: "left" | "right";
  primaryClassName?: string;
  secondaryClassName?: string;
}

export function StackedValue({
  primary,
  secondary,
  align = "left",
  primaryClassName = "font-medium text-slate-200",
  secondaryClassName = "text-[11px] text-slate-500",
}: StackedValueProps) {
  return (
    <div className={`leading-tight ${align === "right" ? "text-right" : "text-left"}`}>
      <div className={primaryClassName}>{primary}</div>
      {secondary != null && secondary !== "" && (
        <div className={`mt-0.5 ${secondaryClassName}`}>{secondary}</div>
      )}
    </div>
  );
}
