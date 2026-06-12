"use client";

import type { GoalProgress } from "@/core/domain/types";
import { formatSgd, formatDate } from "@/shared/lib/format";
import { Card } from "@/shared/components/ui/Card";
import { Target } from "lucide-react";

interface GoalProgressCardsProps {
  goals: GoalProgress[];
}

export function GoalProgressCards({ goals }: GoalProgressCardsProps) {
  if (goals.length === 0) {
    return (
      <Card title="Goal Progress">
        <p className="text-sm text-slate-500">
          No active goals. Add goals in Dashboard Settings.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-slate-400">Goal Progress</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {goals.map(({ goal, currentOwnPortfolio, remaining, progressPercent }) => {
          const clampedProgress = Math.min(progressPercent, 100);
          const isComplete = progressPercent >= 100;

          return (
            <div
              key={goal.id}
              className="rounded-xl border border-surface-border bg-surface-card p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Target size={16} className="text-accent" />
                    <h3 className="font-semibold text-white">{goal.name}</h3>
                  </div>
                  {goal.targetDate && (
                    <p className="mt-1 text-xs text-slate-500">
                      Target: {formatDate(goal.targetDate)}
                    </p>
                  )}
                </div>
                {isComplete && (
                  <span className="rounded-full bg-accent-green/20 px-2 py-0.5 text-xs font-medium text-accent-green">
                    Achieved
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Target</span>
                  <span className="font-medium text-white">
                    {formatSgd(goal.targetAmountSgd)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Current (Own Portfolio)</span>
                  <span className="font-medium text-white">
                    {formatSgd(currentOwnPortfolio)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Remaining</span>
                  <span
                    className={`font-medium ${remaining <= 0 ? "text-accent-green" : "text-accent-red"}`}
                  >
                    {remaining <= 0 ? formatSgd(0) : formatSgd(remaining)}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Progress</span>
                  <span>{progressPercent.toFixed(1)}%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-surface">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isComplete ? "bg-accent-green" : "bg-accent"
                    }`}
                    style={{ width: `${clampedProgress}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
