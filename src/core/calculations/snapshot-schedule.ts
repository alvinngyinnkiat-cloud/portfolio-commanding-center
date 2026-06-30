import type { DailySnapshot } from "@/core/domain/types";

/** Automatic snapshot target: 11:59 PM Singapore time (UTC+8). */
export const SNAPSHOT_AUTO_CAPTURE_TIMEZONE = "Asia/Singapore";
export const SNAPSHOT_AUTO_CAPTURE_HOUR = 23;
export const SNAPSHOT_AUTO_CAPTURE_MINUTE = 59;

export type AutomaticSnapshotSkipReason =
  | "before_capture_time"
  | "already_captured"
  | "invalid_state";

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

  const hourRaw = parts.find((p) => p.type === "hour")?.value ?? "0";
  const hour = hourRaw === "24" ? 0 : Number(hourRaw);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour,
    minute: get("minute"),
  };
}

/** Calendar date (YYYY-MM-DD) in Singapore timezone. */
export function getSingaporeDateString(date: Date = new Date()): string {
  const { year, month, day } = getSingaporeCalendarParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * True only during the 11:59 PM SGT minute — the automatic snapshot window.
 * False before 23:59 and false at/after midnight (00:00–00:59).
 */
export function isSingaporeAutomaticSnapshotDue(date: Date = new Date()): boolean {
  const { hour, minute } = getSingaporeCalendarParts(date);

  if (hour === 0) {
    return false;
  }

  return (
    hour === SNAPSHOT_AUTO_CAPTURE_HOUR &&
    minute >= SNAPSHOT_AUTO_CAPTURE_MINUTE
  );
}

/** @deprecated Use isSingaporeAutomaticSnapshotDue */
export function isSingaporeEndOfDayCaptureWindow(
  date: Date = new Date()
): boolean {
  return isSingaporeAutomaticSnapshotDue(date);
}

export function getAutomaticSnapshotSkipReason(
  date: Date = new Date()
): AutomaticSnapshotSkipReason | null {
  if (!isSingaporeAutomaticSnapshotDue(date)) {
    return "before_capture_time";
  }
  return null;
}

export function hasSnapshotForDate(
  snapshots: DailySnapshot[],
  date: string
): boolean {
  return snapshots.some((snapshot) => snapshot.date === date);
}

export function hasAutomaticSnapshotForDate(
  snapshots: DailySnapshot[],
  date: string
): boolean {
  return snapshots.some(
    (snapshot) => snapshot.date === date && snapshot.snapshotType === "automatic"
  );
}

/** Test helper — wall-clock time in Asia/Singapore. */
export function sgtWallTimeToDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0
): Date {
  const pad = (value: number) => String(value).padStart(2, "0");
  return new Date(
    `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}+08:00`
  );
}
