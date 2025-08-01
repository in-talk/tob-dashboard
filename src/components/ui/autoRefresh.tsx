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

interface AutoRefreshProps {
  autoRefresh: boolean;
  refreshInterval: number;
  setAutoRefresh: (checked: boolean) => void;
  setLastUpdated: (date: Date) => void;
  setRefreshInterval: (interval: number) => void;
  getTimeAgo: () => string;
}

function AutoRefresh({
  autoRefresh,
  refreshInterval,
  setAutoRefresh,
  setLastUpdated,
  setRefreshInterval,
  getTimeAgo,
}: AutoRefreshProps) {
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
        disabled={!autoRefresh}
        value={`${refreshInterval}`}
        onValueChange={(value) => setRefreshInterval(Number(value))}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select interval" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Refresh Interval</SelectLabel>
            <SelectItem value="0.0833">Every 5 seconds</SelectItem>
            <SelectItem value="0.5">Every 30 seconds</SelectItem>
            <SelectItem value="1">Every 1 minute</SelectItem>
            <SelectItem value="5">Every 5 minutes</SelectItem>
            <SelectItem value="10">Every 10 minutes</SelectItem>
            <SelectItem value="15">Every 15 minutes</SelectItem>
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
