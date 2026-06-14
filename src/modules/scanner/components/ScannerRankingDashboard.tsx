"use client";



import type { ScannerRankedEntry } from "@/core/domain/types/scanner";

import { STRATEGY_OUTPUT_LABELS } from "@/core/domain/types/scanner";

import { Card } from "@/shared/components/ui/Card";



interface RankingTableProps {

  title: string;

  entries: ScannerRankedEntry[];

}



function RankingTable({ title, entries }: RankingTableProps) {

  return (

    <Card title={title} noPadding>

      <div className="overflow-hidden">

        <table className="w-full text-sm">

          <thead>

            <tr className="border-b border-surface-border/60 text-left text-xs uppercase tracking-wide text-slate-500">

              <th className="px-4 py-3">Ticker</th>

              <th className="px-4 py-3">Category</th>

              <th className="px-4 py-3">Strategy</th>

              <th className="px-4 py-3">Key Reason</th>

            </tr>

          </thead>

          <tbody>

            {entries.length === 0 ? (

              <tr>

                <td

                  colSpan={4}

                  className="px-4 py-6 text-center text-slate-500"

                >

                  No eligible opportunities today

                </td>

              </tr>

            ) : (

              entries.map((entry) => (

                <tr

                  key={entry.ticker}

                  className="border-b border-surface-border/40 last:border-0"

                >

                  <td className="px-4 py-3 font-medium text-white">

                    {entry.ticker}

                  </td>

                  <td className="px-4 py-3 text-slate-400">{entry.category}</td>

                  <td className="px-4 py-3 text-slate-300">

                    {STRATEGY_OUTPUT_LABELS[entry.strategy]}

                  </td>

                  <td className="px-4 py-3 text-slate-400">{entry.keyReason}</td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

    </Card>

  );

}



interface ScannerRankingDashboardProps {

  bullPut: ScannerRankedEntry[];

  bearCall: ScannerRankedEntry[];

  ironCondor: ScannerRankedEntry[];

}



export function ScannerRankingDashboard({

  bullPut,

  bearCall,

  ironCondor,

}: ScannerRankingDashboardProps) {

  return (

    <div className="grid gap-4 xl:grid-cols-3">

      <RankingTable title="Top 5 Sell Put Candidates" entries={bullPut} />

      <RankingTable title="Top 5 Sell Call Candidates" entries={bearCall} />

      <RankingTable title="Top 5 Iron Condor Candidates" entries={ironCondor} />

    </div>

  );

}


