import type { OptionsTrade } from "@/core/domain/types/options";
import type {
  OptionsSettingsRepository,
  OptionsTradeRepository,
} from "@/core/database/repositories/options-repository";
import {
  calculateRealizedPlUsd,
  calculateTradeReturnPercent,
  type CloseTradeDraft,
  defaultSplitForTradeType,
  normalizeUnderlying,
  type OpenTradeDraft,
  resolveOpenTradeDraft,
  validateCloseTradeDraft,
  validateClosedTradeEditDraft,
  validateCurrentValueUpdate,
  validateMarkTradeUpdate,
  validateOpenTradeDraft,
  type ClosedTradeEditDraft,
  type MarkTradeUpdate,
} from "@/core/calculations/options";
import { generateId } from "@/core/database/local/local-storage";
import { compareDateDesc } from "@/shared/lib/sort";

function compareOptionsTradesByDate(a: OptionsTrade, b: OptionsTrade): number {
  const dateA = a.status === "closed" && a.closeDate ? a.closeDate : a.openDate;
  const dateB = b.status === "closed" && b.closeDate ? b.closeDate : b.openDate;
  const byDate = compareDateDesc(dateA, dateB);
  if (byDate !== 0) return byDate;
  return (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt);
}

export type OptionsMutationResult =
  | { ok: true; trade: OptionsTrade }
  | { ok: false; errors: Array<{ field: string; message: string }> };

export class OptionsTradeService {
  constructor(
    private tradeRepo: OptionsTradeRepository,
    private settingsRepo: OptionsSettingsRepository
  ) {}

  list(): OptionsTrade[] {
    return this.tradeRepo.list().sort(compareOptionsTradesByDate);
  }

