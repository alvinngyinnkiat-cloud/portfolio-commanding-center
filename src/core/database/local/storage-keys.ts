/** localStorage keys — map 1:1 to future Supabase tables */
export const STORAGE_KEYS = {
  dashboardSettings: "portfolio:dashboard_settings",
  contributions: "portfolio:contributions",
  goals: "portfolio:goals",
  snapshots: "portfolio:snapshots",
  /** Legacy v1 blob — migrated on first load */
  legacy: "portfolio-dashboard-settings",
} as const;
