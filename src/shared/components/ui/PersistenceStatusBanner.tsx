"use client";

import { Loader2, AlertTriangle } from "lucide-react";

interface PersistenceStatusBannerProps {
  isLoading: boolean;
  error: string | null;
  status: "local" | "supabase" | "supabase_migrated" | null;
  onDismiss?: () => void;
}

export function PersistenceStatusBanner({
  isLoading,
  error,
  status,
  onDismiss,
}: PersistenceStatusBannerProps) {
  if (isLoading) {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-surface-border/80 bg-surface-card/80 px-4 py-3 text-sm text-slate-300">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" />
        <span>Loading portfolio data…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-accent-red/40 bg-accent-red/10 px-4 py-3 text-sm text-accent-red">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex-1">
          <p className="font-medium">Supabase sync error</p>
          <p className="mt-1 text-xs text-accent-red/90">{error}</p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-accent-red/80 hover:text-accent-red"
          >
            Dismiss
          </button>
        )}
      </div>
    );
  }

  if (status === "supabase_migrated") {
    return (
      <div className="mb-6 rounded-2xl border border-accent-green/30 bg-accent-green/10 px-4 py-3 text-sm text-accent-green">
        Local portfolio data was imported to Supabase. Cloud persistence is now active.
      </div>
    );
  }

  return null;
}