  openTrade(draft: OpenTradeDraft): OptionsMutationResult {
    const settings = this.settingsRepo.get();
    const split = defaultSplitForTradeType(draft.tradeType, settings);
    const normalizedDraft: OpenTradeDraft = {
      ...draft,
      underlying: normalizeUnderlying(draft.underlying),
      userSharePercent:
        draft.tradeType === "personal" ? 100 : draft.userSharePercent ?? split.userSharePercent,
      clientSharePercent:
        draft.tradeType === "personal" ? 0 : draft.clientSharePercent ?? split.clientSharePercent,
    };

    const errors = validateOpenTradeDraft(normalizedDraft, settings);
    if (errors.length > 0) return { ok: false, errors };

    const resolved = resolveOpenTradeDraft(normalizedDraft);
    const now = new Date().toISOString();
    const existing = draft.id ? this.tradeRepo.getById(draft.id) : null;
    const trade: OptionsTrade = {
      id: draft.id ?? generateId(),
      status: "open",
      tradeType: resolved.tradeType,
      userSharePercent: resolved.userSharePercent,
      clientSharePercent: resolved.clientSharePercent,
      strategy: resolved.strategy,
      strategyLabel: resolved.strategyLabel?.trim() || undefined,
      underlying: resolved.underlying,
      expirationDate: resolved.expirationDate,
      contracts: resolved.contracts,
      shortStrikeUsd: resolved.shortStrikeUsd,
      longStrikeUsd: resolved.longStrikeUsd,
      bullPutShortStrikeUsd: resolved.bullPutShortStrikeUsd,
      bullPutLongStrikeUsd: resolved.bullPutLongStrikeUsd,
      bearCallShortStrikeUsd: resolved.bearCallShortStrikeUsd,
      bearCallLongStrikeUsd: resolved.bearCallLongStrikeUsd,
      openDate: resolved.openDate,
      openPremiumUsd: resolved.openPremiumUsd,
      openFeesUsd: resolved.openFeesUsd,
      maxRiskUsd: resolved.maxRiskUsd,
      currentValueUsd: existing?.currentValueUsd ?? resolved.currentValueUsd,
      currentValueUpdatedAt: existing?.currentValueUpdatedAt,
      underlyingPriceUsd:
        resolved.underlyingPriceUsd ?? existing?.underlyingPriceUsd,
      underlyingPriceUpdatedAt:
        resolved.underlyingPriceUsd != null
          ? now
          : existing?.underlyingPriceUpdatedAt,
      notes: normalizedDraft.notes?.trim() || undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    if (draft.id) {
      if (!existing || existing.status !== "open") {
        return { ok: false, errors: [{ field: "id", message: "Open trade not found" }] };
      }
      this.tradeRepo.update(trade);
    } else {
      this.tradeRepo.append(trade);
    }

    return { ok: true, trade };
  }

  updateMark(id: string, update: MarkTradeUpdate): OptionsMutationResult {
    const trade = this.tradeRepo.getById(id);
    if (!trade || trade.status !== "open") {
      return { ok: false, errors: [{ field: "id", message: "Open trade not found" }] };
    }

    const errors = validateMarkTradeUpdate(update);
    if (errors.length > 0) return { ok: false, errors };

    const now = new Date().toISOString();
    const updated: OptionsTrade = {
      ...trade,
      updatedAt: now,
    };

    if (update.currentValueUsd !== undefined) {
      updated.currentValueUsd = update.currentValueUsd ?? undefined;
      updated.currentValueUpdatedAt =
        update.currentValueUsd != null ? now : undefined;
    }

    if (update.underlyingPriceUsd !== undefined) {
      updated.underlyingPriceUsd = update.underlyingPriceUsd ?? undefined;
      updated.underlyingPriceUpdatedAt =
        update.underlyingPriceUsd != null ? now : undefined;
    }

    this.tradeRepo.update(updated);
    return { ok: true, trade: updated };
  }

  updateCurrentValue(
    id: string,
    currentValueUsd: number | null
  ): OptionsMutationResult {
    return this.updateMark(id, { currentValueUsd });
  }

  closeTrade(id: string, draft: CloseTradeDraft): OptionsMutationResult {
    const trade = this.tradeRepo.getById(id);
    if (!trade) {
      return { ok: false, errors: [{ field: "id", message: "Trade not found" }] };
    }

    const errors = validateCloseTradeDraft(trade, draft);
    if (errors.length > 0) return { ok: false, errors };

    const realizedPlUsd = calculateRealizedPlUsd({
      openPremiumUsd: trade.openPremiumUsd,
      openFeesUsd: trade.openFeesUsd,
      closePremiumUsd: draft.closePremiumUsd,
      closeFeesUsd: draft.closeFeesUsd,
    });

    const notes = [trade.notes, draft.notesAppend?.trim()]
      .filter(Boolean)
      .join(" · ");

    const now = new Date().toISOString();
    const closedMaxRiskUsd = trade.maxRiskUsd;
    const closed: OptionsTrade = {
      ...trade,
      status: "closed",
      maxRiskUsd: closedMaxRiskUsd,
      closeDate: draft.closeDate,
      closePremiumUsd: draft.closePremiumUsd,
      closeFeesUsd: draft.closeFeesUsd,
      realizedPlUsd,
      returnPercent:
        calculateTradeReturnPercent(realizedPlUsd, closedMaxRiskUsd) ?? undefined,
      currentValueUsd: undefined,
      currentValueUpdatedAt: undefined,
      underlyingPriceUsd: undefined,
      underlyingPriceUpdatedAt: undefined,
      notes: notes || undefined,
      updatedAt: now,
    };

    this.tradeRepo.update(closed);
    return { ok: true, trade: closed };
  }

  deleteOpenTrade(id: string): OptionsMutationResult {
    const trade = this.tradeRepo.getById(id);
    if (!trade) {
      return { ok: false, errors: [{ field: "id", message: "Trade not found" }] };
    }
    if (trade.status !== "open") {
      return {
        ok: false,
        errors: [{ field: "status", message: "Use delete closed trade for closed rows" }],
      };
    }
    this.tradeRepo.remove(id);
    return { ok: true, trade };
  }

  updateClosedTradeNotes(id: string, notes: string): OptionsMutationResult {
    const trade = this.tradeRepo.getById(id);
    if (!trade) {
      return { ok: false, errors: [{ field: "id", message: "Trade not found" }] };
    }
    if (trade.status !== "closed") {
      return {
        ok: false,
        errors: [{ field: "status", message: "Only closed trades support notes edit" }],
      };
    }

    const updated: OptionsTrade = {
      ...trade,
      notes: notes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };
    this.tradeRepo.update(updated);
    return { ok: true, trade: updated };
  }

  updateClosedTrade(
    id: string,
    draft: ClosedTradeEditDraft
  ): OptionsMutationResult {
    const trade = this.tradeRepo.getById(id);
    if (!trade) {
      return { ok: false, errors: [{ field: "id", message: "Trade not found" }] };
    }

    const settings = this.settingsRepo.get();
    const split = defaultSplitForTradeType(draft.tradeType, settings);
    const normalizedDraft: ClosedTradeEditDraft = {
      ...draft,
      underlying: normalizeUnderlying(draft.underlying),
      userSharePercent:
        draft.tradeType === "personal"
          ? 100
          : draft.userSharePercent ?? split.userSharePercent,
      clientSharePercent:
        draft.tradeType === "personal"
          ? 0
          : draft.clientSharePercent ?? split.clientSharePercent,
      notes: draft.notes?.trim() || undefined,
    };

    const errors = validateClosedTradeEditDraft(trade, normalizedDraft, settings);
    if (errors.length > 0) return { ok: false, errors };

    const resolved = resolveOpenTradeDraft({
      tradeType: normalizedDraft.tradeType,
      userSharePercent: normalizedDraft.userSharePercent,
      clientSharePercent: normalizedDraft.clientSharePercent,
      strategy: normalizedDraft.strategy,
      strategyLabel: normalizedDraft.strategyLabel,
      underlying: normalizedDraft.underlying,
      expirationDate: normalizedDraft.expirationDate,
      contracts: normalizedDraft.contracts,
      shortStrikeUsd: normalizedDraft.shortStrikeUsd,
      longStrikeUsd: normalizedDraft.longStrikeUsd,
      bullPutShortStrikeUsd: normalizedDraft.bullPutShortStrikeUsd,
      bullPutLongStrikeUsd: normalizedDraft.bullPutLongStrikeUsd,
      bearCallShortStrikeUsd: normalizedDraft.bearCallShortStrikeUsd,
      bearCallLongStrikeUsd: normalizedDraft.bearCallLongStrikeUsd,
      openDate: normalizedDraft.openDate,
      openPremiumUsd: normalizedDraft.openPremiumUsd,
      openFeesUsd: normalizedDraft.openFeesUsd,
      maxRiskUsd: normalizedDraft.maxRiskUsd,
      notes: normalizedDraft.notes,
    });

    const realizedPlUsd = calculateRealizedPlUsd({
      openPremiumUsd: resolved.openPremiumUsd,
      openFeesUsd: resolved.openFeesUsd,
      closePremiumUsd: normalizedDraft.closePremiumUsd,
      closeFeesUsd: normalizedDraft.closeFeesUsd,
    });

    const now = new Date().toISOString();
    const updated: OptionsTrade = {
      id: trade.id,
      status: "closed",
      createdAt: trade.createdAt,
      tradeType: resolved.tradeType,
      userSharePercent: resolved.userSharePercent,
      clientSharePercent: resolved.clientSharePercent,
      strategy: resolved.strategy,
      strategyLabel: resolved.strategyLabel?.trim() || undefined,
      underlying: resolved.underlying,
      expirationDate: resolved.expirationDate,
      contracts: resolved.contracts,
      shortStrikeUsd: resolved.shortStrikeUsd,
      longStrikeUsd: resolved.longStrikeUsd,
      bullPutShortStrikeUsd: resolved.bullPutShortStrikeUsd,
      bullPutLongStrikeUsd: resolved.bullPutLongStrikeUsd,
      bearCallShortStrikeUsd: resolved.bearCallShortStrikeUsd,
      bearCallLongStrikeUsd: resolved.bearCallLongStrikeUsd,
      openDate: resolved.openDate,
      openPremiumUsd: resolved.openPremiumUsd,
      openFeesUsd: resolved.openFeesUsd,
      maxRiskUsd: resolved.maxRiskUsd,
      closeDate: normalizedDraft.closeDate,
      closePremiumUsd: normalizedDraft.closePremiumUsd,
      closeFeesUsd: normalizedDraft.closeFeesUsd,
      realizedPlUsd,
      returnPercent:
        calculateTradeReturnPercent(realizedPlUsd, resolved.maxRiskUsd) ?? undefined,
      notes: normalizedDraft.notes,
      updatedAt: now,
    };

    this.tradeRepo.update(updated);
    return { ok: true, trade: updated };
  }

  deleteClosedTrade(id: string): OptionsMutationResult {
    const trade = this.tradeRepo.getById(id);
    if (!trade) {
      return { ok: false, errors: [{ field: "id", message: "Trade not found" }] };
    }
    if (trade.status !== "closed") {
      return {
        ok: false,
        errors: [{ field: "status", message: "Only closed trades can be deleted here" }],
      };
    }
    this.tradeRepo.remove(id);
    return { ok: true, trade };
  }
}
