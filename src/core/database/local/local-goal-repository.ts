import type { Goal } from "@/core/domain/types";
import type { GoalRepository } from "../repositories/goal-repository";
import { DEFAULT_GOALS } from "@/core/domain/defaults";
import { STORAGE_KEYS } from "./storage-keys";
import { readJson, writeJson } from "./local-storage";

export class LocalGoalRepository implements GoalRepository {
  list(): Goal[] {
    return readJson(STORAGE_KEYS.goals, DEFAULT_GOALS);
  }

  upsert(goal: Goal): void {
    const list = this.list();
    const idx = list.findIndex((g) => g.id === goal.id);
    if (idx >= 0) {
      list[idx] = goal;
    } else {
      list.push(goal);
    }
    this.replaceAll(list);
  }

  delete(id: string): void {
    this.replaceAll(this.list().filter((g) => g.id !== id));
  }

  replaceAll(goals: Goal[]): void {
    writeJson(STORAGE_KEYS.goals, goals);
  }
}
