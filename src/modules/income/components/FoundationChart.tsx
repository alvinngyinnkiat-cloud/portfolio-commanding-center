import type { AlignedChartData } from "@/core/domain/types/aligned-chart-data";
import type { ScannerCandleBar } from "@/core/domain/types/scanner";

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

interface FoundationChartProps {
  aligned: AlignedChartData | null;
  loading?: boolean;
  avgPrice: number | null;
  foundationBreakevenUsd: number | null;
  triggerPriceUsd: number | null;
  callBreakevenUsd: number | null;
}

export function FoundationChart({
  aligned,
  loading = false,
  avgPrice,
  foundationBreakevenUsd,
  triggerPriceUsd,
  callBreakevenUsd,
}: FoundationChartProps) {
  if (loading || !aligned) {
    return (
      <div className="flex h-44 w-full items-center justify-center rounded-xl border border-surface-border/60 bg-surface/40 text-xs text-slate-500">
        {loading ? "Loading chart…" : "No candle data"}
      </div>
    );
  }

  const displayCandles = aligned.candles;
  if (displayCandles.length === 0) {
    return (
      <div className="flex h-44 w-full items-center justify-center rounded-xl border border-surface-border/60 bg-surface/40 text-xs text-slate-500">
        No candle data
      </div>
    );
  }

  const chartCurrentPrice = aligned.showCurrentPriceLine ? aligned.currentPrice : null;
  const guides = buildGuides(
    chartCurrentPrice,
    foundationBreakevenUsd,
    triggerPriceUsd,
    callBreakevenUsd
  );
  const { toY, toX, xStep } = buildUnifiedScale(displayCandles, avgPrice, guides);

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
        <span>
          <span className="text-sky-400">---</span> Avg Price
        </span>
        {aligned.showCurrentPriceLine && (
          <span>
            <span className="text-white">—</span> Current Price
          </span>
        )}
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
