import type {
  OptionsCloseMethod,
  OptionsSettings,
  OptionsStrategy,
  OptionsTrade,
  OptionsTradeType,
} from "@/core/domain/types/options";
import { normalizeShareSplit } from "./split";
import { normalizeUnderlying } from "./helpers";
import {
  calculateVerticalSpreadMetrics,
  isVerticalSpreadStrategy,
  validateVerticalSpreadStrikes,
} from "./vertical-spread";
import {
  calculateIronCondorMetrics,
  isIronCondorStrategy,
  validateIronCondorStrikes,
} from "./iron-condor";
import {
  calculateNakedCreditMetrics,
  validateNakedCreditStrike,
} from "./naked-credit";
import {
  calculateDebitOptionMetrics,
  validateDebitOptionStrike,
} from "./debit-option";
import {
  getOriginalContracts,
  getRemainingContracts,
} from "./contract-tracking";
import {
  getOpenPremiumFieldLabel,
  isDebitStrategy,
  isNakedCreditStrategy,
  requiresManualMaxRisk,
} from "./strategy-kind";

export interface OptionsValidationError {
  field: string;
  message: string;
}

export interface OpenTradeDraft {
  id?: string;
  tradeType: OptionsTradeType;
  userSharePercent: number;
  clientSharePercent: number;
  strategy: OptionsStrategy;
  strategyLabel?: string;
  underlying: string;
  expirationDate: string;
  contracts: number;
  shortStrikeUsd?: number;
  longStrikeUsd?: number;
  bullPutShortStrikeUsd?: number;
  bullPutLongStrikeUsd?: number;
  bearCallShortStrikeUsd?: number;
  bearCallLongStrikeUsd?: number;
  openDate: string;
  openPremiumUsd: number;
  openFeesUsd: number;
  /** Required for custom only; auto-derived for bull put, bear call, iron condor. */
  maxRiskUsd?: number;
  currentValueUsd?: number;
  underlyingPriceUsd?: number;
  notes?: string;
}

export interface ResolvedOpenTradeDraft extends OpenTradeDraft {
  maxRiskUsd: number;
  shortStrikeUsd?: number;
  longStrikeUsd?: number;
  bullPutShortStrikeUsd?: number;
  bullPutLongStrikeUsd?: number;
  bearCallShortStrikeUsd?: number;
  bearCallLongStrikeUsd?: number;
}

export interface CloseTradeDraft {
  closeDate: string;
  /** Contracts to close this event; defaults to all remaining when omitted. */
  contractsToClose?: number;
  closeMethod: OptionsCloseMethod;
  closePremiumUsd?: number;
  closeFeesUsd?: number;
  manualRealizedPlUsd?: number;
  notesAppend?: string;
}

export interface ClosedTradeEditDraft {
  tradeType: OptionsTradeType;
  userSharePercent: number;
  clientSharePercent: number;
  strategy: OptionsStrategy;
  strategyLabel?: string;
  underlying: string;
  expirationDate: string;
  contracts: number;
  shortStrikeUsd?: number;
  longStrikeUsd?: number;
  bullPutShortStrikeUsd?: number;
  bullPutLongStrikeUsd?: number;
  bearCallShortStrikeUsd?: number;
  bearCallLongStrikeUsd?: number;
  openDate: string;
  openPremiumUsd: number;
  openFeesUsd: number;
  maxRiskUsd?: number;
  closeDate: string;
  closeMethod: OptionsCloseMethod;
  closePremiumUsd?: number;
  closeFeesUsd?: number;
  manualRealizedPlUsd?: number;
  notes?: string;
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
}

function compareDates(a: string, b: string): number {
  return a.localeCompare(b);
}

