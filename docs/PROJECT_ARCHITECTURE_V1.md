# Portfolio Command Center — Project Architecture V1

**Checkpoint date:** June 2026  
**Version:** 1.1  
**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · localStorage · Vitest

This document captures the frozen architecture at the point where Module 3 (Crypto Tracker) is integrated with the Dashboard as a read-only consumer. No functionality is defined here beyond what exists in code.

---

## 1. System Overview

Portfolio Command Center is a client-side portfolio management app organized into layered modules. Each tracker module owns its domain data and calculations. The Dashboard aggregates module outputs for a read-only overview.

### Module map

| Module | Route | Role |
|--------|-------|------|
| **Dashboard** | `/` | Read-only portfolio overview, charts, goal progress |
| **Crypto Tracker** (Module 3) | `/crypto` | Manual crypto valuations, cash deployment guide |
| **Stock Tracker** (Module 2) | `/stocks` | Transaction ledger, derived holdings, auto prices |
| **Settings** | `/settings` | FX rate, contributions, goals, snapshots, client portfolio |

**Navigation order:** Dashboard → Crypto → Stocks → Settings

### Layered architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Routes (thin)          src/app/                            │
├─────────────────────────────────────────────────────────────┤
│  Feature UI             src/modules/{dashboard,crypto,stocks}│
├─────────────────────────────────────────────────────────────┤
│  Global state           src/context/PortfolioContext.tsx    │
├─────────────────────────────────────────────────────────────┤
│  Services               src/core/services/                  │
├─────────────────────────────────────────────────────────────┤
│  Adapters               src/core/adapters/                  │
├─────────────────────────────────────────────────────────────┤
│  Calculations (pure)    src/core/calculations/              │
├─────────────────────────────────────────────────────────────┤
│  Domain types           src/core/domain/types/              │
├─────────────────────────────────────────────────────────────┤
│  Repositories           src/core/database/                  │
│    interfaces           repositories/                       │
│    localStorage impl    local/                              │
├─────────────────────────────────────────────────────────────┤
│  Shared UI / utils      src/shared/                         │
└─────────────────────────────────────────────────────────────┘
```

**Pattern:** Repository → Service → Context → Module UI. Calculations remain pure and unit-tested.

---

## 2. Dashboard Architecture (Module 1)

**Version:** 1.1  
**Status:** FROZEN

### Purpose

Read-only portfolio overview. All editing happens in Settings or tracker modules. The Dashboard never owns authoritative asset data. Consumes Module 2 and Module 3 capital-model outputs via adapters — no independent recalculation.

### Key files

| Path | Role |
|------|------|
| `src/app/page.tsx` | Route entry |
| `src/modules/dashboard/components/DashboardView.tsx` | Main dashboard UI |
| `src/modules/dashboard/components/AssetAllocationChart.tsx` | Pie chart |
| `src/modules/dashboard/components/DailyPortfolioChart.tsx` | Snapshot time series |
| `src/modules/dashboard/components/MonthlyContributionChart.tsx` | Contribution history |
| `src/modules/dashboard/components/GoalProgressCards.tsx` | Goal progress |
| `src/modules/dashboard/components/OverdeploymentAlert.tsx` | USD overdeployment warning |
| `src/modules/dashboard/settings/SettingsView.tsx` | Settings shell (tabs) |
| `src/modules/dashboard/settings/ManualValuesSettings.tsx` | FX + read-only module values |
| `src/modules/dashboard/settings/ContributionTransactionsTable.tsx` | Contribution CRUD |
| `src/modules/dashboard/settings/GoalsTable.tsx` | Goal CRUD |
| `src/modules/dashboard/settings/DailySnapshotTrigger.tsx` | Snapshot capture |
| `src/core/services/portfolio-aggregator.ts` | Aggregates all inputs → metrics |
| `src/core/calculations/portfolio.ts` | Portfolio metric formulas |
| `src/core/calculations/allocation.ts` | Asset allocation buckets |
| `src/core/calculations/snapshots.ts` | Daily snapshot creation |

### Data flow

```
PortfolioContext.refresh()
  └─ PortfolioAggregator.getDashboardData()
       ├─ buildInputs()        ← module adapters + settings + contributions
       ├─ calculatePortfolioMetrics()
       ├─ calculateAssetAllocation()
       └─ calculateGoalProgress()
  └─ DashboardView reads `data` via usePortfolio()
