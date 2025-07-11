import {
  DispositionGraph,
  transformGraphData,
} from "@/utils/transformGraphData";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import useSWR from "swr";
import { Button } from "../ui/button";
import { FilterIcon } from "lucide-react";

const dispositionLabels = [
  "XFER",
  "DC",
  "CALLBK",
  "NI",
  "DNC",
  "DNQ",
  "LB",
  "AM",
  "DAIR",
  "PQ2",
  "NT",
  "OTHER",
];

const dispositionColors: Record<string, string> = {
  XFER: "#007bff",
  DC: "#ff073a",
  CALLBK: "#28a745",
  NI: "#ffc107",
  DNC: "#6f42c1",
  DNQ: "#fd7e14",
  LB: "#17a2b8",
  AM: "#20c997",
  DAIR: "#6610f2",
  PQ2: "#e83e8c",
  NT: "#343a40",
  OTHER: "#adb5bd",
};

type ChartEntry = {
  CallTime: string;
  [key: string]: number | string;
};

export const fetcher = async (url: string, options?: RequestInit) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch data");
  }

  return response.json();
};

const DispositionChart = ({
  dispositionChartData,
}: {
  dispositionChartData: DispositionGraph[];
}) => {
  const { data: session } = useSession();
  const { theme } = useTheme();

  const [dateRange, setDateRange] = useState(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    return {
      from: startDate.toISOString().split("T")[0],
      to: endDate.toISOString().split("T")[0],
    };
  });

  const [pendingDateRange, setPendingDateRange] = useState(dateRange);

  const cacheKey = session?.user?.client_id
    ? `disposition-graph-${session.user.client_id}-${dateRange.from}-${dateRange.to}`
    : null;

  const { data, isLoading, mutate, error } = useSWR(
    cacheKey,
    () =>
      fetcher("/api/fetchDispositionGraphData", {
        body: JSON.stringify({
          client_id: session?.user?.client_id,
          from_date: dateRange.from,
          to_date: dateRange.to,
        }),
      }),
    {
      fallbackData: dispositionChartData,
      refreshInterval: 300000,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  const transformedData = useMemo(() => {
    return data
      ? transformGraphData(data.graphData || [])
      : dispositionChartData;
  }, [data, dispositionChartData]);

  const [chartData, setChartData] = useState<ChartEntry[]>([]);
  const [focusedLine, setFocusedLine] = useState<string | null>(null);

  useEffect(() => {
    if (transformedData?.length) {
      const processed = transformedData.map((entry) => ({
        CallTime: entry.timeLabel,
        XFER: Math.min(100, Math.max(0, entry.xferPercentage)),
        DC: Math.min(100, Math.max(0, entry.dcPercentage)),
        CALLBK: Math.min(100, Math.max(0, entry.cbPercentage)),
        NI: Math.min(100, Math.max(0, entry.niPercentage)),
        DNC: Math.min(100, Math.max(0, entry.dncPercentage)),
        DAIR: Math.min(100, Math.max(0, entry.dairPercentage)),
        RI: Math.min(100, Math.max(0, entry.riPercentage)),
        OTHER: Math.min(100, Math.max(0, entry.otherPercentage)),
      }));

      setChartData(processed);
    }
  }, [transformedData]);

  const handleLegendClick = (label: string) => {
    setFocusedLine((prev) => (prev === label ? null : label));
  };

  const handleApplyFilters = () => {
    setDateRange(pendingDateRange);
  };

  const handleQuickDateSelect = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    setDateRange({
      from: startDate.toISOString().split("T")[0],
      to: endDate.toISOString().split("T")[0],
    });
  };

  if (error) {
    console.error("Error loading disposition data:", error);
    return (
      <div className="rounded-xl bg-gray-100 dark:bg-sidebar p-5">
        <div className="text-red-500 text-center">
          <p className="text-lg font-semibold">Error loading data</p>
          <p className="text-sm mt-2">{error.message}</p>
          <Button onClick={mutate} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-gray-100 dark:bg-sidebar">
      {session?.user.role === "admin" && (
        <div className="py-6 bg-light dark:bg-sidebar flex justify-between px-5">
          <h1 className="text-2xl font-bold mb-2">Disposition Percentage</h1>
          <Button onClick={mutate} className="flex gap-2 items-center">
            <ReloadIcon />
            {isLoading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      )}

      <div className="px-5 py-4 bg-light dark:bg-sidebar border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">From:</label>
            <input
              type="date"
              value={pendingDateRange.from}
              onChange={(e) =>
                setPendingDateRange((prev) => ({
                  ...prev,
                  from: e.target.value,
                }))
              }
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">To:</label>
            <input
              type="date"
              value={pendingDateRange.to}
              onChange={(e) =>
                setPendingDateRange((prev) => ({ ...prev, to: e.target.value }))
              }
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <Button
            onClick={handleApplyFilters}
            className="px-5 py-2 rounded-lg cursor-pointer text-sm font-medium transition-all duration-300 flex items-center gap-2 bg-gradient-to-br from-blue-600 to-purple-600 text-white hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(102,126,234,0.4)]"
          >
            <FilterIcon className="w-4 h-4" />
            Apply Filters
          </Button>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <span className="text-sm font-medium">Quick Select:</span>
          <div className="flex gap-2">
            <button
              onClick={() => handleQuickDateSelect(7)}
              className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => handleQuickDateSelect(30)}
              className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => handleQuickDateSelect(90)}
              className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Last 90 Days
            </button>
          </div>
        </div>
      </div>

      <ResponsiveContainer
        width="100%"
        height={300}
        className="bg-light dark:bg-sidebar"
      >
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
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="CallTime"
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              label={{
                value: "Disposition Percentage",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle" },
              }}
            />
            <Tooltip
              formatter={(value: number) => `${value.toFixed(2)}%`}
              contentStyle={{
                backgroundColor: theme === "dark" ? "#1f2937" : "white",
                color: theme === "dark" ? "white" : "#1f2937",
              }}
            />

            {dispositionLabels.map((label) => {
              const shouldRender = !focusedLine || focusedLine === label;
              if (!shouldRender) return null;

              return (
                <Line
                  key={label}
                  type="monotone"
                  dataKey={label}
                  stroke={dispositionColors[label]}
                  strokeWidth={focusedLine === label ? 3 : 2}
                  dot={true}
                  connectNulls={false}
                />
              );
            })}
          </LineChart>
        )}
      </ResponsiveContainer>

      <div className="flex items-center justify-center flex-wrap gap-2 my-5">
        {dispositionLabels.map((label) => (
          <div
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
          </div>
        ))}
      </div>
    </div>
  );
};

export default DispositionChart;
