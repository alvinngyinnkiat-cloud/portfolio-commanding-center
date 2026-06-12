import type { Goal, GoalProgress } from "@/core/domain/types";

export function calculateGoalProgress(
  goals: Goal[],
  ownPortfolio: number
): GoalProgress[] {
  return goals
    .filter((g) => g.active)
    .map((goal) => {
      const remaining = goal.targetAmountSgd - ownPortfolio;
      const progressPercent =
        goal.targetAmountSgd > 0
          ? (ownPortfolio / goal.targetAmountSgd) * 100
          : 0;
      return {
        goal,
        currentOwnPortfolio: ownPortfolio,
        remaining,
        progressPercent,
      };
    });
}
