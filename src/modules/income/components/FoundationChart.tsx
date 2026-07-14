import type { ScannerCandleBar } from "@/core/domain/types/scanner";
import { FiveDayCandlestickChart } from "@/modules/scanner/components/FiveDayCandlestickChart";

interface FoundationChartProps {
  candles: ScannerCandleBar[];
  avgPrice: number | null;
  currentPriceUsd: number | null;
  currentPriceAsOf?: string | null;
  priceNewerThanCandle?: boolean;
  foundationBreakevenUsd: number | null;
  triggerPriceUsd: number | null;
  callBreakevenUsd: number | null;
}

interface HorizontalGuide {
  price: number;
  color: string;
  label: string;
  solid?: boolean;
}

/** Matches FiveDayCandlestickChart layout; label gutter reserved on the right. */
const WIDTH = 320;
const HEIGHT = 180;
const LABEL_GUTTER = 72;
const PADDING = { top: 14, right: LABEL_GUTTER, bottom: 8, left: 8 };
const CHART_WIDTH = WIDTH - PADDING.left - PADDING.right;
const CHART_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;
const Y_PAD_RATIO = 0.04;

interface ChartScale {
  priceMin: number;
  priceMax: number;
  toY: (price: number) => number;
  toX: (index: number) => number;
  xStep: number;
}

function buildUnifiedScale(
  candles: ScannerCandleBar[],
  avgPrice: number | null,
  guides: HorizontalGuide[]
): ChartScale {
  const avgSeries = candles.map(
    (bar) => bar.avgPrice ?? (bar.high + bar.low) / 2
  );

  const allPrices = [
    ...candles.flatMap((bar) => [bar.high, bar.low, bar.open, bar.close]),
    avgPrice,
    ...avgSeries,
    ...guides.map((guide) => guide.price),
  ].filter((value): value is number => value != null && Number.isFinite(value));

  const candleMin = Math.min(...candles.map((bar) => bar.low));
  const candleMax = Math.max(...candles.map((bar) => bar.high));
  let priceMin = allPrices.length > 0 ? Math.min(...allPrices) : candleMin;
  let priceMax = allPrices.length > 0 ? Math.max(...allPrices) : candleMax;

  const rawRange = priceMax - priceMin || 1;
  const visualPad = rawRange * Y_PAD_RATIO;
  priceMin -= visualPad;
  priceMax += visualPad;
  const range = priceMax - priceMin || 1;

  const xStep = CHART_WIDTH / candles.length;
  const toY = (price: number) =>
    PADDING.top + ((priceMax - price) / range) * CHART_HEIGHT;
  const toX = (index: number) => PADDING.left + index * xStep + xStep / 2;

  return { priceMin, priceMax, toY, toX, xStep };
}

/** Display-only: widen last candle when price shares the latest candle market date. */
function patchLastCandleForDisplay(
  candles: ScannerCandleBar[],
  currentPriceUsd: number | null,
  priceAsOf: string | null
): { candles: ScannerCandleBar[]; priceNewerThanCandle: boolean } {
  if (candles.length === 0) {
    return { candles, priceNewerThanCandle: false };
  }

  const cloned = candles.map((bar) => ({ ...bar }));
  if (currentPriceUsd == null || !Number.isFinite(currentPriceUsd)) {
    return { candles: cloned, priceNewerThanCandle: false };
  }

  const lastIndex = cloned.length - 1;
  const last = cloned[lastIndex];
  const sameMarketDate =
    priceAsOf != null && last.date != null && priceAsOf === last.date;

  if (!sameMarketDate) {
    return {
      candles: cloned,
      priceNewerThanCandle: priceAsOf != null && last.date != null && priceAsOf > last.date,
    };
  }

  cloned[lastIndex] = {
    ...last,
    high: Math.max(last.high, currentPriceUsd),
    low: Math.min(last.low, currentPriceUsd),
    close: currentPriceUsd,
  };

  return { candles: cloned, priceNewerThanCandle: false };
}

function buildGuides(
  currentPriceUsd: number | null,
  foundationBreakevenUsd: number | null,
  triggerPriceUsd: number | null,
  callBreakevenUsd: number | null
): HorizontalGuide[] {
  const guides: HorizontalGuide[] = [];
  if (currentPriceUsd != null && Number.isFinite(currentPriceUsd)) {
    guides.push({
      price: currentPriceUsd,
      color: "#f8fafc",
      label: "Current Price",
      solid: true,
    });
  }
  if (foundationBreakevenUsd != null && Number.isFinite(foundationBreakevenUsd)) {
    guides.push({
      price: foundationBreakevenUsd,
      color: "#22c55e",
      label: "Foundation BE",
    });
  }
  if (triggerPriceUsd != null && Number.isFinite(triggerPriceUsd)) {
    guides.push({
      price: triggerPriceUsd,
      color: "#f97316",
      label: "Trigger Price",
    });
  }
  if (callBreakevenUsd != null && Number.isFinite(callBreakevenUsd)) {
    guides.push({ price: callBreakevenUsd, color: "#ef4444", label: "Call BE" });
  }
  return guides;
}