export function validateOpenTradeDraft(
  draft: OpenTradeDraft,
  settings: OptionsSettings
): OptionsValidationError[] {
  const errors: OptionsValidationError[] = [];
  const underlying = normalizeUnderlying(draft.underlying);

  if (!underlying) {
    errors.push({ field: "underlying", message: "Underlying is required" });
  }

  if (draft.strategy === "custom" && !draft.strategyLabel?.trim()) {
    errors.push({ field: "strategyLabel", message: "Custom strategy label is required" });
  }

  if (!Number.isInteger(draft.contracts) || draft.contracts <= 0) {
    errors.push({ field: "contracts", message: "Contracts must be a positive integer" });
  }

  if (!isValidDate(draft.openDate)) {
    errors.push({ field: "openDate", message: "Open date is required" });
  }

  if (!isValidDate(draft.expirationDate)) {
    errors.push({ field: "expirationDate", message: "Expiration date is required" });
  } else if (
    isValidDate(draft.openDate) &&
    compareDates(draft.expirationDate, draft.openDate) < 0
  ) {
    errors.push({
      field: "expirationDate",
      message: "Expiration must be on or after open date",
    });
  }

  if (!Number.isFinite(draft.openPremiumUsd)) {
    errors.push({
      field: "openPremiumUsd",
      message: `${getOpenPremiumFieldLabel(draft.strategy).replace(" (Option Price)", "")} is required`,
    });
  }

  if (!Number.isFinite(draft.openFeesUsd) || draft.openFeesUsd < 0) {
    errors.push({ field: "openFeesUsd", message: "Open fees must be zero or greater" });
  }

  if (isVerticalSpreadStrategy(draft.strategy)) {
    if (draft.shortStrikeUsd == null || !Number.isFinite(draft.shortStrikeUsd)) {
      errors.push({ field: "shortStrikeUsd", message: "Short strike is required" });
    }
    if (draft.longStrikeUsd == null || !Number.isFinite(draft.longStrikeUsd)) {
      errors.push({ field: "longStrikeUsd", message: "Long strike is required" });
    }
    if (
      draft.shortStrikeUsd != null &&
      draft.longStrikeUsd != null &&
      Number.isFinite(draft.shortStrikeUsd) &&
      Number.isFinite(draft.longStrikeUsd)
    ) {
      const strikeError = validateVerticalSpreadStrikes(
        draft.strategy,
        draft.shortStrikeUsd,
        draft.longStrikeUsd
      );
      if (strikeError) {
        errors.push({ field: "shortStrikeUsd", message: strikeError });
      } else if (Number.isFinite(draft.openPremiumUsd)) {
        const metrics = calculateVerticalSpreadMetrics({
          strategy: draft.strategy,
          shortStrikeUsd: draft.shortStrikeUsd,
          longStrikeUsd: draft.longStrikeUsd,
          contracts: draft.contracts,
          openPremiumUsd: draft.openPremiumUsd,
          openFeesUsd: draft.openFeesUsd,
        });
        if (metrics.maxRiskUsd <= 0) {
          errors.push({
            field: "openPremiumUsd",
            message: "Premium exceeds spread width — max risk must be positive",
          });
        }
      }
    }
  } else if (isNakedCreditStrategy(draft.strategy)) {
    if (draft.shortStrikeUsd == null || !Number.isFinite(draft.shortStrikeUsd)) {
      errors.push({
        field: "shortStrikeUsd",
        message:
          draft.strategy === "sellPut"
            ? "Put strike is required"
            : "Call strike is required",
      });
    } else {
      const strikeError = validateNakedCreditStrike(
        draft.strategy,
        draft.shortStrikeUsd
      );
      if (strikeError) {
        errors.push({ field: "shortStrikeUsd", message: strikeError });
      } else if (Number.isFinite(draft.openPremiumUsd)) {
        const metrics = calculateNakedCreditMetrics({
          strategy: draft.strategy,
          strikeUsd: draft.shortStrikeUsd,
          contracts: draft.contracts,
          openPremiumUsd: draft.openPremiumUsd,
          openFeesUsd: draft.openFeesUsd,
          manualMaxRiskUsd: draft.maxRiskUsd,
        });
        if (draft.strategy === "sellPut" && metrics.maxRiskUsd <= 0) {
          errors.push({
            field: "openPremiumUsd",
            message: "Premium exceeds assignment width — max risk must be positive",
          });
        }
      }
    }
    if (draft.strategy === "sellCall") {
      if (draft.maxRiskUsd == null || !Number.isFinite(draft.maxRiskUsd) || draft.maxRiskUsd <= 0) {
        errors.push({
          field: "maxRiskUsd",
          message:
            "Max risk must be greater than zero (underlying shares tracked in Module 2)",
        });
      }
    }
  } else if (isDebitStrategy(draft.strategy)) {
    if (draft.longStrikeUsd == null || !Number.isFinite(draft.longStrikeUsd)) {
      errors.push({
        field: "longStrikeUsd",
        message:
          draft.strategy === "buyCall"
            ? "Call strike is required"
            : "Put strike is required",
      });
    } else {
      const strikeError = validateDebitOptionStrike(
        draft.strategy,
        draft.longStrikeUsd
      );
      if (strikeError) {
        errors.push({ field: "longStrikeUsd", message: strikeError });
      } else if (Number.isFinite(draft.openPremiumUsd)) {
        const metrics = calculateDebitOptionMetrics({
          strategy: draft.strategy,
          strikeUsd: draft.longStrikeUsd,
          contracts: draft.contracts,
          openPremiumUsd: draft.openPremiumUsd,
          openFeesUsd: draft.openFeesUsd,
        });
        if (metrics.premiumCostUsd <= 0) {
          errors.push({
            field: "openPremiumUsd",
            message: "Premium cost must be greater than zero",
          });
        }
      }
    }
  } else if (isIronCondorStrategy(draft.strategy)) {
    const strikeFields = [
      ["bullPutShortStrikeUsd", draft.bullPutShortStrikeUsd, "Bull put short strike is required"],
      ["bullPutLongStrikeUsd", draft.bullPutLongStrikeUsd, "Bull put long strike is required"],
      ["bearCallShortStrikeUsd", draft.bearCallShortStrikeUsd, "Bear call short strike is required"],
      ["bearCallLongStrikeUsd", draft.bearCallLongStrikeUsd, "Bear call long strike is required"],
    ] as const;

    for (const [field, value, message] of strikeFields) {
      if (value == null || !Number.isFinite(value)) {
        errors.push({ field, message });
      }
    }

    if (
      draft.bullPutShortStrikeUsd != null &&
      draft.bullPutLongStrikeUsd != null &&
      draft.bearCallShortStrikeUsd != null &&
      draft.bearCallLongStrikeUsd != null &&
      Number.isFinite(draft.bullPutShortStrikeUsd) &&
      Number.isFinite(draft.bullPutLongStrikeUsd) &&
      Number.isFinite(draft.bearCallShortStrikeUsd) &&
      Number.isFinite(draft.bearCallLongStrikeUsd)
    ) {
      const strikeError = validateIronCondorStrikes({
        bullPutShortStrikeUsd: draft.bullPutShortStrikeUsd,
        bullPutLongStrikeUsd: draft.bullPutLongStrikeUsd,
        bearCallShortStrikeUsd: draft.bearCallShortStrikeUsd,
        bearCallLongStrikeUsd: draft.bearCallLongStrikeUsd,
        contracts: draft.contracts,
        openPremiumUsd: draft.openPremiumUsd,
        openFeesUsd: draft.openFeesUsd,
      });
      if (strikeError) {
        errors.push({ field: "bullPutShortStrikeUsd", message: strikeError });
      } else if (Number.isFinite(draft.openPremiumUsd)) {
        const metrics = calculateIronCondorMetrics({
          bullPutShortStrikeUsd: draft.bullPutShortStrikeUsd,
          bullPutLongStrikeUsd: draft.bullPutLongStrikeUsd,
          bearCallShortStrikeUsd: draft.bearCallShortStrikeUsd,
          bearCallLongStrikeUsd: draft.bearCallLongStrikeUsd,
          contracts: draft.contracts,
          openPremiumUsd: draft.openPremiumUsd,
          openFeesUsd: draft.openFeesUsd,
        });
        if (metrics.maxRiskUsd <= 0) {
          errors.push({
            field: "openPremiumUsd",
            message: "Premium exceeds iron condor width — max risk must be positive",
          });
        }
      }
    }
  } else if (requiresManualMaxRisk(draft.strategy) && draft.strategy === "custom") {
    if (draft.maxRiskUsd == null || !Number.isFinite(draft.maxRiskUsd) || draft.maxRiskUsd <= 0) {
      errors.push({
        field: "maxRiskUsd",
        message: "Max risk must be greater than zero",
      });
    }
  }

  if (draft.currentValueUsd != null) {
    if (!Number.isFinite(draft.currentValueUsd) || draft.currentValueUsd < 0) {
      errors.push({
        field: "currentValueUsd",
        message: "Current value must be zero or greater",
      });
    }
  }

  if (draft.underlyingPriceUsd != null) {
    if (!Number.isFinite(draft.underlyingPriceUsd) || draft.underlyingPriceUsd <= 0) {
      errors.push({
        field: "underlyingPriceUsd",
        message: "Underlying price must be greater than zero",
      });
    }
  }

  let userPct = draft.userSharePercent;
  let clientPct = draft.clientSharePercent;
  if (draft.tradeType === "personal") {
    userPct = 100;
    clientPct = 0;
  } else {
    const split = normalizeShareSplit(
      draft.userSharePercent ?? settings.defaultSharedUserPercent,
      draft.clientSharePercent ?? settings.defaultSharedClientPercent
    );
    userPct = split.userSharePercent;
    clientPct = split.clientSharePercent;
    if (Math.abs(userPct + clientPct - 100) > 0.01) {
      errors.push({ field: "userSharePercent", message: "Split must total 100%" });
    }
  }

  return errors;
}

