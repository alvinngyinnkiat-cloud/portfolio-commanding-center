import type { OptionsSplitLegs, OptionsTrade } from "@/core/domain/types/options";

export function normalizeShareSplit(
  userSharePercent: number,
  clientSharePercent: number
): { userSharePercent: number; clientSharePercent: number } {
  const user = Math.min(100, Math.max(0, userSharePercent));
  const client = Math.min(100, Math.max(0, clientSharePercent));
  const total = user + client;
  if (total === 100) {
    return { userSharePercent: user, clientSharePercent: client };
  }
  if (total <= 0) {
    return { userSharePercent: 100, clientSharePercent: 0 };
  }
  const normalizedUser = (user / total) * 100;
  const normalizedClient = 100 - normalizedUser;
  return {
    userSharePercent: Math.round(normalizedUser * 100) / 100,
    clientSharePercent: Math.round(normalizedClient * 100) / 100,
  };
}

export function splitTradeAmount(
  amountUsd: number,
  userSharePercent: number,
  clientSharePercent: number
): OptionsSplitLegs {
  const split = normalizeShareSplit(userSharePercent, clientSharePercent);
  const userLegUsd =
    Math.round(amountUsd * (split.userSharePercent / 100) * 100) / 100;
  const clientLegUsd =
    Math.round((amountUsd - userLegUsd) * 100) / 100;
  return { userLegUsd, clientLegUsd };
}

export function splitForTrade(
  trade: OptionsTrade,
  amountUsd: number
): OptionsSplitLegs {
  return splitTradeAmount(
    amountUsd,
    trade.userSharePercent,
    trade.clientSharePercent
  );
}

export function defaultSplitForTradeType(
  tradeType: OptionsTrade["tradeType"],
  settings: { defaultSharedUserPercent: number; defaultSharedClientPercent: number }
): { userSharePercent: number; clientSharePercent: number } {
  if (tradeType === "personal") {
    return { userSharePercent: 100, clientSharePercent: 0 };
  }
  return normalizeShareSplit(
    settings.defaultSharedUserPercent,
    settings.defaultSharedClientPercent
  );
}

export function formatSplitLabel(trade: OptionsTrade): string {
  return `${trade.userSharePercent}/${trade.clientSharePercent}`;
}
