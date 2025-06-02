import { useCallData } from "@/context/CallRecordContext";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

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
  "HP",
  "FAS",
  "RI",
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
  HP: "#e83e8c",
  FAS: "#343a40",
  RI: "#adb5bd",
};
type ChartEntry = {
  CallTime: string;
  [key: string]: number | string;
};

const DispositionChart = () => {
  const [chartData, setChartData] = useState<ChartEntry[]>([]);
  const [focusedLine, setFocusedLine] = useState<string | null>(null);
  const { callData, loading } = useCallData();
  const { theme } = useTheme();

  useEffect(() => {
    if (!loading && callData) {
      const timestamps = [...new Set(callData.map((item) => item.CallTime))];

      const processedData = timestamps.map((time) => {
        const group = callData.filter((item) => item.CallTime === time);
        const total = group.length || 1;

        const entry: ChartEntry = { CallTime: time };

        dispositionLabels.forEach((dispo) => {
          const count = group.filter(
            (item) => item.Disposition === dispo
          ).length;
          entry[dispo] = parseFloat(((count / total) * 100).toFixed(2));
        });

        return entry;
      });

      setChartData(processedData);
    }
  }, [callData, loading]);

  const handleLegendClick = (label: string) => {
    setFocusedLine((prev) => (prev === label ? null : label));
  };

  return (
    <div>
      <h2 className="text-4xl font-bold capitalize pb-10 px-10"></h2>
      {/* Header */}
      <div className="mb-6 ml-6">
        <h1 className="text-2xl font-bold mb-2">Disposition Percentage </h1>
      </div>
      <ResponsiveContainer
        width="100%"
        height={600}
        className="bg-light dark:bg-sidebar"
      >
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="CallTime" />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            label={{
              value: "Disposition Percentage",
              angle: -90,
              position: "insideLeft",
            }}
          />
          <Tooltip
            formatter={(value: number) => `${value.toFixed(2)}%`}
            contentStyle={{
              backgroundColor: `${theme === "dark" ? "#1f2937" : "white"}`,
              color:`${theme === "dark" ? "white" : "#1f2937"}`
            }}
          />

          {/* Render only focused line OR all if none selected */}
          {dispositionLabels.map((label) => {
            const shouldRender = !focusedLine || focusedLine === label;
            if (!shouldRender) return null;

            return (
              <Line
                key={label}
                type="natural"
                dataKey={label}
                stroke={dispositionColors[label]}
                strokeWidth={focusedLine === label ? 3 : 2}
                dot={false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-center flex-wrap gap-2 mt-5">
        {dispositionLabels.map((label) => (
          <div
            key={label}
            onClick={() => handleLegendClick(label)}
            className={`
        cursor-pointer 
        px-2 
        py-1 
        rounded 
        transition-all 
        duration-200 
        ${focusedLine === label ? "font-bold border-b-2" : "font-normal"} 
      `}
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
