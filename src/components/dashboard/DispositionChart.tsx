import { DispositionGraph } from "@/utils/transformGraphData";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useSession } from "next-auth/react";
import { useState, useMemo, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const allDispositionLabels = [
  "XFER", "DNC", "DC", "DAIR", "RI", "CALLBK", "A", "LB",
  "NP", "NA", "FAS", "DNQ", "HP",
];

const dispositionColors: Record<string, string> = {
  XFER: "#3b82f6", // Blue
  DNC: "#ef4444",  // Red
  DC: "#10b981",  // Emerald
  DAIR: "#f59e0b", // Amber
  RI: "#8b5cf6",  // Violet
  CALLBK: "#f97316", // Orange
  A: "#06b6d4",   // Cyan
  LB: "#14b8a6",  // Teal
  NP: "#d946ef",  // Fuchsia
  NA: "#64748b",  // Slate
  FAS: "#ec4899",  // Pink
  DNQ: "#78350f",  // Brown
  HP: "#22c55e",   // Green
};

type ChartEntry = {
  timeLabel: string;
  timeSlot: string;
  breakdown: string;
  fullTimeLabel: string;
  intervalPosition: number;
  intervalTotal: number;
  [key: string]: number | string;
};

const DispositionChart = ({
  dispositionChartData,
  isLoading,
}: {
  dispositionChartData: DispositionGraph[];
  isLoading: boolean;
}) => {
  const { data: session } = useSession();
  const [focusedLine, setFocusedLine] = useState<string | null>(null);

  const chartData: ChartEntry[] = useMemo(() => {
    if (!dispositionChartData?.length) return [];
    return dispositionChartData.map((entry) => {
      const chartEntry: ChartEntry = {
        timeLabel: entry.timeLabel,
        timeSlot: entry.timeSlot,
        breakdown: entry.breakdown,
        fullTimeLabel: entry.fullTimeLabel,
        intervalPosition: entry.intervalPosition,
        intervalTotal: entry.intervalTotal,
      };

      allDispositionLabels.forEach((label) => {
        const key = (label.toLowerCase() + "Percentage") as keyof DispositionGraph;
        const value = entry[key] as number;
        chartEntry[label] = Math.min(100, Math.max(0, value ?? 0));
      });

      return chartEntry;
    });
  }, [dispositionChartData]);

  const activeDispositionLabels = useMemo(() => {
    if (!chartData.length) return [];
    return allDispositionLabels.filter((label) =>
      chartData.some((entry) => entry[label] !== undefined && (entry[label] as number) > 0)
    );
  }, [chartData]);

  const formatXAxisTick = useCallback(
    (value: string) => value,
    []
  );

  const handleLegendClick = useCallback(
    (label: string) => {
      setFocusedLine((prev) => (prev === label ? null : label));
    },
    []
  );

  const maxYValue = useMemo(() => {
    if (!chartData.length) return 100;
    const labels = focusedLine ? [focusedLine] : activeDispositionLabels;
    const max = Math.max(
      0,
      ...chartData.flatMap((entry) =>
        labels.map((label) => Number(entry[label] || 0))
      )
    );
    return Math.min(100, Math.ceil(max / 10) * 10 + 10);
  }, [chartData, focusedLine, activeDispositionLabels]);

  if (!dispositionChartData) {
    return (
      <div className="rounded-xl bg-gray-100 dark:bg-sidebar p-5">
        <p className="text-red-500 text-center font-semibold text-lg">
          Error loading data
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white dark:bg-sidebar border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="py-4 px-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/20">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Disposition Performance</h1>
          <p className="text-xs text-gray-500">Real-time percentage breakdown across intervals</p>
        </div>
        {isLoading && (
          <span className="flex gap-2 items-center text-sm text-blue-500 font-medium">
            <ReloadIcon className="animate-spin w-4 h-4" />
            Syncing...
          </span>
        )}
      </div>

      <div className="p-4">
        <ResponsiveContainer width="100%" height={350}>
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="relative w-12 h-12">
                <div className="absolute w-12 h-12 border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
              </div>
            </div>
          ) : (
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                {activeDispositionLabels.map((label) => (
                  <linearGradient key={`grad-${label}`} id={`color-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={dispositionColors[label]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={dispositionColors[label]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="currentColor"
                className="text-gray-200 dark:text-gray-800"
              />

              <XAxis
                dataKey="fullTimeLabel"
                interval="preserveStartEnd"
                tickFormatter={formatXAxisTick}
                style={{ fontSize: "10px", fill: "currentColor" }}
                className="text-gray-500"
                axisLine={false}
                tickLine={false}
                height={70}
                angle={-45}
                textAnchor="end"
                minTickGap={30}
              />

              <YAxis
                domain={[0, maxYValue]}
                tickCount={6}
                tickFormatter={(value) => `${value}%`}
                style={{ fontSize: "11px", fill: "currentColor" }}
                className="text-gray-500"
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                cursor={{ stroke: 'currentColor', strokeWidth: 1, strokeDasharray: '4 4', className: 'text-gray-400' }}
                content={({ active, payload, label }) => {
                  if (active && payload?.length) {
                    return (
                      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 rounded-lg shadow-xl backdrop-blur-md bg-opacity-90">
                        <p className="text-xs font-bold text-gray-500 mb-2 border-b border-gray-100 dark:border-gray-800 pb-1">{label}</p>
                        <div className="space-y-1.5">
                          {payload.sort((a, b) => Number(b.value) - Number(a.value)).map((entry, i) => (
                            <div key={i} className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{entry.name}</span>
                              </div>
                              <span className="text-xs font-bold" style={{ color: entry.color }}>
                                {Number(entry.value).toFixed(1)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {activeDispositionLabels.map((label) => (
                (!focusedLine || focusedLine === label) && (
                  <Area
                    key={label}
                    type="monotone"
                    dataKey={label}
                    stroke={dispositionColors[label]}
                    strokeWidth={focusedLine === label ? 3 : 2}
                    fillOpacity={1}
                    fill={`url(#color-${label})`}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    animationDuration={1000}
                    connectNulls
                  />
                )
              ))}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-900/20 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center flex-wrap gap-x-4 gap-y-2">
        {activeDispositionLabels.map((label) => (
          <button
            key={label}
            onClick={() => handleLegendClick(label)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all duration-200 hover:bg-white dark:hover:bg-gray-800 border ${focusedLine === label
                ? "border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-800"
                : "border-transparent"
              }`}
          >
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: dispositionColors[label] }}
            />
            <span className={`text-xs font-medium ${focusedLine === label ? "text-gray-900 dark:text-gray-100" : "text-gray-500"
              }`}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DispositionChart;