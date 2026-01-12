import { AgentReportRow } from "@/utils/transformAgentData";
import {
  BellRing,
  PhoneForwarded,
  User,
  Activity,
  Phone,
  AlertTriangle,
  CalendarClock,
  BadgeHelp,
  MessagesSquare,
  ShieldAlert,
  ThumbsDown,
} from "lucide-react";
import React, { useMemo } from "react";

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
        totalDnq: acc.totalDnq + parseInt(agent.dnq.count),
        totalCallBK: acc.totalCallBK + parseInt(agent.callbk.count),
        totalLb: acc.totalLb + parseInt(agent.lb.count),
        totalNa: acc.totalNa + parseInt(agent.na.count),
        totalNp: acc.totalNp + parseInt(agent.np.count),
        totalHp: acc.totalHp + parseInt(agent.rec.count),
      }),
      {
        totalCallBK: 0,
        totalNa: 0,
        totalHp: 0,
        totalNp: 0,
        totalLb: 0,
        totalCalls: 0,
        totalXfer: 0,
        totalDair: 0,
        totalRi: 0,
        totalA: 0,
        totalDnq: 0,
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
      label: "XFER",
      icon: PhoneForwarded,
      value: totals.totalXfer,
      bgLight: "bg-yellow-100",
      bgDark: "dark:bg-orange-400",
      textColor: "text-orange-900",
      gradient: "from-orange-500 to-orange-600",
      disposition: "xfer",
    },
    {
      label: "DAIR",
      icon: Activity,
      value: totals.totalDair,
      bgLight: "bg-teal-100",
      bgDark: "dark:bg-teal-400",
      textColor: "text-teal-900",
      gradient: "from-teal-500 to-teal-600",
      disposition: "dair",
    },
    {
      label: "RI",
      icon: BellRing,
      value: totals.totalRi,
      bgLight: "bg-gray-100",
      bgDark: "dark:bg-gray-400",
      textColor: "text-gray-900",
      gradient: "from-gray-500 to-gray-600",
      disposition: "ri",
    },
    {
      label: "A",
      icon: User,
      value: totals.totalA,
      bgLight: "bg-cyan-100",
      bgDark: "dark:bg-cyan-400",
      textColor: "text-cyan-900",
      gradient: "from-cyan-500 to-cyan-600",
      disposition: "a",
    },
    {
      label: "DNQ",
      icon: AlertTriangle,
      value: totals.totalDnq,
      bgLight: "bg-red-100",
      bgDark: "dark:bg-red-400",
      textColor: "text-red-900",
      gradient: "from-red-500 to-red-600",
      disposition: "dnq",
    },
    {
      label: "CallBK",
      icon: CalendarClock,
      value: totals.totalCallBK,
      bgLight: "bg-blue-100",
      bgDark: "dark:bg-blue-400",
      textColor: "text-blue-900",
      gradient: "from-blue-500 to-blue-600",
      disposition: "callbk",
    },
    {
      label: "LB",
      icon: BadgeHelp,
      value: totals.totalLb,
      bgLight: "bg-purple-100",
      bgDark: "dark:bg-purple-400",
      textColor: "text-purple-900",
      gradient: "from-purple-500 to-purple-600",
      disposition: "lb",
    },
    {
      label: "NA",
      icon: MessagesSquare,
      value: totals.totalNa,
      bgLight: "bg-yellow-100",
      bgDark: "dark:bg-yellow-400",
      textColor: "text-yellow-900",
      gradient: "from-yellow-500 to-yellow-600",
      disposition: "na",
    },
    {
      label: "NP",
      icon: ShieldAlert,
      value: totals.totalNp,
      bgLight: "bg-green-100",
      bgDark: "dark:bg-green-400",
      textColor: "text-green-900",
      gradient: "from-green-500 to-green-600",
      disposition: "np",
    },
    {
      label: "REC",
      icon: ThumbsDown,
      value: totals.totalHp,
      bgLight: "bg-orange-100",
      bgDark: "dark:bg-orange-400",
      textColor: "text-orange-900",
      gradient: "from-orange-500 to-orange-600",
      disposition: "rec",
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
    <div className="grid grid-cols-12 gap-4 mb-2">
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

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .grid > div {
          animation: slideIn 0.5s ease-out forwards;
          opacity: 0;
        }

        .loading-shimmer {
          animation: shimmer 1.5s infinite;
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

function StatCard({
  card,
  index,
  maxValue,
  isLoading,
  onClick,
}: StatCardProps) {
  const progressWidth =
    maxValue > 0 ? Math.min((card.value / maxValue) * 100, 100) : 0;

  const isClickable = !isLoading && card.value > 0;

  return (
    <div
      onClick={() => isClickable && onClick(card.disposition)}
      className={`
        ${card.bgLight} ${card.bgDark} px-4 py-1 rounded-lg 
        relative overflow-hidden group transition-all duration-300 
        bg-gradient-to-br ${card.gradient}
        ${
          isClickable
            ? "hover:shadow-lg hover:scale-105 cursor-pointer"
            : "opacity-60 cursor-default"
        }
      `}
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      {/* Animated background overlay - only on hover if clickable */}
      {isClickable && (
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      )}

      {/* Floating particles - only if clickable */}
      {isClickable && (
        <div className="absolute top-2 right-2 w-1 h-1 bg-white/40 rounded-full animate-pulse" />
      )}

      <div className="flex items-center gap-2 relative z-10">
        <div
          className={`p-1 rounded-lg bg-white/20 backdrop-blur-sm transition-transform duration-300 ${
            isClickable ? "group-hover:rotate-12" : ""
          }`}
        >
          <card.icon className="w-5 h-5 text-white drop-shadow-sm" />
        </div>
        <span className="text-sm font-bold text-white drop-shadow-sm">
          {card.label}
        </span>
      </div>

      <div className="relative z-10">
        <p className="text-lg font-bold text-white drop-shadow-sm transition-all duration-300">
          {card.value.toLocaleString()}
        </p>
      </div>

      {/* Loading indicator - horizontal line at bottom */}
      {isLoading ? (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 overflow-hidden">
          <div className="loading-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>
      ) : (
        /* Progress indicator - only show if there's data */
        card.value > 0 && (
          <div
            className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-300 group-hover:bg-white/50"
            style={{ width: `${progressWidth}%` }}
          />
        )
      )}
    </div>
  );
}

export default Stats;