/** Normalize draft and derive max risk for automated strategies. */
export function resolveOpenTradeDraft(draft: OpenTradeDraft): ResolvedOpenTradeDraft {
  if (isVerticalSpreadStrategy(draft.strategy)) {
    const metrics = calculateVerticalSpreadMetrics({
      strategy: draft.strategy,
      shortStrikeUsd: draft.shortStrikeUsd!,
      longStrikeUsd: draft.longStrikeUsd!,
      contracts: draft.contracts,
      openPremiumUsd: draft.openPremiumUsd,
      openFeesUsd: draft.openFeesUsd,
    });
    return {
      ...draft,
      shortStrikeUsd: draft.shortStrikeUsd,
      longStrikeUsd: draft.longStrikeUsd,
      maxRiskUsd: metrics.maxRiskUsd,
    };
  }

  if (isIronCondorStrategy(draft.strategy)) {
    const metrics = calculateIronCondorMetrics({
      bullPutShortStrikeUsd: draft.bullPutShortStrikeUsd!,
      bullPutLongStrikeUsd: draft.bullPutLongStrikeUsd!,
      bearCallShortStrikeUsd: draft.bearCallShortStrikeUsd!,
      bearCallLongStrikeUsd: draft.bearCallLongStrikeUsd!,
      contracts: draft.contracts,
      openPremiumUsd: draft.openPremiumUsd,
      openFeesUsd: draft.openFeesUsd,
    });
    return {
      ...draft,
      bullPutShortStrikeUsd: draft.bullPutShortStrikeUsd,
      bullPutLongStrikeUsd: draft.bullPutLongStrikeUsd,
      bearCallShortStrikeUsd: draft.bearCallShortStrikeUsd,
      bearCallLongStrikeUsd: draft.bearCallLongStrikeUsd,
      maxRiskUsd: metrics.maxRiskUsd,
    };
  }

  if (isNakedCreditStrategy(draft.strategy)) {
    const metrics = calculateNakedCreditMetrics({
      strategy: draft.strategy,
      strikeUsd: draft.shortStrikeUsd!,
      contracts: draft.contracts,
      openPremiumUsd: draft.openPremiumUsd,
      openFeesUsd: draft.openFeesUsd,
      manualMaxRiskUsd: draft.maxRiskUsd,
    });
    return {
      ...draft,
      shortStrikeUsd: draft.shortStrikeUsd,
      maxRiskUsd:
        draft.strategy === "sellCall" ? draft.maxRiskUsd! : metrics.maxRiskUsd,
    };
  }

  if (isDebitStrategy(draft.strategy)) {
    const metrics = calculateDebitOptionMetrics({
      strategy: draft.strategy,
      strikeUsd: draft.longStrikeUsd!,
      contracts: draft.contracts,
      openPremiumUsd: draft.openPremiumUsd,
      openFeesUsd: draft.openFeesUsd,
    });
    return {
      ...draft,
      longStrikeUsd: draft.longStrikeUsd,
      maxRiskUsd: metrics.maxRiskUsd,
    };
  }

  return {
    ...draft,
    maxRiskUsd: draft.maxRiskUsd!,
  };
}

