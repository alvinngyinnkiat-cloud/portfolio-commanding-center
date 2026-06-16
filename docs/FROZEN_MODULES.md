# Frozen Modules

**Status:** FROZEN  
**Checkpoint:** V1.1 — June 2026

The three modules below are locked. Their architecture, source-of-truth rules, and read/write boundaries must not be changed without an explicit unfreeze decision.

Modules not listed here (Settings, Scanner, etc.) are not frozen by this document. **Options Tracker (Module 5)** is frozen in §4 below.

---

## 1. Dashboard (Module 1)

**Route:** `/`  
**Version:** 1.1  
**Status:** FROZEN

### Purpose

Read-only portfolio overview. Aggregates values from tracker modules and Settings into a single view showing ownership, performance, asset breakdown, charts, and goal progress. The Dashboard does not own asset data and does not provide editing for stocks or crypto.

### Source of truth

| Data | Source |
|------|--------|
| Total Stock Value | Module 2 `totalStockValueSgd` via `deriveDashboardStockOutputs()` |
| Stock Holdings Value | Module 2 `stockHoldingsValueSgd` via `deriveDashboardStockOutputs()` |
| Stock Contribution | Module 2 `stockContributionSgd` via `deriveDashboardStockOutputs()` |
| Stock P/L | Module 2 `stockProfitLossSgd` via `deriveDashboardStockOutputs()` |
| Stock Available Trading Cash | Module 2 `availableTradingCashSgd` via `deriveDashboardStockOutputs()` |
| Total Crypto Value | Module 3 `cryptoTotalValueSgd` via `deriveDashboardCryptoOutputs()` |
| Crypto Holdings Value | Module 3 `cryptoHoldingsValueSgd` via `deriveDashboardCryptoOutputs()` |
| Crypto Contribution | Module 3 `cryptoContributionSgd` via `deriveDashboardCryptoOutputs()` |
| Crypto P/L | Module 3 `cryptoProfitLossSgd` via `deriveDashboardCryptoOutputs()` |
| Crypto Available Trading Cash | Module 3 `availableTradingCashSgd` via `deriveDashboardCryptoOutputs()` |
| Crypto holdings count | Module 3 `numberOfHoldings` via `deriveDashboardCryptoOutputs()` |
| FX rate | `DashboardSettings.usdSgdFxRate` (Settings) |
| Client portfolio | `DashboardSettings.manualValues.clientPortfolioUsd` (Settings) |
| Goals | `Goal[]` (Settings) |
| Daily snapshots | `DailySnapshot[]` (Settings capture) |
| Portfolio metrics | `PortfolioAggregator` sums module adapter outputs only |

The Dashboard never recalculates stock or crypto capital-model totals. It consumes Module 2 and Module 3 adapter outputs only.

### Portfolio formulas (v1.1)

| Metric | Formula |
|--------|---------|
| **Total Portfolio Value** | Total Stock Value + Total Crypto Value |
| **Total Contribution** | Stock Contribution + Crypto Contribution |
| **Total P/L** | Stock P/L + Crypto P/L |
| **Asset Allocation — Stocks** | Total Stock Value |
| **Asset Allocation — Crypto** | Total Crypto Value |

### Allowed changes

- Bug fixes that restore documented behaviour
- Display-only additions that read existing adapter/aggregator outputs (e.g. new read-only summary line sourced from `metrics`)
- Copy, label, or styling tweaks that do not change data flow
- Wiring in future modules via new adapters (without altering frozen module internals)
- Chart rendering fixes that do not change underlying metric formulas

### Forbidden changes

- Redesigning Dashboard layout or section structure
- Adding crypto management UI (holdings table, add/edit/delete, allocation guide, deployment buckets)
- Adding stock transaction or holdings editing UI
- Storing or editing asset values directly on the Dashboard
- Using manual `cryptoSgd` or other hardcoded crypto values instead of Module 3
- Recalculating crypto totals independently of Module 3
- Changing portfolio formulas (v1.1 capital model) without a spec revision:
  - Total Portfolio Value = Total Stock Value + Total Crypto Value
  - Total Contribution = Stock Contribution + Crypto Contribution
  - Total P/L = Stock P/L + Crypto P/L
- Recalculating stock or crypto totals independently of module adapters
- Making the Dashboard page writable for stocks or crypto
- Modifying `PortfolioAggregator` to bypass module adapters for stock or crypto values

