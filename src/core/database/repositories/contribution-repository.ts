import type { ContributionTransaction } from "@/core/domain/types";

export interface ContributionRepository {
  list(): ContributionTransaction[];
  upsert(transaction: ContributionTransaction): void;
  delete(id: string): void;
  replaceAll(transactions: ContributionTransaction[]): void;
}
