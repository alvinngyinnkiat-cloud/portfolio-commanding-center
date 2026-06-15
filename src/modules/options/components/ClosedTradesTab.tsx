"use client";

import { useMemo, useState } from "react";
import type { OptionsClosedTradeRow } from "@/core/domain/types/options";
import { formatDate, formatPercent, formatUsd } from "@/shared/lib/format";
import { Button } from "@/shared/components/ui/Button";
import { formatSignedPercent, plColorClass, closeMethodBadgeClass, closeMethodLabel } from "./options-utils";
import { usePortfolio } from "@/context/PortfolioContext";
import { EditClosedNotesModal, EditClosedTradeModal } from "./OptionsModals";

interface ClosedSectionSummary {
  closedCount: number;
  totalRealizedPlUsd: number;
  userRealizedPlUsd: number;
  clientRealizedPlUsd: number;
  winRatePercent: number;
}

function summarizeClosedSection(rows: OptionsClosedTradeRow[]): ClosedSectionSummary {
  let totalRealizedPlUsd = 0;
  let userRealizedPlUsd = 0;
  let clientRealizedPlUsd = 0;
  let wins = 0;

  for (const row of rows) {
    const realized = row.trade.realizedPlUsd ?? 0;
    totalRealizedPlUsd += realized;
    userRealizedPlUsd += row.userRealizedPlUsd;
    clientRealizedPlUsd += row.clientRealizedPlUsd;
    if (realized > 0) wins += 1;
  }

  return {
    closedCount: rows.length,
    totalRealizedPlUsd,
    userRealizedPlUsd,
    clientRealizedPlUsd,
    winRatePercent: rows.length > 0 ? (wins / rows.length) * 100 : 0,
  };
}

