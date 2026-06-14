import type { ContributionTransaction } from "@/core/domain/types";
import type { ContributionRepository } from "@/core/database/repositories/contribution-repository";
import { sortByDateDesc } from "@/shared/lib/sort";

export class ContributionService {
  constructor(private repo: ContributionRepository) {}

  list(): ContributionTransaction[] {
    return sortByDateDesc(this.repo.list());
  }

  upsert(transaction: ContributionTransaction): void {
    this.repo.upsert(transaction);
  }

  delete(id: string): void {
    this.repo.delete(id);
  }
}
