import type { DailySnapshot } from "@/core/domain/types";

/** Future scheduled job target: 11:59pm Singapore time (UTC+8). */
export const SNAPSHOT_AUTO_CAPTURE_TIMEZONE = "Asia/Singapore";
export const SNAPSHOT_AUTO_CAPTURE_HOUR = 23;
export const SNAPSHOT_AUTO_CAPTURE_MINUTE = 59;

interface SingaporeCalendarParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function getSingaporeCalendarParts(date: Date = new Date()): SingaporeCalendarParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: SNAPSHOT_AUTO_CAPTURE_TIMEZONE,
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

/**
 * True during the 11:59pm SGT minute — window for end-of-day auto capture.
 * v1.1: checked client-side while the app is open.
 * Future: server cron at this time (see SnapshotService.captureEndOfDayIfDue).
 */
export function isSingaporeEndOfDayCaptureWindow(date: Date = new Date()): boolean {
  const { hour, minute } = getSingaporeCalendarParts(date);
  return (
    hour === SNAPSHOT_AUTO_CAPTURE_HOUR &&
    minute === SNAPSHOT_AUTO_CAPTURE_MINUTE
  );
}

export function hasSnapshotForDate(
  snapshots: DailySnapshot[],
  date: string
): boolean {
  return snapshots.some((snapshot) => snapshot.date === date);
}