export function validateCloseTradeDraft(
  trade: OptionsTrade,
  draft: CloseTradeDraft
): OptionsValidationError[] {
  const errors: OptionsValidationError[] = [];

  if (trade.status !== "open") {
    errors.push({ field: "status", message: "Only open trades can be closed" });
    return errors;
  }

  const remaining = getRemainingContracts(trade);
  const contractsToClose = draft.contractsToClose ?? remaining;

  if (!Number.isFinite(contractsToClose) || contractsToClose <= 0) {
    errors.push({
      field: "contractsToClose",
      message: "Contracts to close must be greater than zero",
    });
  } else if (contractsToClose > remaining) {
    errors.push({
      field: "contractsToClose",
      message: `Cannot close more than ${remaining} remaining contract${remaining === 1 ? "" : "s"}`,
    });
  } else if (contractsToClose > getOriginalContracts(trade)) {
    errors.push({
      field: "contractsToClose",
      message: "Contracts to close cannot exceed original contracts",
    });
  }

  if (!isValidDate(draft.closeDate)) {
    errors.push({ field: "closeDate", message: "Close date is required" });
  } else if (compareDates(draft.closeDate, trade.openDate) < 0) {
    errors.push({
      field: "closeDate",
      message: "Close date must be on or after open date",
    });
  }

  if (draft.closeMethod === "manual_pl") {
    if (!Number.isFinite(draft.manualRealizedPlUsd)) {
      errors.push({
        field: "manualRealizedPlUsd",
        message: "Final realized P/L is required",
      });
    }
    return errors;
  }

  if (!Number.isFinite(draft.closePremiumUsd) || draft.closePremiumUsd! < 0) {
    errors.push({
      field: "closePremiumUsd",
      message: "Close debit must be zero or greater",
    });
  }

  if (!Number.isFinite(draft.closeFeesUsd) || draft.closeFeesUsd! < 0) {
    errors.push({
      field: "closeFeesUsd",
      message: "Close fees must be zero or greater",
    });
  }

  return errors;
}

