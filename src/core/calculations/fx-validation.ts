export const FX_RATE_ERROR_MESSAGE =
  "FX rate missing. Portfolio values cannot be calculated.";

/** Valid FX: finite number strictly greater than zero. */
export function isValidFxRate(fx: number | null | undefined): boolean {
  return typeof fx === "number" && !Number.isNaN(fx) && fx > 0;
}

/** Parse settings input — empty string → null; invalid parse → null. */
export function parseFxRateInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = parseFloat(trimmed);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}
