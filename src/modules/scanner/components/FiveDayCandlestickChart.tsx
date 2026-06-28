import type { ScannerCandleBar } from "@/core/domain/types/scanner";

interface FiveDayCandlestickChartProps {
  candles: ScannerCandleBar[];
  avgPrice: number | null;
  sellPutZone: { low: number; high: number } | null;
  sellCallZone: { low: number; high: number } | null;
  icMidZone: { low: number; high: number } | null;
}

export function FiveDayCandlestickChart({
  candles,
  avgPrice,
  sellPutZone,
  sellCallZone,
  icMidZone,
}: FiveDayCandlestickChartProps) {
  if (candles.length === 0) {
    return (
      <div className="flex h-44 w-full items-center justify-center rounded-xl border border-surface-border/60 bg-surface/40 text-xs text-slate-500">
        No candle data
      </div>
    );
  }

  const width = 320;
  const height = 180;
  const padding = { top: 14, right: 8, bottom: 8, left: 8 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const avgSeries = candles.map(
    (bar) => bar.avgPrice ?? (bar.high + bar.low) / 2
  );
  const emaSeries = candles.map((bar) => bar.ema20 ?? null);

  const zoneLevels = [
    sellPutZone?.low,
    sellPutZone?.high,
    sellCallZone?.low,
    sellCallZone?.high,
    icMidZone?.low,
    icMidZone?.high,
    avgPrice,
    ...avgSeries,
    ...emaSeries.filter((value): value is number => value != null),
  ].filter((value): value is number => value != null);

  const priceMin = Math.min(...candles.map((bar) => bar.low), ...zoneLevels);
  const priceMax = Math.max(...candles.map((bar) => bar.high), ...zoneLevels);
  const range = priceMax - priceMin || 1;
  const xStep = chartWidth / candles.length;

  const toY = (price: number) =>
    padding.top + ((priceMax - price) / range) * chartHeight;

  const toX = (index: number) => padding.left + index * xStep + xStep / 2;

  const avgPoints = avgSeries
    .map((value, index) => (value != null ? `${toX(index)},${toY(value)}` : null))
    .filter((point): point is string => point != null)
    .join(" ");

  const emaPoints = emaSeries
    .map((value, index) => (value != null ? `${toX(index)},${toY(value)}` : null))
    .filter((point): point is string => point != null)
    .join(" ");

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-44 w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Five day candlestick chart with zones, average price, and EMA20"
      >
        {sellPutZone && (
          <ZoneBand
            yTop={toY(sellPutZone.high)}
            yBottom={toY(sellPutZone.low)}
            color="#22c55e"
            opacity={0.12}
          />
        )}
        {icMidZone && (
          <ZoneBand
            yTop={toY(icMidZone.high)}
            yBottom={toY(icMidZone.low)}
            color="#eab308"
            opacity={0.12}
          />
        )}
        {sellCallZone && (
          <ZoneBand
            yTop={toY(sellCallZone.high)}
            yBottom={toY(sellCallZone.low)}
            color="#ef4444"
            opacity={0.12}
          />
        )}

        {candles.map((bar, index) => {
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

        {emaPoints.length > 0 && (
          <polyline
            points={emaPoints}
            fill="none"
            stroke="#c084fc"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {emaSeries.map((value, index) =>
          value != null ? (
            <circle
              key={`ema-${candles[index].date}`}
              cx={toX(index)}
              cy={toY(value)}
              r={2.5}
              fill="#c084fc"
            />
          ) : null
        )}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
        <span>
          <span className="text-sky-400">---</span> Avg Price
        </span>
        <span>
          <span className="text-purple-400">—</span> EMA20
        </span>
        <span>
          <span className="text-accent-green">░</span> Put Zone
        </span>
        <span>
          <span className="text-yellow-400">░</span> Adjusted Mid Zone
        </span>
        <span>
          <span className="text-accent-red">░</span> Call Zone
        </span>
      </div>
    </div>
  );
}

function ZoneBand({
  yTop,
  yBottom,
  color,
  opacity,
}: {
  yTop: number;
  yBottom: number;
  color: string;
  opacity: number;
}) {
  return (
    <rect
      x={8}
      y={yTop}
      width={304}
      height={Math.max(yBottom - yTop, 1)}
      fill={color}
      opacity={opacity}
    />
  );
}
