"use client";

import { formatUsd } from "@/shared/lib/format";
import { AlertTriangle } from "lucide-react";

interface OverdeploymentAlertProps {
  overdeploymentUsd: number;
}

export function OverdeploymentAlert({
  overdeploymentUsd,
}: OverdeploymentAlertProps) {
  if (overdeploymentUsd <= 0) return null;

  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3"
      role="alert"
    >
      <AlertTriangle
        className="mt-0.5 shrink-0 text-amber-400"
        size={18}
        aria-hidden
      />
      <div className="text-sm">
        <p className="font-medium text-amber-200">
          USD holdings exceed USD Trading Cash by {formatUsd(overdeploymentUsd)}.
        </p>
        <p className="mt-1 text-amber-200/70">
          Overdeployed by {formatUsd(overdeploymentUsd)}. Reference only — does
          not block transactions.
        </p>
      </div>
    </div>
  );
}
