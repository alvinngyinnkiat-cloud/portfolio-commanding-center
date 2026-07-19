"use client";

import { useMemo } from "react";
import type { PortfolioInputs, PortfolioMetrics } from "@/core/domain/types";
import { calculatePortfolioPerformance } from "@/core/calculations/dashboard-portfolio-performance";
import { formatSgd } from "@/shared/lib/format";
import { coerceNumber } from "@/shared/lib/coerce-number";
import { SectionHeader } from "@/shared/components/ui/SectionHeader";
import {
  formatSignedPercent,
  plColorClass,
} from "@/modules/options/components/options-utils";
import type { PortfolioPerformanceLeg } from "@/core/calculations/dashboard-portfolio-performance";

function formatSignedSgd(value: number): string {
  const n = coerceNumber(value);
  const formatted = Math.abs(n).toLocaleString("en-SG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (n > 0) return `+S$${formatted}`;
  if (n < 0) return `-S$${formatted}`;
  return `S$${formatted}`;
}

function formatReturnDisplay(returnPercent: number | null): string {
  if (returnPercent == null) return "—";
  return formatSignedPercent(returnPercent, 2);
}

interface PerformanceCardProps {
  title: string;
  leg: PortfolioPerformanceLeg;
}

function PerformanceCard({ title, leg }: PerformanceCardProps) {
  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-surface-border/80 bg-surface-card/90 p-5 shadow-md shadow-black/15 sm:p-6">
      <h3 className="break-words text-xs font-medium uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <div className="mt-4 space-y-4">
        <div>
          <p className="text-xs text-slate-500">Portfolio Value</p>
          <p className="mt-1 break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {formatSgd(leg.portfolioValue)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Contribution</p>
          <p className="mt-1 break-words text-lg font-semibold text-white">
            {formatSgd(leg.contribution)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Profit / Loss</p>
          <p
            className={`mt-1 break-words text-base font-semibold ${plColorClass(leg.profitLoss)}`}
          >
            {formatSignedSgd(leg.profitLoss)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Return</p>
          <p
            className={`mt-1 break-words text-base font-semibold ${
              leg.returnPercent != null
                ? plColorClass(leg.returnPercent)
                : "text-white"
            }`}
          >
            {formatReturnDisplay(leg.returnPercent)}
          </p>
        </div>
      </div>
    </div>
  );
}

interface PortfolioPerformanceSectionProps {
  metrics: PortfolioMetrics;
  inputs: PortfolioInputs;
}

export function PortfolioPerformanceSection({
  metrics,
  inputs,
}: PortfolioPerformanceSectionProps) {
  const portfolioPerformance = useMemo(
    () => calculatePortfolioPerformance({ metrics, inputs }),
    [metrics, inputs]
  );

  if (!portfolioPerformance) {
    return null;
  }

  return (
    <section>
      <SectionHeader
        title="Portfolio Performance"
        description="Portfolio value compared with recorded contributions"
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <PerformanceCard title="Own Portfolio" leg={portfolioPerformance.own} />
        <PerformanceCard
          title="Total Portfolio"
          leg={portfolioPerformance.total}
        />
        <PerformanceCard
          title="Client Portfolio"
          leg={portfolioPerformance.client}
        />
      </div>
    </section>
  );
}