```

### Dashboard sections

1. **Portfolio Ownership** — Total Portfolio Value, Client Portfolio, Client Ownership %
2. **Performance & Contributions** — Total P/L, Total P/L %, Total Contribution (Stock + Crypto)
3. **Asset Breakdown** — Stock Value, Crypto Value, Stock Available Trading Cash, Crypto Available Trading Cash
4. **Charts** — Allocation (Stocks + Crypto), daily worth, monthly contributions
5. **Goal Progress** — Active goal cards (tracked against Total Portfolio Value)

### FX gate

If `usdSgdFxRate` is invalid, the Dashboard suppresses metrics and allocation. Only the FX error banner and daily snapshot chart are shown.

### Read-only contract

- Dashboard header: *"Read-only overview · All values in SGD · Edit in Settings"*
- No crypto management UI (no tables, forms, allocation guide, or edit/delete)
- Stock and crypto values in Settings are read-only, sourced from their respective modules

### Portfolio formulas (Dashboard v1.1)

| Metric | Formula | Source |
|--------|---------|--------|
| **Total Portfolio Value** | Total Stock Value + Total Crypto Value | Module 2 + 3 adapters |
| **Total Contribution** | Stock Contribution + Crypto Contribution | Module 2 + 3 adapters |
| **Total P/L** | Stock P/L + Crypto P/L | Module 2 + 3 adapters |
| **Stock Value** | Module 2 `totalStockValueSgd` | `deriveDashboardStockOutputs()` |
| **Crypto Value** | Module 3 `cryptoTotalValueSgd` | `deriveDashboardCryptoOutputs()` |
| **Stock Available Trading Cash** | Module 2 `availableTradingCashSgd` | `deriveDashboardStockOutputs()` |
| **Crypto Available Trading Cash** | Module 3 `availableTradingCashSgd` | `deriveDashboardCryptoOutputs()` |
| **Asset Allocation — Stocks** | Total Stock Value | Module 2 adapter |
| **Asset Allocation — Crypto** | Total Crypto Value | Module 3 adapter |
| **Client Ownership %** | Client Portfolio ÷ (Total Portfolio Value + Client Portfolio) | Settings + aggregator |

---

## 3. Crypto Tracker Architecture (Module 3)

**Version:** 1.1  
**Status:** FROZEN

### Purpose

Track crypto cash contributed, invested amounts, and manually entered current values. No API price feeds, no quantity tracking, no auto-refresh.

### Key files

| Path | Role |
|------|------|
| `src/app/crypto/page.tsx` | Route entry |
| `src/modules/crypto/components/CryptoView.tsx` | Page shell |
| `src/modules/crypto/components/CryptoHoldingsTable.tsx` | Summary cards, deployment guide, table, CRUD form |
| `src/core/services/crypto-tracker-service.ts` | Orchestration |
| `src/core/services/crypto-holding-service.ts` | Holding CRUD |
| `src/core/services/crypto-allocation-service.ts` | Allocation % persistence |
| `src/core/calculations/crypto/summary.ts` | Total Value, P/L, cash |
| `src/core/calculations/crypto/holdings.ts` | Rank, category, portfolio % |
| `src/core/calculations/crypto/allocation.ts` | Cash deployment buckets |
| `src/core/calculations/crypto/contributions.ts` | Net crypto cash contributed |
| `src/core/calculations/crypto/validation.ts` | Form validation |
| `src/core/adapters/dashboard-crypto-adapter.ts` | Module 3 → Dashboard outputs |
| `src/core/domain/types/crypto.ts` | Domain types |

### Data model

**Stored (source of truth):**

```typescript
CryptoHolding {
  id, assetName, investedSgd, currentValueSgd, notes?
}

