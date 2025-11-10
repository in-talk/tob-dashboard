import React from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useSession } from "next-auth/react";

interface AutoRefreshProps {
  autoRefresh: boolean;

  refreshInterval: number;
  setAutoRefresh: (checked: boolean) => void;
  setLastUpdated: (date: Date) => void;
  setRefreshInterval: (interval: number) => void;
  getTimeAgo: () => string;
  disabled?: boolean;
}

const refreshSlotsAdmin = [
  {
    label: "Every 30 seconds",
    value: 0.5,
  },
  {
    label: "Every 1 minute",
    value: 1,
  },
  {
    label: "Every 5 minutes",
    value: 5,
  },
  {
    label: "Every 10 minutes",
    value: 10,
  },
  {
    label: "Every 15 minutes",
    value: 15,
  },
  {
    label: "Every 30 minutes",
    value: 30,
  },
];

const refreshSlotsClient = [
  {
    label: "Every 5 minutes",
    value: 5,
  },
  {
    label: "Every 10 minutes",
    value: 10,
  },
  {
    label: "Every 15 minutes",
    value: 15,
  },
  {
    label: "Every 30 minutes",
    value: 30,
  },
];

function AutoRefresh({
  autoRefresh,
  refreshInterval,
  setAutoRefresh,
  setLastUpdated,
  setRefreshInterval,
  getTimeAgo,
  disabled,
}: AutoRefreshProps) {
    const { data: session } = useSession();
    const userRole = session?.user?.role;
    const refreshSlots = userRole === "admin" ? refreshSlotsAdmin : refreshSlotsClient;
  
  return (
    <div className="flex items-center gap-4 flex-wrap py-2">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={autoRefresh}
          onChange={(e) => {
            setAutoRefresh(e.target.checked);
            if (e.target.checked) setLastUpdated(new Date());
          }}
        />
        Auto Refresh
      </label>
      <Select
        disabled={disabled}
        value={`${refreshInterval}`}
        onValueChange={(value) => setRefreshInterval(Number(value))}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select interval" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Refresh Interval</SelectLabel>
            {refreshSlots.map((slot) => (
              <SelectItem key={slot.value} value={`${slot.value}`}>
                {slot.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {autoRefresh && (
        <span className="text-sm block text-gray-500">
          Updated {getTimeAgo()}
        </span>
      )}
    </div>
  );
}

export default AutoRefresh;
