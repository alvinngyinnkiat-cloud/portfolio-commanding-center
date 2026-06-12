import type { ContributionTransaction } from "@/core/domain/types";
import type { ContributionRepository } from "../repositories/contribution-repository";
import { DEFAULT_CONTRIBUTIONS } from "@/core/domain/defaults";
import { STORAGE_KEYS } from "./storage-keys";
import { readJson, writeJson } from "./local-storage";

export class LocalContributionRepository implements ContributionRepository {
  list(): ContributionTransaction[] {
    return readJson(STORAGE_KEYS.contributions, DEFAULT_CONTRIBUTIONS);
  }

  upsert(transaction: ContributionTransaction): void {
    const list = this.list();
    const idx = list.findIndex((c) => c.id === transaction.id);
    if (idx >= 0) {
      list[idx] = transaction;
    } else {
      list.push(transaction);
    }
    this.replaceAll(list);
  }

  delete(id: string): void {
    this.replaceAll(this.list().filter((c) => c.id !== id));
  }

  replaceAll(transactions: ContributionTransaction[]): void {
    writeJson(STORAGE_KEYS.contributions, transactions);
  }
}