CryptoAllocationSettings {
  topHolding: 50,      // default %
  secondToFifth: 25,
  sixthToTenth: 15,
  others: 10
}
```

**Derived (never stored authoritatively):**

- `CryptoHoldingRow` — rank, category, P/L, portfolio %
- `CryptoTrackerSummary` — totals and counts
- `DashboardCryptoOutputs` — adapter payload for Dashboard

### Summary card formulas

| Card | Formula |
|------|---------|
| **Total Holdings** | Sum of `currentValueSgd` |
| **Crypto Cash** | Total Crypto Cash Contributed − Total Invested SGD |
| **Total Value** | Total Holdings + Crypto Cash |

### Holding table

- Sorted by `currentValueSgd` descending
- Categories by rank: #1 Top Holding · #2–5 · #6–10 · #11+ Others
- P/L SGD = Current Value − Invested
- P/L % = P/L ÷ Invested × 100
- Portfolio % = Current Value ÷ Total Holdings × 100 (excludes crypto cash)

### Cash deployment guide

- Editable allocation percentages (must total 100%)
- Allocation Amount = Crypto Cash × Allocation %
- Warning shown when total ≠ 100%

### Persistence

| Key | Content |
|-----|---------|
| `portfolio:crypto_holdings` | `CryptoHolding[]` |
| `portfolio:crypto_allocation_settings` | `CryptoAllocationSettings` |

### Dashboard integration

`deriveDashboardCryptoOutputs()` maps summary to:

- `cryptoTotalValueSgd` → Dashboard Crypto Value
- `cryptoHoldingsValueSgd`, `cryptoContributionSgd`, `cryptoProfitLossSgd`, `availableTradingCashSgd` → Dashboard metrics (v1.1)
- `numberOfHoldings` → Dashboard holdings count display

---

## 4. Stock Tracker Architecture (Module 2)

**Version:** 1.1  
**Status:** FROZEN

### Purpose

Transaction-ledger stock tracker. Holdings are derived from buy/sell/dividend/fee records. Supports auto price updates (Yahoo Finance) and manual price overrides. Capital metrics align with Module 3: contribution = capital deployed into holdings only.

### Key files

| Path | Role |
|------|------|
| `src/app/stocks/page.tsx` | Route entry |
| `src/modules/stocks/components/StocksView.tsx` | Page shell (tabs) |
| `src/modules/stocks/components/StockHoldingsTable.tsx` | Summary cards + holdings table |
| `src/modules/stocks/components/StockTransactionsTable.tsx` | Transaction ledger CRUD |
| `src/core/services/stock-tracker-service.ts` | Holdings orchestration |
| `src/core/services/stock-transaction-service.ts` | Transaction CRUD + validation |
| `src/core/services/stock-price-update-service.ts` | Scheduled price fetches |
| `src/core/services/yahoo-finance-provider.ts` | Yahoo quote parsing |
| `src/app/api/stock-prices/route.ts` | Server-side quote proxy |
| `src/core/calculations/stocks/holdings.ts` | WAC ledger → positions |
| `src/core/calculations/stocks/contribution.ts` | Stock Contribution (buy + fees) |
| `src/core/calculations/stocks/contributions.ts` | Net stock cash (deposits − withdrawals) |
| `src/core/calculations/stocks/summary.ts` | Portfolio summary aggregation |
| `src/core/calculations/stocks/trading-cash.ts` | Available Trading Cash |
| `src/core/calculations/stocks/price-normalize.ts` | Effective price resolution |
| `src/core/calculations/stocks/price-schedule.ts` | US 6AM / SG 6PM SGT schedule |
| `src/core/adapters/dashboard-stock-adapter.ts` | Module 2 → Dashboard outputs |
| `src/core/domain/types/stock.ts` | Domain types |

### Data model

**Stored (source of truth):**

```typescript
StockTransaction   // Immutable ledger row (buy, sell, dividend, fee)
StockInstrument    // Ticker metadata registry
StockPrice         // Latest/manual price per (market, ticker)
StockPriceScheduleState  // Last update timestamps per market
```

**Derived (never stored authoritatively):**

- `CalculatedHolding` — quantity, avg cost, market value, P/L, SGD value
- `StockTrackerSummary` — capital-model totals
- `DashboardStockOutputs` — adapter payload for Dashboard

### Capital model formulas (v1.1)

| Metric | Formula |
|--------|---------|
| **Stock Contribution** | Σ (buy `grossAmount` + `fees`) per ledger — US leg converted to SGD |
| **Available Trading Cash** | (Stock Deposits − Stock Withdrawals) − Stock Contribution |
| **Stock Holdings Value** | Current market value of open holdings (SGD) |
| **Stock P/L** | Stock Holdings Value − Stock Contribution |
| **Total Stock Value** | Stock Holdings Value + Available Trading Cash |

Stock Contribution excludes market gains/losses, dividends, FX gains, and unrealised gains. It represents capital deployed into holdings only.

Per-market US/SG legs split net stock cash by deposit allocation % and contribution by transaction market.

### Holdings derivation

```
StockTransaction[] + StockPrice[] + FX rate
  └─ calculateHoldings()  (WAC ledger math)
       └─ CalculatedHolding[]
            └─ summarizeStockHoldings()
                 ├─ deriveDashboardStockValues()
                 └─ buildStockTrackerSummary()
                      └─ deriveDashboardStockOutputs()
