import { useState, useEffect } from "react";
import DateTimeRangePicker from "./DatetimeRangePicker";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

export default function NewDateFilter({
  onDateChange,
  initialRange,
  autoRefresh=false,
}: {
  onDateChange: (range: { from: string; to: string }) => void;
  initialRange: { from: string; to: string };
  autoRefresh: boolean;
}) {
  const [appliedRange, setAppliedRange] = useState<{
    from: string;
    to: string;
  }>(initialRange);

  useEffect(() => {
    if (appliedRange.from && appliedRange.to) {
      onDateChange(appliedRange);
    }
  }, [appliedRange, onDateChange]);

  const handleQuickDateSelect = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    const startDate = start.toISOString().split("T")[0];
    const toDate = end.toISOString().split("T")[0];
    const newRange = {
      from: startDate,
      to: toDate,
    };

    setAppliedRange(newRange);
  };

  return (
    <div>
      <DateTimeRangePicker
        onDateChange={onDateChange}
        initialStartDate={initialRange.from}
        initialEndDate={initialRange.to}
        initialStartTime="00:00"
        initialEndTime={format(new Date(), "HH:mm")}
        autoRefresh={autoRefresh}
      />
      <TooltipProvider>
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm font-medium">Quick Filters:</span>
          <div className="flex gap-2">
            {[7, 15, 30, 60].map((days) => {
              const button = (
                <button
                  disabled={autoRefresh}
                  key={days}
                  onClick={() => handleQuickDateSelect(days)}
                  className="bg-gray-100 dark:bg-dark p-2 rounded-md  text-sm disabled:cursor-not-allowed"
                >
                  Last {days} Days
                </button>
              );

              return autoRefresh ? (
                <Tooltip key={days}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent>
                    <p>Uncheck Auto Refresh</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                button
              );
            })}
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}
