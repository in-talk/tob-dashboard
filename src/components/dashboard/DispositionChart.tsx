import { DispositionGraph } from "@/utils/transformGraphData";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const allDispositionLabels = [
  "XFER",
  "DNC",
  "DC",
  "DAIR",
  "RI",
  "CALLBK",
  "A",
  "LB",
  "NP",
  "NA",
  "FAS",
  "DNQ",
  "HP",
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
  const { theme } = useTheme();
  const [chartData, setChartData] = useState<ChartEntry[]>([]);
  const [focusedLine, setFocusedLine] = useState<string | null>(null);

  useEffect(() => {
    if (dispositionChartData && dispositionChartData.length > 0) {
      const processed = dispositionChartData.map((entry) => ({
        timeLabel: entry.timeLabel,
        timeSlot: entry.timeSlot,
        breakdown: entry.breakdown,
        fullTimeLabel: entry.fullTimeLabel,
        XFER: Math.min(100, Math.max(0, entry.xferPercentage)),
        DC: Math.min(100, Math.max(0, entry.dcPercentage)),
        CALLBK: Math.min(100, Math.max(0, entry.callbkPercentage)),
        HP: Math.min(100, Math.max(0, entry.hpPercentage)),
        DNC: Math.min(100, Math.max(0, entry.dncPercentage)),
        DAIR: Math.min(100, Math.max(0, entry.dairPercentage)),
        FAS: Math.min(100, Math.max(0, entry.fasPercentage)),
        RI: Math.min(100, Math.max(0, entry.riPercentage)),
        A: Math.min(100, Math.max(0, entry.aPercentage)),
        LB: Math.min(100, Math.max(0, entry.lbPercentage)),
        NP: Math.min(100, Math.max(0, entry.npPercentage)),
        NA: Math.min(100, Math.max(0, entry.naPercentage)),
        DNQ: Math.min(100, Math.max(0, entry.dnqPercentage)),
      }));

      setChartData(processed);
    }
  }, [dispositionChartData]);

  const activeDispositionLabels = useMemo(() => {
    if (!chartData.length) return [];

    const keys = new Set<string>();
    chartData.forEach((entry) => {
      allDispositionLabels.forEach((label) => {
        if (entry[label] !== undefined) {
          keys.add(label);
        }
      });
    });

    return Array.from(keys);
  }, [chartData]);

  const formatXAxisTick = useCallback(
    (value: string, index: number) => {
      const item = chartData[index];
      if (!item) return "";
      if (item.timeLabel === item.fullTimeLabel) {
        return item.timeLabel;
      }

      return "";
    },
    [chartData]
  );

  const handleLegendClick = (label: string) => {
    setFocusedLine((prev) => (prev === label ? null : label));
  };

  const maxYValue = useMemo(() => {
    if (!chartData || chartData.length === 0) return 0;

    let max = 0;

    chartData.forEach((entry) => {
      const labels = focusedLine ? [focusedLine] : activeDispositionLabels;

      labels.forEach((label) => {
        const value = Number(entry[label] || 0);
        if (!isNaN(value)) {
          max = Math.max(max, value);
        }
      });
    });

    return max;
  }, [chartData, focusedLine, activeDispositionLabels]);

  if (!dispositionChartData) {
    return (
      <div className="rounded-xl bg-gray-100 dark:bg-sidebar p-5">
        <div className="text-red-500 text-center">
          <p className="text-lg font-semibold">Error loading data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-gray-100 dark:bg-sidebar">
      {session?.user.role === "admin" && (
        <div className="py-6 bg-light dark:bg-sidebar flex justify-between px-5">
          <h1 className="text-2xl font-bold mb-2">Disposition Percentage</h1>
          {isLoading ? (
            <span className="flex gap-2 items-center">
              <ReloadIcon />
              Fetching...
            </span>
          ) : null}
        </div>
      )}

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
              domain={[0, maxYValue]}
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
              labelFormatter={(label) => `Time: ${label}`}
              contentStyle={{
                backgroundColor: theme === "dark" ? "#1f2937" : "white",
                color: theme === "dark" ? "white" : "#1f2937",
                fontSize:'12px'
              }}
            />
            {activeDispositionLabels.map((label) => {
              const shouldRender = !focusedLine || focusedLine === label;
              if (!shouldRender) return null;

              return (
                <Line
                  key={label}
                  type="monotone"
                  dataKey={label}
                  stroke={dispositionColors[label]}
                  strokeWidth={focusedLine === label ? 3 : 2}
                  dot={false}
                  connectNulls={false}
                />
              );
            })}
          </LineChart>
        )}
      </ResponsiveContainer>

      <div className="flex items-center justify-center flex-wrap gap-2 my-5">
        {activeDispositionLabels.map((label) => (
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

//Append data points in graph (...in progress)

// import { DispositionGraph } from "@/utils/transformGraphData";
// import { ReloadIcon } from "@radix-ui/react-icons";
// import { useSession } from "next-auth/react";
// import { useTheme } from "next-themes";
// import { useEffect, useState, useMemo, useCallback, useRef } from "react";
// import Highcharts from "highcharts";
// import HighchartsReact from "highcharts-react-official";

// const allDispositionLabels = [
//   "XFER",
//   "DNC",
//   "DC",
//   "DAIR",
//   "RI",
//   "CALLBK",
//   "A",
//   "LB",
//   "NP",
//   "NA",
//   "FAS",
//   "DNQ",
//   "HP",
// ];

// const dispositionColors: Record<string, string> = {
//   XFER: "#007bff",
//   DNC: "#ff073a",
//   DC: "#28a745",
//   DAIR: "#ffc107",
//   RI: "#6f42c1",
//   CALLBK: "#fd7e14",
//   A: "#17a2b8",
//   LB: "#20c997",
//   NP: "#f5aee9",
//   NA: "#e7471f",
//   FAS: "#e83e8c",
//   DNQ: "#80624a",
//   HP: "#338c48",
// };

// type ChartEntry = {
//   timeLabel: string;
//   timeSlot: string;
//   breakdown: string;
//   fullTimeLabel: string;
//   [key: string]: number | string;
// };

// const DispositionChart = ({
//   dispositionChartData,
//   isLoading,
// }: {
//   dispositionChartData: DispositionGraph[];
//   isLoading: boolean;
// }) => {
//   const { data: session } = useSession();
//   const { theme } = useTheme();
//   const [chartData, setChartData] = useState<ChartEntry[]>([]);
//   const [focusedLine, setFocusedLine] = useState<string | null>(null);
//   const chartRef = useRef<HighchartsReact.RefObject>(null);
//   const previousDataLength = useRef<number>(0);

//   // Process new data
//   useEffect(() => {
//     if (dispositionChartData && dispositionChartData.length > 0) {
//       const processed = dispositionChartData.map((entry) => ({
//         timeLabel: entry.timeLabel,
//         timeSlot: entry.timeSlot,
//         breakdown: entry.breakdown,
//         fullTimeLabel: entry.fullTimeLabel,
//         XFER: Math.min(100, Math.max(0, entry.xferPercentage)),
//         DC: Math.min(100, Math.max(0, entry.dcPercentage)),
//         CALLBK: Math.min(100, Math.max(0, entry.callbkPercentage)),
//         HP: Math.min(100, Math.max(0, entry.hpPercentage)),
//         DNC: Math.min(100, Math.max(0, entry.dncPercentage)),
//         DAIR: Math.min(100, Math.max(0, entry.dairPercentage)),
//         FAS: Math.min(100, Math.max(0, entry.fasPercentage)),
//         RI: Math.min(100, Math.max(0, entry.riPercentage)),
//         A: Math.min(100, Math.max(0, entry.aPercentage)),
//         LB: Math.min(100, Math.max(0, entry.lbPercentage)),
//         NP: Math.min(100, Math.max(0, entry.npPercentage)),
//         NA: Math.min(100, Math.max(0, entry.naPercentage)),
//         DNQ: Math.min(100, Math.max(0, entry.dnqPercentage)),
//       }));

//       setChartData(processed);
//     }
//   }, [dispositionChartData]);

//   const activeDispositionLabels = useMemo(() => {
//     if (!chartData.length) return [];

//     const keys = new Set<string>();
//     chartData.forEach((entry) => {
//       allDispositionLabels.forEach((label) => {
//         if (entry[label] !== undefined) {
//           keys.add(label);
//         }
//       });
//     });

//     return Array.from(keys);
//   }, [chartData]);

//   // Handle real-time data updates
//   useEffect(() => {
//     if (!chartRef.current?.chart || !chartData.length) return;

//     const chart = chartRef.current.chart;
//     const currentDataLength = chartData.length;

//     // If this is new data (more points than before), append only new points
//     if (currentDataLength > previousDataLength.current) {
//       const newDataPoints = chartData.slice(previousDataLength.current);

//       newDataPoints.forEach((dataPoint, index) => {
//         const pointIndex = previousDataLength.current + index;

//         activeDispositionLabels.forEach((label, seriesIndex) => {
//           const series = chart.series[seriesIndex];
//           if (series && dataPoint[label] !== undefined) {
//             // Add point with animation
//             series.addPoint(
//               [pointIndex, Number(dataPoint[label])],
//               false, // Don't redraw immediately
//               false, // Don't shift (remove first point)
//               { duration: 300 } // Animation duration
//             );
//           }
//         });
//       });

//       // Redraw once after all points are added
//       chart.redraw();
//       previousDataLength.current = currentDataLength;
//     }
//     // If data length is same or less, it might be a complete refresh
//     else if (currentDataLength <= previousDataLength.current) {
//       previousDataLength.current = currentDataLength;
//     }
//   }, [chartData, activeDispositionLabels]);

//   const handleLegendClick = (label: string) => {
//     const newFocusedLine = focusedLine === label ? null : label;
//     setFocusedLine(newFocusedLine);

//     // Update series visibility
//     if (chartRef.current?.chart) {
//       const chart = chartRef.current.chart;
//       chart.series.forEach((series) => {
//         if (newFocusedLine) {
//           // If a line is focused, show only that line
//           if (series.name === newFocusedLine) {
//             series.show();
//             series.update({ type: "line", lineWidth: 3 });
//           } else {
//             series.hide();
//           }
//         } else {
//           // If no line is focused, show all lines
//           series.show();
//           series.update({ type: "line", lineWidth: 2 });
//         }
//       });
//     }
//   };

//   // Highcharts configuration
//   const chartOptions: Highcharts.Options = useMemo(() => {
//     const isDark = theme === "dark";

//     return {
//       chart: {
//         type: "line",
//         backgroundColor: "transparent",
//         height: 300,
//         animation: {
//           duration: 300,
//         },
//       },
//       title: {
//         text: undefined,
//       },
//       xAxis: {
//         type: "category",
//         categories: chartData.map((item) => item.fullTimeLabel),
//         labels: {
//           rotation: -45,
//           style: {
//             fontSize: "12px",
//             color: isDark ? "#ffffff" : "#1f2937",
//           },
//           formatter: function () {
//             const index = this.pos;
//             const item = chartData[index];
//             if (!item) return "";

//             // Show labels at regular intervals or main time points
//             // This will show more labels similar to your reference image
//             const totalPoints = chartData.length;
//             const maxLabels = Math.min(
//               12,
//               Math.max(6, Math.floor(totalPoints / 8))
//             );
//             const interval = Math.max(1, Math.floor(totalPoints / maxLabels));

//             if (
//               index % interval === 0 ||
//               item.timeLabel === item.fullTimeLabel
//             ) {
//               return item.timeLabel;
//             }
//             return "";
//           },
//         },
//         lineColor: isDark ? "#374151" : "#d1d5db",
//         tickColor: isDark ? "#374151" : "#d1d5db",
//       },
//       yAxis: {
//         title: {
//           text: "Disposition Percentage",
//           style: {
//             color: isDark ? "#ffffff" : "#1f2937",
//           },
//         },
//         labels: {
//           formatter: function () {
//             return this.value + "%";
//           },
//           style: {
//             color: isDark ? "#ffffff" : "#1f2937",
//           },
//         },
//         gridLineColor: isDark ? "#374151" : "#e5e7eb",
//       },
//       tooltip: {
//         backgroundColor: isDark ? "#1f2937" : "#ffffff",
//         borderColor: isDark ? "#374151" : "#d1d5db",
//         style: {
//           color: isDark ? "#ffffff" : "#1f2937",
//         },
//         formatter: function () {
//           const timeLabel = Highcharts.dateFormat("%b %d, %H:%M", this.x);

//           return `<b>${this.series.name}</b><br/>
//           Time: ${timeLabel}<br/>
//           Value: ${Number(this.y).toFixed(2)}%`;
//         },
//       },

//       legend: {
//         enabled: false, // We'll use custom legend
//       },
//       plotOptions: {
//         line: {
//           marker: {
//             enabled: false,
//           },
//           animation: {
//             duration: 300,
//           },
//         },
//         series: {
//           animation: {
//             duration: 300,
//           },
//         },
//       },
//       series: activeDispositionLabels.map((label) => ({
//         name: label,
//         type: "line",
//         data: chartData.map((item, index) => [index, Number(item[label] || 0)]),
//         color: dispositionColors[label],
//         lineWidth: focusedLine === label ? 3 : 2,
//         visible: !focusedLine || focusedLine === label,
//       })),
//       credits: {
//         enabled: false,
//       },
//     };
//   }, [chartData, activeDispositionLabels, theme, focusedLine]);

//   if (!dispositionChartData) {
//     return (
//       <div className="rounded-xl bg-gray-100 dark:bg-sidebar p-5">
//         <div className="text-red-500 text-center">
//           <p className="text-lg font-semibold">Error loading data</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="rounded-xl bg-gray-100 dark:bg-sidebar">
//       {session?.user.role === "admin" && (
//         <div className="py-6 bg-light dark:bg-sidebar flex justify-between px-5">
//           <h1 className="text-2xl font-bold mb-2">Disposition Percentage</h1>
//           {isLoading ? (
//             <span className="flex gap-2 items-center">
//               <ReloadIcon />
//               Fetching...
//             </span>
//           ) : null}
//         </div>
//       )}

//       <div className="bg-light dark:bg-sidebar" style={{ height: "300px" }}>
//         {isLoading && chartData.length === 0 ? (
//           <div className="flex justify-center items-center h-full">
//             <div className="relative w-12 h-12">
//               <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
//               <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-ping opacity-25"></div>
//             </div>
//           </div>
//         ) : (
//           <HighchartsReact
//             highcharts={Highcharts}
//             options={chartOptions}
//             ref={chartRef}
//           />
//         )}
//       </div>

//       {/* Custom Legend */}
//       <div className="flex items-center justify-center flex-wrap gap-2 my-5">
//         {activeDispositionLabels.map((label) => (
//           <div
//             key={label}
//             onClick={() => handleLegendClick(label)}
//             className={`cursor-pointer px-2 py-1 rounded transition-all duration-200 ${
//               focusedLine === label ? "font-bold border-b-2" : "font-normal"
//             }`}
//             style={{
//               color: dispositionColors[label],
//               borderColor: dispositionColors[label],
//             }}
//           >
//             {label}
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default DispositionChart;
