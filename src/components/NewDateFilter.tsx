import { useState, useEffect } from "react";

import DateTimeRangePicker from "./DatetimeRangePicker";
import { format } from "date-fns";
import QuickDateSelect from "./QuickDateSelect";

interface DateFilterProps {
  onDateChange: (range: { from: Date; to: Date }) => void;
  initialRange: { from: Date; to: Date };
  autoRefresh: boolean;
  disabled?:boolean
}

export default function NewDateFilter({
  onDateChange,
  initialRange,
  autoRefresh = false,
  disabled
}: DateFilterProps) {
  const [appliedRange, setAppliedRange] = useState<{
    from: Date;
    to: Date;
  }>(initialRange);

  useEffect(() => {
    if (appliedRange.from && appliedRange.to) {
      onDateChange(appliedRange);
    }
  }, [appliedRange, onDateChange]);

  const handleQuickDateSelect = (days: number) => {
    const now = new Date();
    const toDate = new Date(now.toISOString());

    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - days);
    start.setUTCHours(0, 0, 0, 0);

    const newRange = {
      from: start,
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
        initialStartTime={format(initialRange.from, "HH:mm")}
        initialEndTime={format(initialRange.to, "HH:mm")}
        autoRefresh={autoRefresh}
        disabled={disabled}
      />
      <QuickDateSelect
        autoRefresh={autoRefresh}
        handleQuickDateSelect={handleQuickDateSelect}
        disabled={disabled}
      />
    </div>
  );
}
