import type { Goal } from "@/core/domain/types";

export interface GoalRepository {
  list(): Goal[];
  upsert(goal: Goal): void;
  delete(id: string): void;
  replaceAll(goals: Goal[]): void;
}
