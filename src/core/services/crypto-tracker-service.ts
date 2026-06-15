import type {
  CryptoAllocationSettings,
  CryptoHoldingRow,
  CryptoTrackerSummary,
  CryptoTrade,
} from "@/core/domain/types";
import type { CryptoHoldingRepository } from "@/core/database/repositories/crypto-holding-repository";
import type { CryptoTradeRepository } from "@/core/database/repositories/crypto-trade-repository";
import type { CryptoAllocationRepository } from "@/core/database/repositories/crypto-allocation-repository";
import type { ContributionRepository } from "@/core/database/repositories/contribution-repository";
import { calculateTotalCryptoCashContributed } from "@/core/calculations/crypto/contributions";
import {
  buildCryptoHoldingRows,
  buildCryptoTrackerSummary,
} from "@/core/calculations/crypto/summary";
import { deriveDashboardCryptoOutputs } from "@/core/adapters/dashboard-crypto-adapter";

export interface CryptoTrackerData {
  summary: CryptoTrackerSummary;
  rows: CryptoHoldingRow[];
  trades: CryptoTrade[];
  allocationSettings: CryptoAllocationSettings;
  dashboardOutputs: ReturnType<typeof deriveDashboardCryptoOutputs>;
}

export class CryptoTrackerService {
  constructor(
    private readonly holdings: CryptoHoldingRepository,
    private readonly trades: CryptoTradeRepository,
    private readonly allocation: CryptoAllocationRepository,
    private readonly contributions: ContributionRepository
  ) {}

  getData(): CryptoTrackerData {
    const holdingList = this.holdings.list();
    const tradeList = this.trades.list();
    const contributions = this.contributions.list();

    const totalCryptoCashContributed =
      calculateTotalCryptoCashContributed(contributions);

    const summary = buildCryptoTrackerSummary(
      holdingList,
      totalCryptoCashContributed,
      tradeList
    );
    const rows = buildCryptoHoldingRows(holdingList);
    const allocationSettings = this.allocation.get();

    return {
      summary,
      rows,
      trades: tradeList,
      allocationSettings,
      dashboardOutputs: deriveDashboardCryptoOutputs(summary),
    };
  }
}
