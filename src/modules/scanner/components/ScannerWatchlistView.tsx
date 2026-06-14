"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ScannerWatchlistManager } from "./ScannerWatchlistManager";

export function ScannerWatchlistView() {
  return (
    <div className="space-y-6 overflow-x-hidden pb-8">
      <header className="space-y-3">
        <Link
          href="/scanner"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to Scanner
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Watchlist Management
          </h1>
          <p className="text-sm text-slate-500">
            Monthly watchlist configuration · Scanner scans active tickers only
          </p>
        </div>
      </header>

      <ScannerWatchlistManager />
    </div>
  );
}
