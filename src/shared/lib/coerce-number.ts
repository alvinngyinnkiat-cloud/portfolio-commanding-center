/** Coerce persisted / JSON values to a finite number for display and math. */
export function coerceNumber(
  value: number | null | undefined,
  fallback = 0
): number {
  if (value == null || !Number.isFinite(value)) {
    return fallback;
  }
  return value;
}
