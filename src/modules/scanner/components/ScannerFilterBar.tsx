"use client";



import type {

  ScannerCategory,

  ScannerStrategy,

  ScannerTickerResult,

} from "@/core/domain/types/scanner";

import { SCANNER_CATEGORIES } from "@/core/calculations/scanner/watchlist";



export type StrategyFilter = "all" | ScannerStrategy;

export type CategoryFilter = "all" | ScannerCategory;

export type SystemFilter = "all" | "ema20" | "main";



interface ScannerFilterBarProps {

  strategyFilter: StrategyFilter;

  categoryFilter: CategoryFilter;

  systemFilter: SystemFilter;

  tradableOnly: boolean;

  onStrategyChange: (value: StrategyFilter) => void;

  onCategoryChange: (value: CategoryFilter) => void;

  onSystemChange: (value: SystemFilter) => void;

  onTradableOnlyChange: (value: boolean) => void;

}



const STRATEGY_OPTIONS: Array<{ value: StrategyFilter; label: string }> = [

  { value: "all", label: "Show All" },

  { value: "bullPut", label: "Sell Put" },

  { value: "bearCall", label: "Sell Call" },

  { value: "ironCondor", label: "Iron Condor" },

];



const SYSTEM_OPTIONS: Array<{ value: SystemFilter; label: string }> = [

  { value: "all", label: "All Systems" },

  { value: "ema20", label: "20 EMA System" },

  { value: "main", label: "Main System" },

];



const CATEGORY_OPTIONS: Array<{ value: CategoryFilter; label: string }> = [

  { value: "all", label: "All" },

  ...SCANNER_CATEGORIES.map((category) => ({

    value: category as CategoryFilter,

    label: category,

  })),

];



function FilterGroup<T extends string>({

  label,

  options,

  value,

  onChange,

}: {

  label: string;

  options: Array<{ value: T; label: string }>;

  value: T;

  onChange: (value: T) => void;

}) {

  return (

    <div className="flex flex-wrap items-center gap-2">

      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">

        {label}

      </span>

      {options.map((option) => {

        const active = option.value === value;

        return (

          <button

            key={option.value}

            type="button"

            onClick={() => onChange(option.value)}

            className={`rounded-xl px-3 py-2 text-sm font-medium transition-all ${

              active

                ? "bg-accent text-white shadow-md shadow-accent/20"

                : "border border-surface-border/80 bg-surface-card text-slate-400 hover:text-white"

            }`}

          >

            {option.label}

          </button>

        );

      })}

    </div>

  );

}



export function ScannerFilterBar({

  strategyFilter,

  categoryFilter,

  systemFilter,

  tradableOnly,

  onStrategyChange,

  onCategoryChange,

  onSystemChange,

  onTradableOnlyChange,

}: ScannerFilterBarProps) {

  return (

    <div className="space-y-3 rounded-2xl border border-surface-border/80 bg-surface-card/90 p-4 sm:p-5">

      <FilterGroup

        label="Strategy"

        options={STRATEGY_OPTIONS}

        value={strategyFilter}

        onChange={onStrategyChange}

      />

      <FilterGroup

        label="System"

        options={SYSTEM_OPTIONS}

        value={systemFilter}

        onChange={onSystemChange}

      />

      <FilterGroup

        label="Category"

        options={CATEGORY_OPTIONS}

        value={categoryFilter}

        onChange={onCategoryChange}

      />

      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-300">

        <input

          type="checkbox"

          checked={tradableOnly}

          onChange={(event) => onTradableOnlyChange(event.target.checked)}

          className="h-4 w-4 rounded accent-accent"

        />

        <span className="font-medium">Tradable Only</span>

      </label>

    </div>

  );

}



export function matchesFilters(

  strategyFilter: StrategyFilter,

  categoryFilter: CategoryFilter,

  systemFilter: SystemFilter,

  tradableOnly: boolean,

  result: ScannerTickerResult

): boolean {

  if (tradableOnly && !result.tradable) {

    return false;

  }



  if (categoryFilter !== "all" && result.category !== categoryFilter) {

    return false;

  }



  if (systemFilter === "ema20" && result.emaStrategy.output === "NO TRADE") {

    return false;

  }



  if (systemFilter === "main" && result.mainSystem.output === "NO TRADE") {

    return false;

  }



  if (strategyFilter === "all") {

    return true;

  }



  return result.strategies[strategyFilter].eligible;

}


