import { AgentReportRow } from "@/utils/transformAgentData";
import { BellRing, PhoneForwarded, User, Activity, Phone } from "lucide-react";
import React, { useMemo } from "react";
import CustomLoader from "../ui/CustomLoader";

interface StatsProps {
  agentReport: AgentReportRow[];
  isLoading: boolean;
  onClick?: (disposition: string) => void;
}

interface StatCard {
  label: string;
  icon: React.ElementType;
  value: number;
  bgLight: string;
  bgDark: string;
  textColor: string;
  gradient: string;
  disposition: string;
}

function Stats({ agentReport, isLoading, onClick }: StatsProps) {


  // Calculate totals using reduce to sum across all agents
  const totals = useMemo(() => {
    return agentReport.reduce(
      (acc, agent) => ({
        totalCalls: acc.totalCalls + agent.totalCalls,
        totalXfer: acc.totalXfer + parseInt(agent.xfer.count),
        totalDair: acc.totalDair + parseInt(agent.dair.count),
        totalRi: acc.totalRi + parseInt(agent.ri.count),
        totalA: acc.totalA + parseInt(agent.a.count),
      }),
      {
        totalCalls: 0,
        totalXfer: 0,
        totalDair: 0,
        totalRi: 0,
        totalA: 0,
      }
    );
  }, [agentReport]);

  const cards: StatCard[] = [
    {
      label: "Total Calls",
      icon: Phone,
      value: totals.totalCalls,
      bgLight: "bg-blue-100",
      bgDark: "dark:bg-blue-400",
      textColor: "text-blue-900",
      gradient: "from-blue-500 to-blue-600",
      disposition: "totalCalls",
    },
    {
      label: "Total XFER",
      icon: PhoneForwarded,
      value: totals.totalXfer,
      bgLight: "bg-yellow-100",
      bgDark: "dark:bg-orange-400",
      textColor: "text-orange-900",
      gradient: "from-orange-500 to-orange-600",
      disposition: "xfer",
    },
    {
      label: "Total DAIR",
      icon: Activity,
      value: totals.totalDair,
      bgLight: "bg-teal-100",
      bgDark: "dark:bg-teal-400",
      textColor: "text-teal-900",
      gradient: "from-teal-500 to-teal-600",
      disposition: "dair",
    },
    {
      label: "Total RI",
      icon: BellRing,
      value: totals.totalRi,
      bgLight: "bg-gray-100",
      bgDark: "dark:bg-gray-400",
      textColor: "text-gray-900",
      gradient: "from-gray-500 to-gray-600",
      disposition: "ri",
    },
    {
      label: "Total A",
      icon: User,
      value: totals.totalA,
      bgLight: "bg-cyan-100",
      bgDark: "dark:bg-cyan-400",
      textColor: "text-cyan-900",
      gradient: "from-cyan-500 to-cyan-600",
      disposition: "a",
    },
  ];

  const maxValue = Math.max(...cards.map((c) => c.value));

  const handleCardClick = (disposition: string) => {
    if (onClick) {
      onClick(disposition);
    }
  };

    if ((!agentReport || agentReport.length === 0) && !isLoading) {
    return <div>No data available</div>;
  }

  return (
    <div className="grid grid-cols-8 gap-4 mb-2">
      {cards.map((card, idx) => (
        <StatCard
          key={card.disposition}
          card={card}
          index={idx}
          maxValue={maxValue}
          isLoading={isLoading}
          onClick={handleCardClick}
        />
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

// Separate StatCard component for better organization
interface StatCardProps {
  card: StatCard;
  index: number;
  maxValue: number;
  isLoading: boolean;
  onClick: (disposition: string) => void;
}

function StatCard({ card, index, maxValue, isLoading, onClick }: StatCardProps) {
  const progressWidth = maxValue > 0 
    ? Math.min((card.value / maxValue) * 100, 100) 
    : 0;

  return (
    <div
      onClick={() => onClick(card.disposition)}
      className={`
        ${card.bgLight} ${card.bgDark} px-4 py-1 rounded-lg 
        relative overflow-hidden group transition-all duration-300 
        hover:shadow-lg hover:scale-105 cursor-pointer
        bg-gradient-to-br ${card.gradient}
      `}
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      {/* Animated background overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

      {/* Floating particles */}
      <div className="absolute top-2 right-2 w-1 h-1 bg-white/40 rounded-full animate-pulse" />

      <div className="flex items-center gap-2 relative z-10">
        <div className="p-1 rounded-lg bg-white/20 backdrop-blur-sm transition-transform duration-300 group-hover:rotate-12">
          <card.icon className="w-5 h-5 text-white drop-shadow-sm" />
        </div>
        <span className="text-sm font-bold text-white drop-shadow-sm">
          {card.label}
        </span>
      </div>

      <div className="relative z-10">
        {isLoading ? (
          <CustomLoader />
        ) : (
          <p className="text-lg font-bold text-white drop-shadow-sm transition-all duration-300">
            {card.value.toLocaleString()}
          </p>
        )}
      </div>

      {/* Progress indicator */}
      {!isLoading && (
        <div
          className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-300 group-hover:bg-white/50"
          style={{ width: `${progressWidth}%` }}
        />
      )}
    </div>
  );
}

export default Stats;