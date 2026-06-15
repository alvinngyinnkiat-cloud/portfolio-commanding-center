/** Detect PostgREST / Postgres "table does not exist" errors for optional tables. */
export function isMissingSupabaseTableError(
  error: unknown,
  tableName?: string
): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as { code?: string; message?: string };
  const code = record.code ?? "";
  const message = record.message ?? "";

  if (code === "42P01" || code === "PGRST205") {
    if (!tableName) return true;
    return message.toLowerCase().includes(tableName.toLowerCase());
  }

  if (/does not exist/i.test(message)) {
    if (!tableName) return true;
    return message.toLowerCase().includes(tableName.toLowerCase());
  }

  return false;
}

export function formatPersistenceError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "Unknown persistence error";
}

export function logPersistenceError(scope: string, error: unknown): void {
  console.error(`[PersistenceManager] ${scope}`, error);
}
