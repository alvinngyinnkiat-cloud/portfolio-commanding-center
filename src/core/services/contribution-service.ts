import type { ContributionTransaction } from "@/core/domain/types";
import type { ContributionRepository } from "@/core/database/repositories/contribution-repository";

export class ContributionService {
  constructor(private repo: ContributionRepository) {}

  list(): ContributionTransaction[] {
    return this.repo
      .list()
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  upsert(transaction: ContributionTransaction): void {
    this.repo.upsert(transaction);
  }

  delete(id: string): void {
    this.repo.delete(id);
  }
}