/** Dev-only: current price should map to the latest bar when inside its range. */
function assertCurrentPriceAlignment(
  candles: ScannerCandleBar[],
  currentPriceUsd: number | null,
  toY: (price: number) => number
): void {
  if (process.env.NODE_ENV === "production") return;
  if (currentPriceUsd == null || candles.length === 0) return;

  const latest = candles[candles.length - 1];
  const priceY = toY(currentPriceUsd);
  const highY = toY(latest.high);
  const lowY = toY(latest.low);
  const wickTop = Math.min(highY, lowY);
  const wickBottom = Math.max(highY, lowY);

  const insideWick =
    currentPriceUsd >= Math.min(latest.low, latest.high) &&
    currentPriceUsd <= Math.max(latest.low, latest.high);

  if (insideWick && (priceY < wickTop - 0.5 || priceY > wickBottom + 0.5)) {
    console.warn(
      "[FoundationChart] Current Price line misaligned with latest candle wick.",
      { currentPriceUsd, latest, priceY, wickTop, wickBottom }
    );
  }
}

export function FoundationChart({
  candles,
  avgPrice,
  currentPriceUsd,
  currentPriceAsOf = null,
  priceNewerThanCandle = false,
  foundationBreakevenUsd,
  triggerPriceUsd,
  callBreakevenUsd,
}: FoundationChartProps) {
  if (candles.length === 0) {
    return (
      <FiveDayCandlestickChart
        candles={[]}
        avgPrice={avgPrice}
        sellPutZone={null}
        sellCallZone={null}
        icMidZone={null}
      />
    );
  }

  const { candles: displayCandles, priceNewerThanCandle: chartPriceNewer } =
    patchLastCandleForDisplay(
      candles.slice(-5).map((bar) => ({ ...bar })),
      currentPriceUsd,
      currentPriceAsOf
    );
  const showPriceNewerNote = priceNewerThanCandle || chartPriceNewer;
  const guides = buildGuides(
    currentPriceUsd,
    foundationBreakevenUsd,
    triggerPriceUsd,
    callBreakevenUsd
  );
  const { toY, toX, xStep } = buildUnifiedScale(displayCandles, avgPrice, guides);

  assertCurrentPriceAlignment(displayCandles, currentPriceUsd, toY);

  const avgSeries = displayCandles.map(
    (bar) => bar.avgPrice ?? (bar.high + bar.low) / 2
  );
  const avgPoints = avgSeries
    .map((value, index) => (value != null ? `${toX(index)},${toY(value)}` : null))
    .filter((point): point is string => point != null)
    .join(" ");

  const lineEndX = WIDTH - PADDING.right;
  const labelX = WIDTH - PADDING.right + 6;

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-44 w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Foundation chart with candlesticks, average price, and breakeven guides"
      >
        {displayCandles.map((bar, index) => {
          const x = toX(index);
          const bodyTop = toY(Math.max(bar.open, bar.close));
          const bodyBottom = toY(Math.min(bar.open, bar.close));
          const bodyHeight = Math.max(bodyBottom - bodyTop, 2);
          const bullish = bar.close >= bar.open;

          return (
            <g key={bar.date}>
              <line
                x1={x}
                x2={x}
                y1={toY(bar.high)}
                y2={toY(bar.low)}
                stroke={bullish ? "#22c55e" : "#ef4444"}
                strokeWidth={1.5}
              />
              <rect
                x={x - xStep * 0.22}
                y={bodyTop}
                width={xStep * 0.44}
                height={bodyHeight}
                fill={bullish ? "#22c55e" : "#ef4444"}
                rx={1}
              />
            </g>
          );
        })}

        {avgPoints.length > 0 && (
          <polyline
            points={avgPoints}
            fill="none"
            stroke="#38bdf8"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {guides.map((guide) => {
          const y = toY(guide.price);
          return (
            <g key={guide.label}>
              <line
                x1={PADDING.left}
                x2={lineEndX}
                y1={y}
                y2={y}
                stroke={guide.color}
                strokeWidth={guide.solid ? 2 : 1.5}
                strokeDasharray={guide.solid ? undefined : "5 4"}
              />
              <text
                x={labelX}
                y={y + 3}
                fill={guide.color}
                fontSize={9}
                fontWeight={600}
              >
                {guide.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
        {showPriceNewerNote && (
          <span className="text-amber-400/90">
            Price newer than candle
            {currentPriceAsOf ? ` · ${currentPriceAsOf}` : ""}
          </span>
        )}
        <span>
          <span className="text-sky-400">---</span> Avg Price
        </span>
        <span>
          <span className="text-white">—</span> Current Price
        </span>
        <span>
          <span className="text-emerald-400">---</span> Foundation BE
        </span>
        <span>
          <span className="text-orange-400">---</span> Trigger Price
        </span>
        <span>
          <span className="text-red-400">---</span> Call BE
        </span>
      </div>
    </div>
  );
}