function validateClosedCloseFields(
  draft: Pick<
    ClosedTradeEditDraft,
    "closeMethod" | "closePremiumUsd" | "closeFeesUsd" | "manualRealizedPlUsd"
  >,
  errors: OptionsValidationError[]
): void {
  if (draft.closeMethod === "manual_pl") {
    if (!Number.isFinite(draft.manualRealizedPlUsd)) {
      errors.push({
        field: "manualRealizedPlUsd",
        message: "Final realized P/L is required",
      });
    }
    return;
  }

  if (!Number.isFinite(draft.closePremiumUsd) || draft.closePremiumUsd! < 0) {
    errors.push({
      field: "closePremiumUsd",
      message: "Close debit must be zero or greater",
    });
  }

  if (!Number.isFinite(draft.closeFeesUsd) || draft.closeFeesUsd! < 0) {
    errors.push({
      field: "closeFeesUsd",
      message: "Close fees must be zero or greater",
    });
  }
}

export function validateClosedTradeEditDraft(
  trade: OptionsTrade,
  draft: ClosedTradeEditDraft,
  settings: OptionsSettings
): OptionsValidationError[] {
  if (trade.status !== "closed") {
    return [{ field: "status", message: "Only closed trades can be edited" }];
  }

  const openDraft: OpenTradeDraft = {
    id: trade.id,
    tradeType: draft.tradeType,
    userSharePercent: draft.userSharePercent,
    clientSharePercent: draft.clientSharePercent,
    strategy: draft.strategy,
    strategyLabel: draft.strategyLabel,
    underlying: draft.underlying,
    expirationDate: draft.expirationDate,
    contracts: draft.contracts,
    shortStrikeUsd: draft.shortStrikeUsd,
    longStrikeUsd: draft.longStrikeUsd,
    bullPutShortStrikeUsd: draft.bullPutShortStrikeUsd,
    bullPutLongStrikeUsd: draft.bullPutLongStrikeUsd,
    bearCallShortStrikeUsd: draft.bearCallShortStrikeUsd,
    bearCallLongStrikeUsd: draft.bearCallLongStrikeUsd,
    openDate: draft.openDate,
    openPremiumUsd: draft.openPremiumUsd,
    openFeesUsd: draft.openFeesUsd,
    maxRiskUsd: draft.maxRiskUsd,
    notes: draft.notes,
  };

  const errors = validateOpenTradeDraft(openDraft, settings);

  if (!isValidDate(draft.closeDate)) {
    errors.push({ field: "closeDate", message: "Close date is required" });
  } else if (compareDates(draft.closeDate, draft.openDate) < 0) {
    errors.push({
      field: "closeDate",
      message: "Close date must be on or after open date",
    });
  }

  validateClosedCloseFields(draft, errors);

  return errors;
}

