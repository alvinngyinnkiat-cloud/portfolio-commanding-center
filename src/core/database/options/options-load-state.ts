export type OptionsTradesLoadState = {
  status: "loading" | "loaded" | "error";
  error: string | null;
  source: "supabase" | "local" | "local-merge" | "local-fallback" | null;
  supabaseCount: number;
  localCount: number;
  finalCount: number;
  recoveryRequired: boolean;
};

export const LOADING_OPTIONS_TRADES_STATE: OptionsTradesLoadState = {
  status: "loading",
  error: null,
  source: null,
  supabaseCount: 0,
  localCount: 0,
  finalCount: 0,
  recoveryRequired: false,
};
