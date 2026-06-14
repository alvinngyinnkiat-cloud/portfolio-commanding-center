"use client";

import type { GoalProgress } from "@/core/domain/types";
import { formatSgd, formatDate } from "@/shared/lib/format";
import { coerceNumber } from "@/shared/lib/coerce-number";
import { Card } from "@/shared/components/ui/Card";
import { Target, CheckCircle2 } from "lucide-react";

interface GoalProgressCardsProps {
  goals: GoalProgress[];
}

export function GoalProgressCards({ goals }: GoalProgressCardsProps) {
  if (goals.length === 0) {
    return (
      <Card title="No active goals">
        <p className="text-sm text-slate-500">
          Add goals in Settings → Goals to track your targets here.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {(goals ?? []).map(({ goal, currentOwnPortfolio, remaining, progressPercent }) => {
        const safeProgress = coerceNumber(progressPercent);
        const clampedProgress = Math.min(safeProgress, 100);
        const isComplete = safeProgress >= 100;

        return (
          <Card key={goal.id} noPadding className="overflow-hidden">
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      isComplete ? "bg-accent-green/15 text-accent-green" : "bg-accent/15 text-accent"
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <Target size={20} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{goal.name}</h3>
                    {goal.targetDate && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        Target date: {formatDate(goal.targetDate)}
                      </p>
                    )}
                  </div>
                </div>
                {isComplete && (
                  <span className="rounded-full bg-accent-green/15 px-2.5 py-1 text-xs font-semibold text-accent-green">
                    Achieved
                  </span>
                )}
              </div>

              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-surface/60 px-4 py-3">
                  <dt className="text-xs font-medium text-slate-500">
                    Target Amount
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-white">
                    {formatSgd(goal.targetAmountSgd)}
                  </dd>
                </div>
                <div className="rounded-xl bg-surface/60 px-4 py-3">
                  <dt className="text-xs font-medium text-slate-500">
                    Current Value
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-white">
                    {formatSgd(currentOwnPortfolio)}
                  </dd>
                </div>
                <div className="rounded-xl bg-surface/60 px-4 py-3 sm:col-span-2">
                  <dt className="text-xs font-medium text-slate-500">
                    Remaining Amount
                  </dt>
                  <dd
                    className={`mt-1 text-sm font-semibold ${
                      remaining <= 0 ? "text-accent-green" : "text-accent-red"
                    }`}
                  >
                    {coerceNumber(remaining) <= 0 ? formatSgd(0) : formatSgd(remaining)}
                  </dd>
                </div>
              </dl>

              <div className="mt-5">
                <div className="mb-2 flex justify-between text-xs font-medium">
                  <span className="text-slate-500">Progress</span>
                  <span className="text-slate-300">
                    {safeProgress.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-surface">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isComplete ? "bg-accent-green" : "bg-accent"
                    }`}
                    style={{ width: `${clampedProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