```

### Price updates

- **Auto:** Yahoo Finance via `/api/stock-prices` (US 6:00 AM SGT, SG 6:00 PM SGT)
- **Manual:** Per-row override in holdings table
- **Poll:** Client-side 60s interval in `PortfolioContext` while app is open

### Persistence

| Key | Content |
|-----|---------|
| `portfolio:stock_transactions` | `StockTransaction[]` |
| `portfolio:stock_instruments` | `StockInstrument[]` |
| `portfolio:stock_prices` | `StockPrice[]` |
| `portfolio:stock_price_schedule` | `StockPriceScheduleState` |

### Dashboard integration

`deriveDashboardStockValues()` maps holdings to:

- `usStocksEtfUsd` / `usStocksEtfSgd` — US market value
- `sgStocksSgd` — SG market value

`deriveDashboardStockOutputs()` maps `StockTrackerSummary` to prepared outputs (Dashboard UI not yet wired):

- `stockHoldingsValueSgd`
- `stockContributionSgd`
- `stockProfitLossSgd`
- `availableTradingCashSgd`
- `totalStockValueSgd`

`PortfolioAggregator` consumes Module 2 contribution via `buildDashboardStockSummary()` + `deriveDashboardStockOutputs()` for `totalStockContributionSgd` / US/SG legs in portfolio metrics.

---

## 5. Shared Data Flow

### Service factory

`createPortfolioServices()` in `src/core/services/index.ts` wires all repositories and services once per app session.

```
createLocalRepositories()
  ├─ contributions, goals, snapshots, dashboardSettings
  ├─ stockTransactions, stockInstruments, stockPrices, stockPriceSchedule
  └─ cryptoHoldings, cryptoAllocation

Services
  ├─ stockTracker        ← transactions + prices + FX
  ├─ cryptoTracker       ← holdings + allocation + contributions
  ├─ aggregator          ← stockTracker + cryptoTracker + settings + contributions
  ├─ snapshots           ← aggregator (for capture)
  ├─ stockPriceUpdates   ← scheduled fetches
  └─ CRUD services       ← contributions, goals, holdings, transactions, etc.
```

### PortfolioContext

Single React context at app root (`src/app/layout.tsx`).

```typescript
interface PortfolioContextValue {
  data: PortfolioDashboardData | null;   // Dashboard aggregate
  stockData: StockTrackerData | null;    // Module 2 raw + derived
  cryptoData: CryptoTrackerData | null;  // Module 3 raw + derived
  services: PortfolioServices;           // All service instances
  refresh: () => void;                   // Reload all three data streams
  isLoaded: boolean;
}
```

**`refresh()`** is called after any mutation (add/edit/delete in any module or settings). This keeps Dashboard, Stock, and Crypto views in sync.

### Background jobs (client-side)

| Job | Interval | Service |
|-----|----------|---------|
| End-of-day snapshot | 60s poll | `SnapshotService.captureEndOfDayIfDue()` |
| Stock price updates | 60s poll | `StockPriceUpdateService.updateAllDuePrices()` |

### Adapter pattern (module → Dashboard)

Modules never write to Dashboard storage. Adapters translate module summaries into Dashboard input fields:

```
Module 2  ── deriveDashboardStockValues()  ──►  PortfolioInputs.usStocksEtf*
Module 3  ── deriveDashboardCryptoOutputs() ──►  PortfolioInputs.cryptoSgd
                                                    PortfolioInputs.cryptoHoldingCount
