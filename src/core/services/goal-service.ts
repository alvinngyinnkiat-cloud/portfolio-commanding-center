import type { Goal } from "@/core/domain/types";
import type { GoalRepository } from "@/core/database/repositories/goal-repository";

export class GoalService {
  constructor(private repo: GoalRepository) {}

  list(): Goal[] {
    return this.repo.list();
  }

  upsert(goal: Goal): void {
    this.repo.upsert(goal);
  }

  delete(id: string): void {
    this.repo.delete(id);
  }
}
