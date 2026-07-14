import type { OptionsClosedTradeRow, OptionsOpenTradeRow } from "@/core/domain/types/options";
import type { ScannerScanRun, ScannerTickerResult } from "@/core/domain/types/scanner";
import type {
  FoundationChecklistItem,
  FoundationPositionView,
  IncomeOverlayData,
  IncomeOverlaySettings,
  IncomeOverlaySummary,
} from "@/core/domain/types/income";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";
import { scaleMaxRiskForRemaining } from "@/core/calculations/options/contract-tracking";
import {
  getFoundationOpeningDte,
  getFoundationTypeLabel,
  isFoundationStrategy,
  isSellCallIncomeStrategy,
  qualifiesAsFoundation,
} from "./strategies";
import {
  buildCompletedIncomeCyclesForTicker,
  calculateRecoveryPct,
  deriveRecoveryPhase,
  deriveSellCallRecommendation,
  sumLifetimeIncomeUsd,
  sumMonthlyIncomeUsd,
} from "./income-cycles";
import {
  calculateFoundationTriggerPrice,
  deriveDistanceToTriggerUsd,
  deriveIncomeDecisionStatus,
  deriveTriggerStatusLabel,
  evaluateSellCallTimingRules,
  incomeDecisionLabel,
} from "./sell-call-window";

export interface BuildIncomeOverlayInput {
  openRows: OptionsOpenTradeRow[];
  closedRows: OptionsClosedTradeRow[];
  scannerRun: ScannerScanRun | null;
  settings: IncomeOverlaySettings;
  asOf?: Date;
}

function indexScannerResults(
  scannerRun: ScannerScanRun | null
): Map<string, ScannerTickerResult> {
  const map = new Map<string, ScannerTickerResult>();
  for (const result of scannerRun?.results ?? []) {
    map.set(normalizeTicker(result.ticker), result);
  }
  return map;
}

function selectFoundationRow(
  openRows: OptionsOpenTradeRow[],
  ticker: string,
  minOpeningDte: number
): OptionsOpenTradeRow | null {
  const normalized = normalizeTicker(ticker);
  const candidates = openRows.filter(
    (row) =>
      normalizeTicker(row.trade.underlying) === normalized &&
      qualifiesAsFoundation(row.trade, minOpeningDte)
  );

  if (candidates.length === 0) return null;

  return [...candidates].sort((a, b) => b.daysToExpiration - a.daysToExpiration)[0];
}

function findActiveSellCallRow(
  openRows: OptionsOpenTradeRow[],
  ticker: string
): OptionsOpenTradeRow | null {
  const normalized = normalizeTicker(ticker);
  return (
    openRows.find(
      (row) =>
        normalizeTicker(row.trade.underlying) === normalized &&
        isSellCallIncomeStrategy(row.trade.strategy)
    ) ?? null
  );
}

function buildFoundationChecklist(
  foundationRow: OptionsOpenTradeRow | null,
  activeSellCallRow: OptionsOpenTradeRow | null,
  minFoundationDte: number
): FoundationChecklistItem[] {
  const foundationType =
    foundationRow != null
      ? getFoundationTypeLabel(foundationRow.trade.strategy)
      : "—";

  return [
    {
      id: "exists",
      label: "Foundation Position Exists",
      pass: foundationRow != null,
    },
    {
      id: "type",
      label: `Foundation Type: ${foundationType}`,
      pass: foundationRow != null,
    },
    {
      id: "open",
      label: "Foundation Position OPEN",
      pass: foundationRow?.trade.status === "open",
    },
    {
      id: "dte",
      label: `Remaining DTE > ${minFoundationDte} Days`,
      pass: foundationRow != null && foundationRow.daysToExpiration > minFoundationDte,
    },
    {
      id: "no_active_call",
      label: "No ACTIVE SELL CALL linked to this Foundation Position",
      pass: activeSellCallRow == null,
    },
  ];
}

