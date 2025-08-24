"use client";

import { gaugeChartText } from "@/constants";
import React, { useState } from "react";
import { PieChart, Pie, Cell } from "recharts";

interface AgentPerformance {
  name: string;
  xferPercentage: number;
}

const GaugeChart = () => {
  const [agentData] = useState<AgentPerformance[]>([]);

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
      return {
        label: gaugeChartText.statuses.outstanding,
        color: "bg-green-100 text-green-800",
      };
    if (percentage >= 50)
      return {
        label: gaugeChartText.statuses.excellent,
        color: "bg-blue-100 text-blue-800",
      };
    if (percentage >= 30)
      return { label: gaugeChartText.statuses.good, color: "bg-yellow-100 text-yellow-800" };
    if (percentage >= 10)
      return {
        label: gaugeChartText.statuses.needsAttention,
        color: "bg-orange-100 text-orange-800",
      };
    return { label: gaugeChartText.statuses.critical, color: "bg-red-100 text-red-800" };
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
    <div className="p-8 bg-gray-50 dark:bg-sidebar min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {gaugeChartText.page.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {gaugeChartText.page.description}
          </p>
        </div>

        {/* Agent Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {agentData.map((agent) => {
            const data = [
              { name: gaugeChartText.agentCard.xfer, value: agent.xferPercentage },
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
                      {gaugeChartText.agentCard.transferRate}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                    {statusBadge.label}
                  </span>
                </div>

                {/* Pie Chart */}
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
                            fill={index === 0 ? getChartColor(agent.xferPercentage) : COLORS[1]}
                          />
                        ))}
                      </Pie>
                    </PieChart>

                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className={`text-xl font-bold ${getStatusColor(agent.xferPercentage)}`}>
                          {agent.xferPercentage}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          {gaugeChartText.agentCard.xfer}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>{gaugeChartText.progressBar.min}</span>
                    <span>{gaugeChartText.progressBar.max}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${getProgressBarColor(agent.xferPercentage)}`}
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
                      {gaugeChartText.agentCard.resolved}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <div className={`text-lg font-semibold ${getStatusColor(agent.xferPercentage)}`}>
                      {agent.xferPercentage}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {gaugeChartText.agentCard.transferred}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Team Summary */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {gaugeChartText.summary.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {(
                  agentData.reduce((sum, agent) => sum + agent.xferPercentage, 0) /
                  agentData.length
                ).toFixed(1)}
                %
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {gaugeChartText.summary.avgTransferRate}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {Math.min(...agentData.map((agent) => agent.xferPercentage)).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {gaugeChartText.summary.bestPerformance}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {Math.max(...agentData.map((agent) => agent.xferPercentage)).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {gaugeChartText.summary.needsImprovement}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {agentData.length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {gaugeChartText.summary.totalAgents}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GaugeChart;