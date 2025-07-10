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

  const { data, isLoading, mutate, error } = useSWR(
    session?.user?.client_id
      ? `disposition-graph-${session.user.client_id}`
      : null,
    () =>
      fetcher("/api/fetchDispositionGraphData", {
        body: JSON.stringify({ client_id: session?.user?.client_id }),
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
  const { theme } = useTheme();

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-transparent">
        <div className="relative w-12 h-12 -top-[120px]">
          <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
          <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-ping opacity-25"></div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error("Error loading disposition data:", error);
    return (
      <div>
        <p>Error loading data: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl">
      <div className="py-6 bg-light dark:bg-sidebar flex justify-between px-5">
        <h1 className="text-xl font-bold mb-2 ">Disposition Percentage</h1>
        <Button onClick={mutate} className="flex gap-2 items-center">
          <ReloadIcon />
          {isLoading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <ResponsiveContainer
        width="100%"
        height={600}
        className="bg-light dark:bg-sidebar"
      >
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="CallTime" angle={-45} textAnchor="end" height={80} />
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