Settings  ── manual.clientPortfolioUsd     ──►  PortfolioInputs.clientPortfolio*
Contributions ── calculateCashBalances()   ──►  PortfolioInputs.*Cash*
```

`PortfolioAggregator.buildInputs()` assembles `PortfolioInputs`, then `calculatePortfolioMetrics()` produces `PortfolioMetrics` for the Dashboard.

### Persistence mechanism

- **Storage:** Browser `localStorage` via JSON (`readJson` / `writeJson`)
- **Keys:** `src/core/database/local/storage-keys.ts` (1:1 mapped to future Supabase tables)
- **Migration:** `migrate-legacy.ts` runs on first load to split legacy v1 blob
- **SSR-safe:** All reads return fallbacks when `window` is undefined

---

## 6. Source of Truth by Domain

| Domain | Source of Truth | Owned By | Consumed By |
|--------|-----------------|----------|-------------|
| **US/SG stock positions** | `StockTransaction[]` ledger | Module 2 (Stocks) | Dashboard (via adapter) |
| **Stock prices** | `StockPrice[]` (auto + manual) | Module 2 (Stocks) | Module 2 holdings derivation |
| **Stock market values** | Derived `CalculatedHolding[]` | Module 2 (calculated) | Dashboard, snapshots |
| **Crypto holdings** | `CryptoHolding[]` (invested + current value) | Module 3 (Crypto) | Dashboard (via adapter) |
| **Crypto allocation %** | `CryptoAllocationSettings` | Module 3 (Crypto) | Module 3 UI only |
| **Crypto totals** | Derived `CryptoTrackerSummary` | Module 3 (calculated) | Dashboard, Settings (read-only) |
| **Crypto cash contributed** | `ContributionTransaction[]` where `category = "crypto"` | Settings (Contributions) | Module 3 cash calculation |
| **Trading cash balances** | `ContributionTransaction[]` (all categories) | Settings (Contributions) | Dashboard metrics |
| **FX rate** | `DashboardSettings.usdSgdFxRate` | Settings | App-wide (stocks, cash, client portfolio) |
| **Client portfolio** | `DashboardSettings.manualValues.clientPortfolioUsd` | Settings | Dashboard (until Client module exists) |
| **Goals** | `Goal[]` | Settings | Dashboard goal progress |
| **Daily snapshots** | `DailySnapshot[]` | Settings (capture) | Dashboard daily chart |
| **Portfolio metrics** | Derived `PortfolioMetrics` | Dashboard aggregator (calculated) | Dashboard UI, snapshots |
| **Asset allocation** | Derived from `PortfolioMetrics` | Dashboard (calculated) | Dashboard chart |

### What is NOT a source of truth

| Item | Status |
|------|--------|
| `manualValues.cryptoSgd` in settings storage | **Deprecated** — legacy field retained in storage but not used by Dashboard |
| `manualValues.usStocksEtfUsd` / `sgStocksSgd` | **Deprecated** — legacy fields, not used by Dashboard |
| Dashboard crypto calculations | **Removed** — Dashboard consumes Module 3 adapter output only |
| Coin quantity / price APIs for crypto | **Not implemented** — by design |

---

## 7. Directory Reference

```
src/
├── app/
│   ├── page.tsx                    # Dashboard route
│   ├── crypto/page.tsx             # Crypto Tracker route
│   ├── stocks/page.tsx             # Stock Tracker route
│   ├── settings/page.tsx           # Settings route
│   ├── api/stock-prices/route.ts   # Yahoo quote proxy
│   └── layout.tsx                  # Root layout + PortfolioProvider
├── context/
│   └── PortfolioContext.tsx        # Global state
├── modules/
│   ├── dashboard/                  # Module 1 UI + settings
│   ├── crypto/                     # Module 3 UI
│   └── stocks/                     # Module 2 UI
├── core/
│   ├── adapters/                   # Module → Dashboard bridges
│   ├── calculations/               # Pure functions
│   ├── database/                   # Repository interfaces + localStorage
│   ├── domain/                     # Types, defaults, normalizers
│   └── services/                   # Orchestration layer
└── shared/
    ├── components/                 # Reusable UI (SummaryCard, Input, etc.)
    └── lib/                        # format, date helpers
```

---

## 8. Future Modules (not yet built)

Per the project roadmap, these modules are planned but not implemented:

| Module | Status |
|--------|--------|
| Scanner | Not built |
| Options Tracker | Not built |
| Client Portfolio module | Placeholder (manual USD in Settings) |

When built, each should follow the same pattern: own storage → service → calculations → adapter → Dashboard consumption.

---

## 9. Checkpoint Summary

At V1:

- **Dashboard** is read-only and aggregates module outputs via `PortfolioAggregator`
- **Module 2 (Stocks)** owns the transaction ledger and price feeds; Dashboard reads stock values through `dashboard-stock-adapter`
- **Module 3 (Crypto)** owns manual crypto holdings and allocation settings; Dashboard reads crypto value and holdings count through `dashboard-crypto-adapter`
- **Settings** owns FX rate, contributions, goals, snapshots, and client portfolio placeholder
- All modules share state through `PortfolioContext.refresh()` after mutations
- All persistence is localStorage, structured for future Supabase migration
