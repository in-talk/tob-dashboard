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
    },
    {
      label: "Total XFER",
      icon: PhoneForwarded,
      value: totals.totalXfer,
      bgLight: "bg-yellow-100",
      bgDark: "dark:bg-orange-400",
      textColor: "text-orange-900",
    },
    {
      label: "Total DAIR",
      icon: Activity,
      value: totals.totalDair,
      bgLight: "bg-teal-100",
      bgDark: "dark:bg-teal-400",
      textColor: "text-teal-900",
    },
    {
      label: "Total RI",
      icon: BellRing,
      value: totals.totalRi,
      bgLight: "bg-gray-100",
      bgDark: "dark:bg-gray-400",
      textColor: "text-gray-900",
    },
    {
      label: "Total A",
      icon: User,
      value: totals.totalA,
      bgLight: "bg-cyan-100",
      bgDark: "dark:bg-cyan-400",
      textColor: "text-cyan-900",
    },
  ];

  return (
    <div className="grid grid-cols-8 gap-4 mb-2">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`${card.bgLight} ${card.bgDark} px-4 py-1 rounded-lg `}
        >
          <div className="flex items-center gap-2">
            <card.icon className={`w-5 h-5 ${card.textColor}`} />
            <span className={`text-sm font-bold ${card.textColor}`}>
              {card.label}
            </span>
          </div>
          {isLoading ? (
            <CustomLoader />
          ) : (
            <p className={`text-lg font-bold ${card.textColor}`}>
              {card.value}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export default Stats;
