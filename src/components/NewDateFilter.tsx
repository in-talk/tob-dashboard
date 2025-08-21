import { useState, useEffect, useRef } from "react";


import DateTimeRangePicker from "./DatetimeRangePicker";
import { format } from "date-fns";
import { ChevronDown, Clock } from "lucide-react";

export default function NewDateFilter({
  onDateChange,
  initialRange,
  autoRefresh = false,
}: {
  onDateChange: (range: { from: Date; to: Date }) => void;
  initialRange: { from: Date; to: Date };
  autoRefresh: boolean;
}) {
  const [appliedRange, setAppliedRange] = useState<{
    from: Date;
    to: Date;
  }>(initialRange);
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
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

    const filterOptions = [
    { value: 7, label: "7 days" },
    { value: 15, label: "15 days" },
    { value: 30, label: "30 days" },
    { value: 60, label: "60 days" },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (days: number) => {
    if (!autoRefresh) {
      setSelected(days);
      handleQuickDateSelect(days);
      setIsOpen(false);
    }
  };

  return (
    <div>
      <DateTimeRangePicker
        onDateChange={onDateChange} // range = { from: Date, to: Date }
        initialStartDate={initialRange.from}
        initialEndDate={initialRange.to}
        initialStartTime={format(initialRange.from, "HH:mm")}
        initialEndTime={format(initialRange.to, "HH:mm")}
        autoRefresh={autoRefresh}
      />
      <div ref={dropdownRef} className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={autoRefresh}
        className="flex items-center w-full gap-1.5 px-2.5 py-2.5 text-xs mt-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Clock className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {selected ? `Last ${selected} days` : "Quick filters"}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !autoRefresh && (
        <div className="absolute right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1 min-w-[120px]">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`
                w-full px-3 py-1.5 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                ${selected === option.value ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}
              `}
            >
              Last {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
    </div>
  );
}
