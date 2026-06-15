import type { OptionsCloseEvent, OptionsTrade } from "@/core/domain/types/options";
import { parseIsoDateString, parseLocalDate, toLocalDateString } from "@/shared/lib/date";
import { formatDate } from "@/shared/lib/format";

const EPOCH_DATE = "1970-01-01";

/** Parse and normalize a trade calendar date to YYYY-MM-DD for storage/display. */
export function normalizeOptionsTradeDate(
  raw: string | undefined | null
): string | undefined {
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const candidates =
    trimmed.length >= 10 ? [trimmed, trimmed.slice(0, 10)] : [trimmed];

  for (const candidate of candidates) {
    const iso = parseIsoDateString(candidate);
    if (iso && iso !== EPOCH_DATE) {
      return iso;
    }
  }

  return undefined;
}

/** HTML date input value — empty string when missing/invalid (never epoch). */
export function optionsTradeDateForInput(raw: string | undefined | null): string {
  return normalizeOptionsTradeDate(raw) ?? "";
}

/** Display format DD MMM YYYY; invalid/missing → em dash. */
export function formatOptionsTradeDate(raw: string | undefined | null): string {
  const iso = normalizeOptionsTradeDate(raw);
  if (!iso) return "—";
  return formatDate(iso);
}

/** Local today as YYYY-MM-DD — default for new forms only. */
export function todayOptionsTradeDate(): string {
  return toLocalDateString();
}

/** Newest first; invalid/missing dates sort last. */
export function compareOptionsTradeDatesDesc(
  a: string | undefined | null,
  b: string | undefined | null
): number {
  const aKey = normalizeOptionsTradeDate(a) ?? "";
  const bKey = normalizeOptionsTradeDate(b) ?? "";
  return bKey.localeCompare(aKey);
}

export function normalizeOptionsCloseEventForStorage(
  event: OptionsCloseEvent
): OptionsCloseEvent {
  const closeDate = normalizeOptionsTradeDate(event.closeDate);
  return closeDate ? { ...event, closeDate } : event;
}

/** Ensure persisted option trade dates are YYYY-MM-DD (handles ISO datetime prefixes). */
export function normalizeOptionsTradeForStorage(trade: OptionsTrade): OptionsTrade {
  const openDate = normalizeOptionsTradeDate(trade.openDate);
  const expirationDate = normalizeOptionsTradeDate(trade.expirationDate);
  const closeDate = normalizeOptionsTradeDate(trade.closeDate);

  const normalized: OptionsTrade = {
    ...trade,
    openDate: openDate ?? trade.openDate,
    expirationDate: expirationDate ?? trade.expirationDate,
  };

  if (closeDate) {
    normalized.closeDate = closeDate;
  } else if (trade.closeDate != null) {
    delete normalized.closeDate;
  }

  if (trade.closeEvents?.length) {
    normalized.closeEvents = trade.closeEvents.map(normalizeOptionsCloseEventForStorage);
  }

  return normalized;
}

export function normalizeOptionsTradesForStorage(trades: OptionsTrade[]): OptionsTrade[] {
  return trades.map(normalizeOptionsTradeForStorage);
}

/** Calendar day difference using local date parsing — no UTC drift. */
export function optionsDaysBetween(
  startDate: string | undefined | null,
  endDate: string | undefined | null
): number {
  const startIso = normalizeOptionsTradeDate(startDate);
  const endIso = normalizeOptionsTradeDate(endDate);
  if (!startIso || !endIso) return 0;

  const start = parseLocalDate(startIso);
  const end = parseLocalDate(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
}

export function optionsDaysToExpiration(
  expirationDate: string | undefined | null,
  asOfDate?: string
): number {
  const today = asOfDate ?? todayOptionsTradeDate();
  return optionsDaysBetween(today, expirationDate);
}
