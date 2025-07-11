"use client";

import React, { useState } from "react";
import { PieChart, Pie, Cell } from "recharts";
// import { useCallData } from "@/context/CallRecordContext";

interface AgentPerformance {
  name: string;
  xferPercentage: number;
}

const GaugeChart = () => {
  const [agentData] = useState<AgentPerformance[]>([]);

  // const { callData, loading } = useCallData();

  // useEffect(() => {
  //   if (!loading && callData) {
  //     const grouped: Record<string, { total: number; xfer: number }> = {};

  //     callData.forEach((row) => {
  //       const name = row["agent"];
  //       const disposition = row["disposition"]?.trim().toUpperCase();

  //       if (!name) return;

  //       if (!grouped[name]) {
  //         grouped[name] = { total: 0, xfer: 0 };
  //       }

  //       grouped[name].total += 1;
  //       if (disposition === "XFER") {
  //         grouped[name].xfer += 1;
  //       }
  //     });

  //     const result: AgentPerformance[] = Object.entries(grouped).map(
  //       ([name, stats]) => ({
  //         name,
  //         xferPercentage: parseFloat(
  //           ((stats.xfer / stats.total) * 100).toFixed(2)
  //         ),
  //       })
  //     );

  //     setAgentData(result);
  //   }
  // }, [callData, loading]);

  const COLORS = ["#10b981", "#f3f4f6"];

  const getStatusColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 50) return "text-blue-600";
    if (percentage >= 30) return "text-yellow-600";
    if (percentage >= 10) return "text-orange-600";
    return "text-red-600";
  };

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 80)
      return { label: "Outstanding", color: "bg-green-100 text-green-800" };
    if (percentage >= 50)
      return { label: "Excellent", color: "bg-blue-100 text-blue-800" };
    if (percentage >= 30)
      return { label: "Good", color: "bg-yellow-100 text-yellow-800" };
    if (percentage >= 10)
      return {
        label: "Needs Attention",
        color: "bg-orange-100 text-orange-800",
      };
    return { label: "Critical", color: "bg-red-100 text-red-800" };
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 50) return "bg-blue-500";
    if (percentage >= 30) return "bg-yellow-500";
    if (percentage >= 10) return "bg-orange-500";
    return "bg-red-500";
  };
  const getChartColor = (percentage: number) => {
    if (percentage >= 80) return "#10b981";
    if (percentage >= 50) return "#3b82f6";
    if (percentage >= 30) return "#eab308";
    if (percentage >= 10) return "#f97316";
    return "#ef4444";
  };

  return (
    <>
      <div className="p-8 bg-gray-50 dark:bg-sidebar min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Agent XFER Performance
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Monitor call transfer performance across your agents
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {agentData.map((agent) => {
              const data = [
                { name: "XFER", value: agent.xferPercentage },
                { name: "Other", value: 100 - agent.xferPercentage },
              ];

              const statusBadge = getStatusBadge(agent.xferPercentage);

              return (
                <div
                  key={agent.name}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl dark:hover:shadow-2xl transition-shadow duration-300 p-6 border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {agent.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Transfer Rate
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}
                    >
                      {statusBadge.label}
                    </span>
                  </div>

                  <div className="flex justify-center mb-4">
                    <div className="relative">
                      <PieChart width={180} height={145}>
                        <Pie
                          data={data}
                          startAngle={180}
                          endAngle={0}
                          innerRadius={50}
                          outerRadius={70}
                          dataKey="value"
                          strokeWidth={2}
                          stroke="#ffffff"
                        >
                          {data.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                index === 0
                                  ? getChartColor(agent.xferPercentage)
                                  : COLORS[1]
                              }
                            />
                          ))}
                        </Pie>
                      </PieChart>

                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div
                            className={`text-xl font-bold ${getStatusColor(
                              agent.xferPercentage
                            )}`}
                          >
                            {agent.xferPercentage}%
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            XFER
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>0%</span>
                      <span>100%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${getProgressBarColor(
                          agent.xferPercentage
                        )}`}
                        style={{ width: `${agent.xferPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {(100 - agent.xferPercentage).toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Resolved
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <div
                        className={`text-lg font-semibold ${getStatusColor(
                          agent.xferPercentage
                        )}`}
                      >
                        {agent.xferPercentage}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Transferred
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Team Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(
                    agentData.reduce(
                      (sum, agent) => sum + agent.xferPercentage,
                      0
                    ) / agentData.length
                  ).toFixed(1)}
                  %
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Average Transfer Rate
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {Math.min(
                    ...agentData.map((agent) => agent.xferPercentage)
                  ).toFixed(1)}
                  %
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Best Performance
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {Math.max(
                    ...agentData.map((agent) => agent.xferPercentage)
                  ).toFixed(1)}
                  %
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Needs Improvement
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {agentData.length}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Total Agents
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GaugeChart;
