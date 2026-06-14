export type ContributionType = "deposit" | "withdrawal";
export type ContributionCategory = "stock" | "crypto" | "cash";

export interface ContributionTransaction {
  id: string;
  date: string;
  type: ContributionType;
  category: ContributionCategory;
  /** Original keyed amount — Total Contribution always uses this */
  amountSgd: number;
  notes?: string;
  /** Stock only: USD portion of amount (0–100). SGD portion = 100 - this */
  usdAllocationPercent?: number;
  /** USD/SGD FX rate used when this transaction was recorded (stock USD leg). */
  fxRate?: number;
}
