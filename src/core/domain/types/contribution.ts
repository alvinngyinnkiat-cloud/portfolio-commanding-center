export type ContributionType = "deposit" | "withdrawal";
export type ContributionCategory = "stock" | "crypto";

export interface ContributionTransaction {
  id: string;
  date: string;
  type: ContributionType;
  category: ContributionCategory;
  amountSgd: number;
  notes?: string;
}