export function validateCurrentValueUpdate(value: number): OptionsValidationError[] {
  if (!Number.isFinite(value) || value < 0) {
    return [{ field: "currentValueUsd", message: "Current value must be zero or greater" }];
  }
  return [];
}

export function validateUnderlyingPriceUpdate(
  value: number
): OptionsValidationError[] {
  if (!Number.isFinite(value) || value <= 0) {
    return [
      {
        field: "underlyingPriceUsd",
        message: "Underlying price must be greater than zero",
      },
    ];
  }
  return [];
}

export interface MarkTradeUpdate {
  currentValueUsd?: number | null;
  underlyingPriceUsd?: number | null;
}

export function validateMarkTradeUpdate(
  update: MarkTradeUpdate
): OptionsValidationError[] {
  const errors: OptionsValidationError[] = [];
  const hasCurrentValue = update.currentValueUsd !== undefined;
  const hasUnderlying = update.underlyingPriceUsd !== undefined;

  if (!hasCurrentValue && !hasUnderlying) {
    errors.push({
      field: "mark",
      message: "Enter at least one value to save",
    });
    return errors;
  }

  if (hasCurrentValue && update.currentValueUsd != null) {
    errors.push(...validateCurrentValueUpdate(update.currentValueUsd));
  }
  if (hasUnderlying && update.underlyingPriceUsd != null) {
    errors.push(...validateUnderlyingPriceUpdate(update.underlyingPriceUsd));
  }
  return errors;
}
