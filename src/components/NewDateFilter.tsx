import { useState, useEffect } from "react";
import DateTimeRangePicker from "./DatetimeRangePicker";

export default function NewDateFilter({
  onDateChange,
  initialRange,
}: {
  onDateChange: (range: { from: string; to: string }) => void;
  initialRange: { from: string; to: string };
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
    <>
      <DateTimeRangePicker
        onDateChange={onDateChange}
        initialStartDate={initialRange.from}
        initialEndDate={initialRange.to}
        initialStartTime="00:00"
        initialEndTime="00:00"
      />

      <div className="px-5 py-4 bg-light dark:bg-sidebar rounded-lg">
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm font-medium">Quick Filters:</span>
          <div className="flex gap-2">
            {[7, 15, 30, 60].map((days) => (
              <button
                key={days}
                onClick={() => handleQuickDateSelect(days)}
                className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Last {days} Days
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