function SectionSummaryStrip({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div
      className={`grid gap-3 rounded-2xl border border-surface-border/80 bg-surface/40 p-4 sm:grid-cols-2 ${
        items.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
      }`}
    >
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function ClosedTradesTable({
  rows,
  variant,
  emptyMessage,
  onEdit,
  onNotes,
  onDelete,
}: {
  rows: OptionsClosedTradeRow[];
  variant: "personal" | "shared";
  emptyMessage: string;
  onEdit: (row: OptionsClosedTradeRow) => void;
  onNotes: (row: OptionsClosedTradeRow) => void;
  onDelete: (row: OptionsClosedTradeRow) => void;
}) {
  const showLegColumns = variant === "shared";

  return (
    <div className="overflow-x-auto rounded-2xl border border-surface-border/80">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-surface/60 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Underlying</th>
            <th className="px-4 py-3">Strategy</th>
            <th className="px-4 py-3">Opened</th>
            <th className="px-4 py-3">Closed</th>
            <th className="px-4 py-3">Close Method</th>
            <th className="px-4 py-3">Premium</th>
            <th className="px-4 py-3">Close cost</th>
            <th className="px-4 py-3">Realized</th>
            <th className="px-4 py-3">Return %</th>
            {showLegColumns && (
              <>
                <th className="px-4 py-3">Your P/L</th>
                <th className="px-4 py-3">Client P/L</th>
              </>
            )}
            <th className="px-4 py-3">Notes</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border/60">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={showLegColumns ? 13 : 11}
                className="px-4 py-8 text-center text-slate-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.trade.id} className="text-slate-300">
                <td className="px-4 py-3 font-medium text-white">{row.trade.underlying}</td>
                <td className="px-4 py-3">{row.strategyDisplay}</td>
                <td className="px-4 py-3">{formatDate(row.trade.openDate)}</td>
                <td className="px-4 py-3">
                  {row.trade.closeDate ? formatDate(row.trade.closeDate) : "—"} ({row.daysHeld}d)
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${closeMethodBadgeClass(row.trade.closeMethod)}`}
                  >
                    {closeMethodLabel(row.trade.closeMethod)}
                  </span>
                </td>
                <td className="px-4 py-3">{formatUsd(row.trade.openPremiumUsd)}</td>
                <td className="px-4 py-3">
                  {row.trade.closeMethod === "manual_pl"
                    ? "—"
                    : formatUsd(row.closeCostUsd)}
                </td>
                <td
                  className={`px-4 py-3 ${plColorClass(row.trade.realizedPlUsd ?? 0)}`}
                >
                  {formatUsd(row.trade.realizedPlUsd ?? 0)}
                </td>
                <td
                  className={`px-4 py-3 ${plColorClass(row.returnPercent ?? 0, row.returnPercent == null)}`}
                >
                  {row.returnPercent != null
                    ? formatSignedPercent(row.returnPercent, 1)
                    : "—"}
                </td>
                {showLegColumns && (
                  <>
                    <td className={`px-4 py-3 ${plColorClass(row.userRealizedPlUsd)}`}>
                      {formatUsd(row.userRealizedPlUsd)}
                    </td>
                    <td className={`px-4 py-3 ${plColorClass(row.clientRealizedPlUsd)}`}>
                      {formatUsd(row.clientRealizedPlUsd)}
                    </td>
                  </>
                )}
                <td className="max-w-[160px] truncate px-4 py-3 text-xs text-slate-500">
                  {row.trade.notes ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="ghost" onClick={() => onEdit(row)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => onNotes(row)}>
                      Notes
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => onDelete(row)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ClosedTradesTab() {
  const { optionsData, services, refresh } = usePortfolio();
  const [year, setYear] = useState<string>("all");
  const [notesRow, setNotesRow] = useState<OptionsClosedTradeRow | null>(null);
  const [editRow, setEditRow] = useState<OptionsClosedTradeRow | null>(null);
  const rows = optionsData?.closedRows ?? [];

  const years = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      const y = (row.trade.closeDate ?? "").slice(0, 4);
      if (y) set.add(y);
    }
    return [...set].sort().reverse();
  }, [rows]);

  const filtered = useMemo(() => {
    if (year === "all") return rows;
    return rows.filter((row) => (row.trade.closeDate ?? "").startsWith(year));
  }, [rows, year]);

  const personalRows = useMemo(
    () => filtered.filter((row) => row.trade.tradeType === "personal"),
    [filtered]
  );

  const sharedRows = useMemo(
    () => filtered.filter((row) => row.trade.tradeType === "shared"),
    [filtered]
  );

  const personalSummary = useMemo(
    () => summarizeClosedSection(personalRows),
    [personalRows]
  );

  const sharedSummary = useMemo(
    () => summarizeClosedSection(sharedRows),
    [sharedRows]
  );

  const handleDelete = (row: OptionsClosedTradeRow) => {
    const realized = row.trade.realizedPlUsd ?? 0;
    const message =
      `Delete closed trade ${row.trade.underlying}?\n\n` +
      `This removes ${formatUsd(realized)} from US Available Cash ` +
      `(full realized P/L, not split leg).`;

    if (!window.confirm(message)) return;

    const result = services.optionsTrades.deleteClosedTrade(row.trade.id);
    if (!result.ok) {
      window.alert(result.errors[0]?.message ?? "Delete failed");
      return;
    }
    refresh();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-slate-200"
        >
          <option value="all">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Personal Closed Trades</h2>
        <SectionSummaryStrip
          items={[
            {
              label: "Closed Trades",
              value: String(personalSummary.closedCount),
            },
            {
              label: "Realized P/L",
              value: formatUsd(personalSummary.totalRealizedPlUsd),
            },
            {
              label: "Win Rate",
              value: formatPercent(personalSummary.winRatePercent, 1),
            },
          ]}
        />
        <ClosedTradesTable
          rows={personalRows}
          variant="personal"
          emptyMessage="No personal closed trades."
          onEdit={setEditRow}
          onNotes={setNotesRow}
          onDelete={handleDelete}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Shared Closed Trades</h2>
        <SectionSummaryStrip
          items={[
            {
              label: "Closed Trades",
              value: String(sharedSummary.closedCount),
            },
            {
              label: "Total Realized P/L",
              value: formatUsd(sharedSummary.totalRealizedPlUsd),
            },
            {
              label: "Your Realized P/L",
              value: formatUsd(sharedSummary.userRealizedPlUsd),
            },
            {
              label: "Client Realized P/L",
              value: formatUsd(sharedSummary.clientRealizedPlUsd),
            },
          ]}
        />
        <ClosedTradesTable
          rows={sharedRows}
          variant="shared"
          emptyMessage="No shared closed trades."
          onEdit={setEditRow}
          onNotes={setNotesRow}
          onDelete={handleDelete}
        />
      </section>

      <p className="text-xs text-slate-500">
        Full realized P/L updates US Available Cash on close. Client P/L is reporting only.
        Deleting a closed trade reverses its full realized P/L from cash.
      </p>

      {editRow && (
        <EditClosedTradeModal trade={editRow.trade} onClose={() => setEditRow(null)} />
      )}
      {notesRow && (
        <EditClosedNotesModal trade={notesRow.trade} onClose={() => setNotesRow(null)} />
      )}
    </div>
  );
}
