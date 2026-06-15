const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Local calendar date as YYYY-MM-DD (avoids UTC drift from toISOString). */
export function toLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parse and validate YYYY-MM-DD (HTML date input / Supabase storage).
 * Rejects locale formats (e.g. DD/MM/YYYY) and invalid calendar dates.
 * Returns null on failure — never defaults to today or Date(0).
 */
export function parseIsoDateString(raw: string | undefined | null): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const match = ISO_DATE_PATTERN.exec(trimmed);
  if (!match) return null;

  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);

  if (m < 1 || m > 12 || d < 1 || d > 31) return null;

  const parsed = new Date(y, m - 1, d);
  if (
    parsed.getFullYear() !== y ||
    parsed.getMonth() !== m - 1 ||
    parsed.getDate() !== d
  ) {
    return null;
  }

  return trimmed;
}

/** Normalize persisted/input dates to YYYY-MM-DD. Alias for strict ISO parsing. */
export function normalizeLocalDateString(raw: string | undefined | null): string | null {
  return parseIsoDateString(raw);
}

/** Parse YYYY-MM-DD as local calendar date. Invalid input yields an invalid Date (not epoch). */
export function parseLocalDate(dateStr: string): Date {
  const iso = parseIsoDateString(dateStr);
  if (!iso) return new Date(Number.NaN);
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addLocalDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addLocalMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
