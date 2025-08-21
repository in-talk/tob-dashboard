import { AgentReportRow } from "@/utils/transformAgentData";
import { BellRing, PhoneForwarded, User, Activity, Phone } from "lucide-react";
import React from "react";
import CustomLoader from "../ui/CustomLoader";

interface StatsProps {
  agentReport: AgentReportRow[];
  isLoading: boolean;
}

function Stats({ agentReport, isLoading }: StatsProps) {
  if (!agentReport) {
    return <div>No data available</div>;
  }

  const totals = agentReport.reduce(
    (acc, agent) => {
      acc.totalCalls += agent.totalCalls;
      acc.totalXfer += parseInt(agent.xfer.count);
      acc.totalDair += parseInt(agent.dair.count);
      acc.totalRi += parseInt(agent.ri.count);
      acc.totalA += parseInt(agent.a.count);
      acc.totalOther += parseInt(agent.other.count);
      return acc;
    },
    {
      totalCalls: 0,
      totalXfer: 0,
      totalDair: 0,
      totalRi: 0,
      totalA: 0,
      totalOther: 0,
    }
  );

  const cards = [
    {
      label: "Total Calls",
      icon: Phone,
      value: totals.totalCalls,
      bgLight: "bg-blue-100",
      bgDark: "dark:bg-blue-400",
      textColor: "text-blue-900",
      gradient: "from-blue-500 to-blue-600",
    },
    {
      label: "Total XFER",
      icon: PhoneForwarded,
      value: totals.totalXfer,
      bgLight: "bg-yellow-100",
      bgDark: "dark:bg-orange-400",
      textColor: "text-orange-900",
      gradient: "from-orange-500 to-orange-600",
    },
    {
      label: "Total DAIR",
      icon: Activity,
      value: totals.totalDair,
      bgLight: "bg-teal-100",
      bgDark: "dark:bg-teal-400",
      textColor: "text-teal-900",
      gradient: "from-teal-500 to-teal-600",
    },
    {
      label: "Total RI",
      icon: BellRing,
      value: totals.totalRi,
      bgLight: "bg-gray-100",
      bgDark: "dark:bg-gray-400",
      textColor: "text-gray-900",
      gradient: "from-gray-500 to-gray-600",
    },
    {
      label: "Total A",
      icon: User,
      value: totals.totalA,
      bgLight: "bg-cyan-100",
      bgDark: "dark:bg-cyan-400",
      textColor: "text-cyan-900",
      gradient: "from-cyan-500 to-cyan-600",
    },
  ];

  return (
    <div className="grid grid-cols-8 gap-4 mb-2">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`
            ${card.bgLight} ${card.bgDark} px-4 py-1 rounded-lg 
            relative overflow-hidden group transition-all duration-300 
            hover:shadow-lg hover:scale-105 cursor-pointer
            bg-gradient-to-br ${card.gradient}
          `}
          style={{
            animationDelay: `${idx * 100}ms`,
          }}
        >
          {/* Animated background overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>

          {/* Floating particles */}
          <div className="absolute top-2 right-2 w-1 h-1 bg-white/40 rounded-full animate-pulse"></div>

          <div className="flex items-center gap-2 relative z-10">
            <div className="p-1 rounded-lg bg-white/20 backdrop-blur-sm transition-transform duration-300 group-hover:rotate-12">
              <card.icon className={`w-5 h-5 text-white drop-shadow-sm`} />
            </div>
            <span className={`text-sm font-bold text-white drop-shadow-sm`}>
              {card.label}
            </span>
          </div>

          <div className="relative z-10">
            {isLoading ? (
              <CustomLoader />
            ) : (
              <p
                className={`text-lg font-bold text-white drop-shadow-sm transition-all duration-300`}
              >
                {card.value.toLocaleString()}
              </p>
            )}
          </div>

          {/* Progress indicator */}
          {!isLoading && (
            <div
              className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-300 group-hover:bg-white/50"
              style={{
                width: `${Math.min(
                  (card.value / Math.max(...cards.map((c) => c.value))) * 100,
                  100
                )}%`,
              }}
            ></div>
          )}
        </div>
      ))}

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .grid > div {
          animation: slideIn 0.5s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}

export default Stats;
