const US_MARKET_TIMEZONE = "America/New_York";
const US_MARKET_CLOSE_HOUR = 16;

interface UsMarketCalendarParts {
  year: string;
  month: string;
  day: string;
  hour: number;
  minute: number;
  weekday: string;
}

function getUsMarketCalendarParts(date: Date = new Date()): UsMarketCalendarParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: US_MARKET_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday: get("weekday"),
  };
}

/** Calendar date (YYYY-MM-DD) in US/Eastern — matches Yahoo daily session labels. */
export function getUsMarketDateString(date: Date = new Date()): string {
  const { year, month, day } = getUsMarketCalendarParts(date);
  return `${year}-${month}-${day}`;
}

export function formatUsMarketDateFromUnix(seconds: number): string {
  return getUsMarketDateString(new Date(seconds * 1000));
}

/** True after 4:00 PM ET on a US trading day, or on weekends (prior sessions complete). */
export function isUsCashSessionClosed(asOf: Date = new Date()): boolean {
  const { weekday, hour, minute } = getUsMarketCalendarParts(asOf);
  if (weekday === "Sat" || weekday === "Sun") {
    return true;
  }
  return hour > US_MARKET_CLOSE_HOUR || (hour === US_MARKET_CLOSE_HOUR && minute >= 0);
}
