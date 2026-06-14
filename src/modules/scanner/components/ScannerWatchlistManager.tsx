"use client";

import { useMemo, useState } from "react";
import type { ScannerCategory } from "@/core/domain/types/scanner";
import type { WatchlistEntry } from "@/core/calculations/scanner/watchlist";
import { SCANNER_CATEGORIES } from "@/core/calculations/scanner/watchlist";
import { usePortfolio } from "@/context/PortfolioContext";
import { Plus, RotateCcw, Save, Trash2 } from "lucide-react";

export function ScannerWatchlistManager() {
  const { services, refresh } = usePortfolio();
  const [entries, setEntries] = useState<WatchlistEntry[]>(() =>
    services.scannerWatchlist.getWatchlist()
  );
  const [newTicker, setNewTicker] = useState("");
  const [newCategory, setNewCategory] = useState<ScannerCategory>("Custom");
  const [saved, setSaved] = useState(false);

  const activeCount = useMemo(
    () => entries.filter((row) => row.active).length,
    [entries]
  );

  const syncEntries = (next: WatchlistEntry[]) => {
    setEntries(next);
    setSaved(false);
  };

  const handleSave = () => {
    services.scannerWatchlist.saveWatchlist(entries);
    refresh();
    setSaved(true);
  };

  const handleReset = () => {
    services.scannerWatchlist.resetToDefault();
    const next = services.scannerWatchlist.getWatchlist();
    syncEntries(next);
    refresh();
    setSaved(true);
  };

  const handleAdd = () => {
    const ticker = newTicker.trim().toUpperCase();
    if (!ticker) {
      return;
    }
    if (entries.some((row) => row.ticker === ticker)) {
      return;
    }
    syncEntries([
      ...entries,
      {
        ticker,
        fetchSymbol: ticker,
        category: newCategory,
        market: "US",
        active: true,
      },
    ]);
    setNewTicker("");
  };

  const handleRemove = (ticker: string) => {
    syncEntries(entries.filter((row) => row.ticker !== ticker));
  };

  const updateRow = (
    ticker: string,
    patch: Partial<Pick<WatchlistEntry, "category" | "active" | "fetchSymbol">>
  ) => {
    syncEntries(
      entries.map((row) =>
        row.ticker === ticker
          ? {
              ...row,
              ...patch,
              fetchSymbol: patch.fetchSymbol?.trim() || row.fetchSymbol,
            }
          : row
      )
    );
  };

  return (
    <div className="space-y-4 rounded-2xl border border-surface-border/80 bg-surface-card/90 p-4 sm:p-6">
      <p className="text-sm text-slate-500">
        {activeCount} active · {entries.length} total tickers
      </p>
        <div className="overflow-x-auto rounded-xl border border-surface-border/70">
          <table className="min-w-full text-sm">
            <thead className="bg-surface/50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Ticker</th>
                <th className="px-3 py-2 font-medium">Fetch Symbol</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Active</th>
                <th className="px-3 py-2 font-medium">Delete</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((row) => (
                <tr
                  key={row.ticker}
                  className="border-t border-surface-border/50"
                >
                  <td className="px-3 py-2 font-semibold text-white">
                    {row.ticker}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={row.fetchSymbol}
                      onChange={(event) =>
                        updateRow(row.ticker, {
                          fetchSymbol: event.target.value,
                        })
                      }
                      className="w-full min-w-[88px] rounded-lg border border-surface-border/80 bg-surface/40 px-2 py-1 text-slate-200"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={row.category}
                      onChange={(event) =>
                        updateRow(row.ticker, {
                          category: event.target.value as ScannerCategory,
                        })
                      }
                      className="w-full min-w-[120px] rounded-lg border border-surface-border/80 bg-surface/40 px-2 py-1 text-slate-200"
                    >
                      {SCANNER_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={row.active}
                      onChange={(event) =>
                        updateRow(row.ticker, { active: event.target.checked })
                      }
                      className="h-4 w-4 accent-accent"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => handleRemove(row.ticker)}
                      className="inline-flex items-center rounded-lg border border-surface-border/80 px-2 py-1 text-slate-400 hover:text-accent-red"
                      aria-label={`Remove ${row.ticker}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-slate-500">
              Add Ticker
            </span>
            <input
              type="text"
              value={newTicker}
              onChange={(event) => setNewTicker(event.target.value.toUpperCase())}
              placeholder="e.g. AAPL"
              className="block w-32 rounded-lg border border-surface-border/80 bg-surface/40 px-3 py-2 text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-slate-500">
              Category
            </span>
            <select
              value={newCategory}
              onChange={(event) =>
                setNewCategory(event.target.value as ScannerCategory)
              }
              className="block rounded-lg border border-surface-border/80 bg-surface/40 px-3 py-2 text-slate-200"
            >
              {SCANNER_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-2 rounded-xl border border-surface-border/80 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-surface/60"
          >
            <Plus size={14} />
            Add
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-md shadow-accent/20"
          >
            <Save size={14} />
            Save
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-xl border border-surface-border/80 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-surface/60"
          >
            <RotateCcw size={14} />
            Reset Defaults
          </button>
          {saved && (
            <span className="text-sm text-accent-green">Watchlist saved</span>
          )}
        </div>
    </div>
  );
}