function buildFoundationView(
  ticker: string,
  foundationRow: OptionsOpenTradeRow,
  openRows: OptionsOpenTradeRow[],
  closedRows: OptionsClosedTradeRow[],
  scannerResult: ScannerTickerResult | null,
  settings: IncomeOverlaySettings,
  asOf: Date
): FoundationPositionView {
  const activeSellCallRow = findActiveSellCallRow(openRows, ticker);
  const isCovered = activeSellCallRow != null;
  const foundationType = getFoundationTypeLabel(foundationRow.trade.strategy);
  const foundationChecklist = buildFoundationChecklist(
    foundationRow,
    activeSellCallRow,
    settings.minFoundationDte
  );
  const foundationChecklistPass = foundationChecklist.every((item) => item.pass);

  const currentPriceUsd = foundationRow.dashboard.currentPriceUsd;
  const currentPriceSourceLabel = foundationRow.dashboard.currentPriceSourceLabel;
  const currentPriceAsOf = foundationRow.dashboard.currentPriceAsOf;
  const latestCandleDate =
    scannerResult?.recentCandles[scannerResult.recentCandles.length - 1]?.date ??
    null;
  const priceNewerThanCandle =
    currentPriceAsOf != null &&
    latestCandleDate != null &&
    currentPriceAsOf > latestCandleDate;
  const foundationBreakevenUsd = foundationRow.dashboard.breakevenPriceUsd;
  const callBreakevenUsd = activeSellCallRow?.dashboard.breakevenPriceUsd ?? null;

  const avgPriceUsd =
    foundationRow.scannerIndicators?.avgPrice ??
    scannerResult?.indicators.avgPrice ??
    null;
  const avgPricePrevUsd =
    foundationRow.scannerIndicators?.avgPricePrev ??
    scannerResult?.indicators.avgPricePrev ??
    null;
  const atr14 =
    foundationRow.scannerIndicators?.atr14 ?? scannerResult?.indicators.atr14 ?? null;

  const windowInput = {
    foundationChecklistPass,
    isCovered,
    currentPriceUsd,
    foundationBreakevenUsd,
    atr14,
    atrMultiplier: settings.foundationTriggerAtrMultiplier,
    avgPriceUsd,
    avgPricePrevUsd,
  };

  const timingRules = evaluateSellCallTimingRules(windowInput);
  const decisionStatus = deriveIncomeDecisionStatus(windowInput);
  const foundationTriggerPriceUsd = calculateFoundationTriggerPrice(
    foundationBreakevenUsd,
    atr14,
    settings.foundationTriggerAtrMultiplier
  );

  const completedIncomeCycles = buildCompletedIncomeCyclesForTicker(
    ticker,
    openRows,
    closedRows
  );
  const lifetimeIncomeUsd = sumLifetimeIncomeUsd(completedIncomeCycles);
  const monthlyIncomeUsd = sumMonthlyIncomeUsd(completedIncomeCycles, asOf);
  const foundationMaxRiskUsd = scaleMaxRiskForRemaining(foundationRow.trade);
  const recoveryPct = calculateRecoveryPct(lifetimeIncomeUsd, foundationMaxRiskUsd);
  const recoveryPhase = deriveRecoveryPhase(recoveryPct);

  return {
    ticker,
    foundationType,
    foundationRow,
    activeSellCallRow,
    isCovered,
    scannerCandles: scannerResult?.recentCandles ?? [],
    currentPriceUsd,
    currentPriceSourceLabel,
    currentPriceAsOf,
    priceNewerThanCandle,
    avgPriceUsd,
    avgPricePrevUsd,
    atr14,
    foundationBreakevenUsd,
    callBreakevenUsd,
    foundationMaxRiskUsd,
    foundationDte: foundationRow.daysToExpiration,
    foundationOpeningDte: getFoundationOpeningDte(foundationRow.trade),
    foundationChecklist,
    foundationChecklistPass,
    timingRules,
    foundationTriggerPriceUsd,
    distanceToTriggerUsd: deriveDistanceToTriggerUsd(
      currentPriceUsd,
      foundationTriggerPriceUsd
    ),
    triggerStatusLabel: deriveTriggerStatusLabel(
      currentPriceUsd,
      foundationTriggerPriceUsd
    ),
    decisionStatus,
    decisionLabel: incomeDecisionLabel(decisionStatus),
    recoveryPct,
    recoveryPhase,
    lifetimeIncomeUsd,
    monthlyIncomeUsd,
    completedIncomeCycles,
    activeRecommendation: activeSellCallRow
      ? deriveSellCallRecommendation(activeSellCallRow.dashboard.tradeHealth)
      : null,
  };
}

export function buildIncomeOverlayData(
  input: BuildIncomeOverlayInput
): IncomeOverlayData {
  const asOf = input.asOf ?? new Date();
  const scannerByTicker = indexScannerResults(input.scannerRun);

  const foundationTickers = new Set<string>();
  for (const row of input.openRows) {
    if (qualifiesAsFoundation(row.trade, input.settings.minFoundationDte)) {
      foundationTickers.add(normalizeTicker(row.trade.underlying));
    }
  }

  const foundations = [...foundationTickers]
    .sort((a, b) => a.localeCompare(b))
    .map((ticker) => {
      const foundationRow = selectFoundationRow(
        input.openRows,
        ticker,
        input.settings.minFoundationDte
      );
      if (!foundationRow) return null;
      return buildFoundationView(
        ticker,
        foundationRow,
        input.openRows,
        input.closedRows,
        scannerByTicker.get(ticker) ?? null,
        input.settings,
        asOf
      );
    })
    .filter((view): view is FoundationPositionView => view != null);

  const summary = buildIncomeOverlaySummary(foundations);

  return {
    settings: input.settings,
    summary,
    foundations,
  };
}

function buildIncomeOverlaySummary(
  foundations: FoundationPositionView[]
): IncomeOverlaySummary {
  const lifetimeIncomeUsd = foundations.reduce(
    (sum, foundation) => sum + foundation.lifetimeIncomeUsd,
    0
  );
  const monthlyIncomeUsd = foundations.reduce(
    (sum, foundation) => sum + foundation.monthlyIncomeUsd,
    0
  );
  const totalFoundationRiskUsd = foundations.reduce(
    (sum, foundation) => sum + foundation.foundationMaxRiskUsd,
    0
  );
  const aggregateRecoveryPct = calculateRecoveryPct(
    lifetimeIncomeUsd,
    totalFoundationRiskUsd
  );

  return {
    foundationCount: foundations.length,
    sellCallWindowsOpenCount: foundations.filter(
      (foundation) => foundation.decisionStatus === "sell_call_window_open"
    ).length,
    coveredPositionCount: foundations.filter((foundation) => foundation.isCovered).length,
    activeIncomeCycleCount: foundations.filter(
      (foundation) => foundation.activeSellCallRow != null
    ).length,
    monthlyIncomeUsd,
    lifetimeIncomeUsd,
    aggregateRecoveryPct,
    aggregateRecoveryPhase: deriveRecoveryPhase(aggregateRecoveryPct),
  };
}
