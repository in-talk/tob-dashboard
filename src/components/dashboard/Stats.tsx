import { Phone, User } from "lucide-react";
import React from "react";

interface StatsProps {
  totalCalls: string;
  totalAgents: number;
}
function Stats({ totalCalls, totalAgents }: StatsProps) {
  if (!totalCalls && totalAgents) {
    return <div>No data available </div>;
  }
  return (
    <div className="grid grid-cols-6 gap-4 mb-6">
      <div className="bg-blue-100 dark:bg-blue-400 p-4 rounded-lg">
        <div className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-blue-900" />
          <span className="text-sm font-medium text-blue-900">Total Calls</span>
        </div>
        <p className="text-2xl font-bold text-blue-900">{totalCalls}</p>
      </div>
      <div className="bg-rose-100  dark:bg-rose-400 p-4 rounded-lg">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-rose-900" />
          <span className="text-sm font-medium text-rose-900">
            Total Agents
          </span>
        </div>
        <p className="text-2xl font-bold text-rose-900">{totalAgents}</p>
      </div>
      <div className="bg-yellow-100 dark:bg-orange-400 p-4 rounded-lg">
        <div className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-orange-900" />
          <span className="text-sm font-medium text-orange-900">Total Calls</span>
        </div>
        <p className="text-2xl font-bold text-orange-900">{totalCalls}</p>
      </div>
      <div className="bg-teal-100  dark:bg-teal-400 p-4 rounded-lg">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-teal-900" />
          <span className="text-sm font-medium text-teal-900">
            Total Agents
          </span>
        </div>
        <p className="text-2xl font-bold text-teal-900">{totalAgents}</p>
      </div>
       <div className="bg-gray-100 dark:bg-gray-400 p-4 rounded-lg">
        <div className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-gray-900" />
          <span className="text-sm font-medium text-gray-900">Total Calls</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">{totalCalls}</p>
      </div>
      <div className="bg-cyan-100  dark:bg-cyan-400 p-4 rounded-lg">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-cyan-900" />
          <span className="text-sm font-medium text-cyan-900">
            Total Agents
          </span>
        </div>
        <p className="text-2xl font-bold text-cyan-900">{totalAgents}</p>
      </div>
    </div>
  );
}

export default Stats;
