import { DispositionGraph } from "@/utils/transformGraphData";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useSession } from "next-auth/react";
import { useMemo, useCallback, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const allDispositionLabels = [
  "XFER", "DNC", "DC", "DAIR", "RI", "CALLBK", "A", "LB",
  "NP", "NA", "FAS", "DNQ", "HP",
];

const dispositionColors: Record<string, string> = {
  XFER: "#007bff",
  DNC: "#ff073a",
  DC: "#28a745",
  DAIR: "#ffc107",
  RI: "#6f42c1",
  CALLBK: "#fd7e14",
  A: "#17a2b8",
  LB: "#20c997",
  NP: "#f5aee9",
  NA: "#e7471f",
  FAS: "#e83e8c",
  DNQ: "#80624a",
  HP: "#338c48",
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
    return dispositionChartData.map((entry) => ({
      timeLabel: entry.timeLabel,
      timeSlot: entry.timeSlot,
      breakdown: entry.breakdown,
      fullTimeLabel: entry.fullTimeLabel,
      intervalPosition: entry.intervalPosition,
      intervalTotal: entry.intervalTotal,
      ...Object.fromEntries(
        allDispositionLabels.map((label) => {
          const key = label.toLowerCase() + "Percentage";
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const value = (entry as any)[key];
          return [label, Math.min(100, Math.max(0, value ?? 0))];
        })
      ),
    }));
  }, [dispositionChartData]);

  const activeDispositionLabels = useMemo(() => {
    if (!chartData.length) return [];
    return allDispositionLabels.filter((label) =>
      chartData.some((entry) => entry[label] !== undefined)
    );
  }, [chartData]);

  const formatXAxisTick = useCallback(
    (value: string, index: number) => {
      const item = chartData[index];
      return item?.intervalPosition === 1 ? item.timeLabel : "";
    },
    [chartData]
  );

  const handleLegendClick = useCallback(
    (label: string) => {
      setFocusedLine((prev) => (prev === label ? null : label));
    },
    []
  );

  const maxYValue = useMemo(() => {
    if (!chartData.length) return 0;
    const labels = focusedLine ? [focusedLine] : activeDispositionLabels;
    return Math.max(
      0,
      ...chartData.flatMap((entry) =>
        labels.map((label) => Number(entry[label] || 0))
      )
    );
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
    <div className="rounded-xl bg-gray-100 dark:bg-sidebar">
      {session?.user.role === "admin" && (
        <div className="py-6 bg-light dark:bg-sidebar flex justify-between px-5">
          <h1 className="text-2xl font-bold">Disposition Percentage</h1>
          {isLoading && (
            <span className="flex gap-2 items-center">
              <ReloadIcon className="animate-spin" />
              Fetching...
            </span>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height={300}>
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="relative w-12 h-12">
              <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
              <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-ping opacity-25"></div>
            </div>
          </div>
        ) : (
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <XAxis
              dataKey="fullTimeLabel"
              interval={0}
              tickFormatter={formatXAxisTick}
              angle={-45}
              textAnchor="end"
              style={{ fontSize: "12px" }}
              height={50}
            />
            <YAxis
              domain={[0, maxYValue + 5]}
              tickFormatter={(value) => `${value}%`}
              label={{
                value: "Disposition %",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle" },
              }}
            />
            <Tooltip
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="bg-white dark:bg-gray-800 p-3 border rounded shadow-lg">
                    <p className="font-semibold">Time: {label}</p>
                    {payload.map((entry, i) => (
                      <p key={i} style={{ color: entry.color }}>
                        {entry.name}: {Number(entry.value).toFixed(2)}%
                      </p>
                    ))}
                  </div>
                ) : null
              }
            />
            {activeDispositionLabels.map((label) =>
              !focusedLine || focusedLine === label ? (
                <Line
                  key={label}
                  type="monotone"
                  dataKey={label}
                  stroke={dispositionColors[label]}
                  strokeWidth={focusedLine === label ? 3 : 2}
                  dot={false}
                  connectNulls={false}
                />
              ) : null
            )}
          </LineChart>
        )}
      </ResponsiveContainer>

      <div className="flex items-center justify-center flex-wrap gap-2 my-5">
        {activeDispositionLabels.map((label) => (
          <button
            key={label}
            onClick={() => handleLegendClick(label)}
            className={`cursor-pointer px-2 py-1 rounded transition-all duration-200 ${
              focusedLine === label ? "font-bold border-b-2" : "font-normal"
            }`}
            style={{
              color: dispositionColors[label],
              borderColor: dispositionColors[label],
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DispositionChart;