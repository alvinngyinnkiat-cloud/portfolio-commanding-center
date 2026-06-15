import { describe, expect, it } from "vitest";
import { isMissingSupabaseTableError } from "./supabase-errors";

describe("isMissingSupabaseTableError", () => {
  it("detects PostgREST schema cache errors", () => {
    expect(
      isMissingSupabaseTableError(
        {
          code: "PGRST205",
          message:
            "Could not find the table 'public.crypto_trades' in the schema cache",
        },
        "crypto_trades"
      )
    ).toBe(true);
  });

  it("detects Postgres undefined_table errors", () => {
    expect(
      isMissingSupabaseTableError(
        {
          code: "42P01",
          message: 'relation "public.crypto_trades" does not exist',
        },
        "crypto_trades"
      )
    ).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(
      isMissingSupabaseTableError({ code: "42501", message: "permission denied" })
    ).toBe(false);
  });
});