---

## 2. Crypto Tracker (Module 3)

**Route:** `/crypto`  
**Version:** 1.2  
**Status:** FROZEN

### Purpose

Track net personal capital committed to crypto (deposits − withdrawals), current holding values (manual input), remaining crypto cash after purchases and fees, total crypto net value, overall P/L versus capital injected, and asset allocation guidance. This is not a trading journal, tax tracker, or price feed.

### Source of truth

| Data | Source |
|------|--------|
| Holdings | `CryptoHolding[]` in `portfolio:crypto_holdings` |
| Per-holding invested amount | `CryptoHolding.investedSgd` (from trades or user input) |
| Per-holding current value | `CryptoHolding.currentValueSgd` (manual input) |
| Trades | `CryptoTrade[]` in `portfolio:crypto_trades` |
| Allocation percentages | `CryptoAllocationSettings` in `portfolio:crypto_allocation_settings` |
| **Contribution** | Net crypto-category contribution transactions (deposits − withdrawals) |
| **Total Holdings** | Sum of `currentValueSgd` (derived) |
| **Crypto Cash** | Contribution − buy transactions; sell proceeds add back (derived). Fees excluded. |
| **Total Crypto Net Value** | Total Holdings + Crypto Cash (derived) |
| **Profit & Loss** | Total Crypto Net Value − Contribution (derived) |
| **Fees Paid** | Sum of all crypto trade fees (display only — not in Crypto Cash or P/L) |
| Rank, category, holding P/L, portfolio % | Derived at read time — never stored |

### Summary cards (Overview tab)

**Row 1:** Total Crypto Net Value · Total Holdings · Crypto Cash  
**Row 2:** Profit & Loss · Contribution · Fees Paid

Warning when Crypto Cash &lt; 0: *"Crypto Cash is negative. Check deposits, withdrawals, buys, or fees."*

### Allowed changes

- Bug fixes that restore documented formulas or CRUD behaviour
- Copy, label, or styling tweaks within the existing page structure
- Empty-state or validation message improvements
- Test additions for existing behaviour

### Forbidden changes

- API price feeds or auto-refresh of coin prices
- Coin quantity tracking
- Average cost, FIFO, or realised/unrealised P/L separation at account level
- Tax tracking features
- Removing or restructuring the six summary cards on the Overview tab
- Removing the Cash Deployment Guide or its editable allocation percentages
- Removing holdings table columns (Rank, Category, Asset, Invested, Current Value, P/L, Portfolio %)
- Removing create, edit, or delete holding functionality
- Changing core formulas:
  - Contribution = Crypto Deposits − Crypto Withdrawals (excludes market gains/losses/rewards)
  - Total Holdings = Sum of `currentValueSgd`
  - Crypto Cash = Contribution − Total Buy Transactions (fees excluded; sell proceeds add back when ledger present)
  - Total Crypto Net Value = Total Holdings + Crypto Cash
  - Profit & Loss = Total Crypto Net Value − Contribution
  - Fees Paid = Sum of all crypto fees (display only; not in Crypto Cash or P/L)
  - Portfolio % denominator = Total Holdings (not Total Crypto Net Value)
- Storing derived holdings rows or summary totals as authoritative data
- Moving crypto management UI into the Dashboard

---

## 3. Stock Tracker (Module 2)

**Route:** `/stocks`  
**Version:** 1.1  
**Status:** FROZEN

### Purpose

Transaction-ledger stock tracker. Records buy, sell, dividend, and fee transactions as the immutable source of truth. Derives open holdings, market values, and capital-model metrics from the ledger plus price data. Supports auto price updates (Yahoo Finance) and manual price overrides. Aligned with Module 3 capital model (v1.1).

### Source of truth

