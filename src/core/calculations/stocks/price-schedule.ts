import type { StockMarket } from "@/core/domain/types";

export const PRICE_UPDATE_TIMEZONE = "Asia/Singapore";
export const US_PRICE_UPDATE_HOUR = 6;
export const US_PRICE_UPDATE_MINUTE = 0;
export const SG_PRICE_UPDATE_HOUR = 18;
export const SG_PRICE_UPDATE_MINUTE = 0;

interface SingaporeCalendarParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export function getSingaporeCalendarParts(
  date: Date = new Date()
): SingaporeCalendarParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: PRICE_UPDATE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

/** Calendar date (YYYY-MM-DD) in Singapore timezone. */
export function getSingaporeDateString(date: Date = new Date()): string {
  const { year, month, day } = getSingaporeCalendarParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function isSingaporeTimeAtOrAfter(
  hour: number,
  minute: number,
  date: Date = new Date()
): boolean {
  const { hour: currentHour, minute: currentMinute } =
    getSingaporeCalendarParts(date);
  return (
    currentHour > hour ||
    (currentHour === hour && currentMinute >= minute)
  );
}

export function getMarketPriceUpdateHour(market: StockMarket): number {
  return market === "US" ? US_PRICE_UPDATE_HOUR : SG_PRICE_UPDATE_HOUR;
}

export function getMarketPriceUpdateMinute(market: StockMarket): number {
  return market === "US" ? US_PRICE_UPDATE_MINUTE : SG_PRICE_UPDATE_MINUTE;
}

/** True once per SGT day after the market's scheduled update time. */
export function isMarketPriceUpdateDue(
  market: StockMarket,
  lastUpdateDate: string | null,
  date: Date = new Date()
): boolean {
  const today = getSingaporeDateString(date);
  if (lastUpdateDate === today) {
    return false;
  }

  return isSingaporeTimeAtOrAfter(
    getMarketPriceUpdateHour(market),
    getMarketPriceUpdateMinute(market),
    date
  );
}