| Data | Source |
|------|--------|
| Positions | `StockTransaction[]` in `portfolio:stock_transactions` |
| Ticker metadata | `StockInstrument[]` in `portfolio:stock_instruments` |
| Prices | `StockPrice[]` in `portfolio:stock_prices` |
| Price schedule | `StockPriceScheduleState` in `portfolio:stock_price_schedule` |
| Net stock cash contributed | Stock-category contribution transactions (deposits − withdrawals) |
| Stock Contribution | Σ buy `grossAmount` + `fees` from ledger (derived) |
| Open holdings | Derived by `calculateHoldings()` — never stored authoritatively |
| US/SG market values | Derived from holdings + effective prices + FX rate |
| Available Trading Cash | Net stock cash − Stock Contribution (derived) |
| Stock P/L | Stock Holdings Value − Stock Contribution (derived) |
| Total Stock Value | Stock Holdings Value + Available Trading Cash (derived) |
| Dashboard stock values | `deriveDashboardStockValues()` adapter output |
| Dashboard capital outputs | `deriveDashboardStockOutputs()` adapter output (prepared) |

### Allowed changes

- Bug fixes that restore documented ledger math, price resolution, or CRUD behaviour
- Copy, label, or styling tweaks within the existing tab structure (Open Holdings / Transactions)
- Price provider reliability fixes that preserve the existing auto/manual override model
- Test additions for existing behaviour

### Forbidden changes

- Redesigning Stock Tracker architecture (e.g. replacing ledger with manual totals)
- Storing derived holdings as authoritative data
- Removing the transaction ledger or making holdings manually entered totals
- Removing auto price updates or the manual price override path
- Removing market filter (ALL / US / SG) or summary cards
- Changing WAC ledger derivation logic without a spec revision
- Moving stock management UI into the Dashboard
- Changing core formulas (v1.1):
  - Stock Contribution = all buy transactions + associated fees (ledger)
  - Available Trading Cash = (Stock Deposits − Stock Withdrawals) − Stock Contribution
  - Stock P/L = Stock Holdings Value − Stock Contribution
  - Total Stock Value = Stock Holdings Value + Available Trading Cash
- Using deposit totals as Stock Contribution (contribution is ledger-based, not deposit-based)
- Bypassing `deriveDashboardStockValues()` or `deriveDashboardStockOutputs()` for Dashboard stock metrics
- Converting to a crypto-style manual-valuation model

---

## 4. Options Tracker (Module 5)

**Route:** `/options`  
**Version:** 1.0  
**Status:** FROZEN

### Purpose

Manual options trade journal with US cash integration, personal/shared split, client summary, DTE monitoring, capacity status, and performance analytics. No broker connection.

### Source of truth

| Data | Source |
|------|--------|
| Open / closed trades | `OptionsTrade[]` in `portfolio:options_trades` |
| Client settings | `OptionsSettings` in `portfolio:options_settings` |
| US Available Cash impact | Full realized P/L on close/edit/delete via shared cash engine |
| Client equity | Client Settings + shared trade P/L legs (reporting only) |
| Return % | Stored `returnPercent` on closed trades; aggregate from closed max risk |

### Frozen workflows

- Open Trade · Edit Open Trade · Mark Trade · Close Trade
- Edit Closed Trade · Delete Closed Trade
- Client Settings · Client Summary · Shared Split
- Performance Analytics (Personal / Shared) · Return %
- DTE Monitoring · Capacity Status

### Allowed changes

- Bug fixes that restore documented behaviour
- Copy, label, or styling tweaks
- Test additions for existing behaviour

### Forbidden changes

- New features without explicit unfreeze
- Changes to cash, capacity, or DTE formulas without spec revision
- Reintroducing trade-type tags/filters (personal/shared sections are the split)

---

## Cross-module rules (all frozen modules)

These apply to every module marked FROZEN above.

### Allowed

- Consuming another frozen module's output through an adapter (read-only)
- Calling `refresh()` in `PortfolioContext` after mutations in a non-frozen area (e.g. Settings)
- Shared UI component fixes in `src/shared/` that do not alter frozen module data flow

### Forbidden

- One frozen module writing into another frozen module's storage
- One frozen module duplicating another's calculations instead of using adapters
- Breaking the read-only contract on the Dashboard
- Changing which module owns a given source of truth without an unfreeze

---

## Unfreeze process

To modify a frozen module beyond allowed changes:

1. Document the proposed change and rationale
2. Explicitly mark the module as **UNFROZEN** in this file (with date and scope)
3. Update `PROJECT_ARCHITECTURE_V1.md` to reflect the new contract
4. Re-freeze when the change is complete

Until then, treat all frozen modules as locked at **v1.1** (capital model integration, June 2026). **Module 5 (Options Tracker)** is frozen at **v1.0** (June 2026).
