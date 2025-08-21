import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface DateTimeRangePickerProps {
  onDateChange: (range: { from: Date; to: Date }) => void;
  initialStartDate: Date;
  initialEndDate: Date;
  initialStartTime?: string;
  initialEndTime?: string;
  autoRefresh?: boolean;
}

const DateTimeRangePicker: React.FC<DateTimeRangePickerProps> = ({
  onDateChange,
  initialStartDate,
  initialEndDate,
  initialStartTime = "00:00",
  initialEndTime = format(new Date(), "HH:mm"),
  autoRefresh = false,
}) => {
  const [from, setFrom] = useState<Date>(initialStartDate);
  const [to, setTo] = useState<Date>(initialEndDate);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectingStart, setSelectingStart] = useState<boolean>(true);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  useEffect(() => {
    setFrom(initialStartDate);
    setTo(initialEndDate);
  }, [initialStartDate, initialEndDate]);

  useEffect(() => {
    if (!from || !to) return;
    
    if (from > to) {
      setError("End date/time cannot be before start date/time");
      return;
    }
    
    setError("");
  }, [from, to]);

  const getDaysInMonth = (date: Date): (Date | null)[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const handleDateClick = (date: Date): void => {
    if (selectingStart) {
      const newFrom = new Date(date);
      const [hours, minutes] = (from ? format(from, "HH:mm") : initialStartTime).split(":").map(Number);
      newFrom.setHours(hours, minutes, 0, 0);
      setFrom(newFrom);
      setSelectingStart(false);
    } else {
      const newTo = new Date(date);
      const [hours, minutes] = (to ? format(to, "HH:mm") : initialEndTime).split(":").map(Number);
      newTo.setHours(hours, minutes, 0, 0);
      setTo(newTo);
      setSelectingStart(true);
    }
    setError("");
  };

  const isDateInRange = (date: Date): boolean => {
    if (!from || !to) return false;
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const fromOnly = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const toOnly = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    return dateOnly >= fromOnly && dateOnly <= toOnly;
  };

  const getDateClassName = (date: Date): string => {
    if (!date) return "";

    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const fromOnly = from ? new Date(from.getFullYear(), from.getMonth(), from.getDate()) : null;
    const toOnly = to ? new Date(to.getFullYear(), to.getMonth(), to.getDate()) : null;
    
    const isStart = fromOnly && dateOnly.getTime() === fromOnly.getTime();
    const isEnd = toOnly && dateOnly.getTime() === toOnly.getTime();
    const isInRange = isDateInRange(date);
    const isHovered = hoverDate && 
      dateOnly.getTime() === new Date(hoverDate.getFullYear(), hoverDate.getMonth(), hoverDate.getDate()).getTime();
    const isToday = dateOnly.getTime() === new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();

    let className = "w-7 h-7 flex items-center justify-center text-xs rounded-lg cursor-pointer transition-all duration-200 ";

    if (isStart || isEnd) {
      className += "bg-purple-600 text-white font-semibold shadow-sm ring-2 ring-purple-600 ring-offset-1 ";
    } else if (isInRange) {
      className += "bg-purple-100 text-purple-700 ";
    } else if (isHovered) {
      className += "bg-purple-50 text-purple-600 ";
    } else if (isToday) {
      className += "bg-gray-100 text-gray-900 font-medium ring-1 ring-gray-300 ";
    } else {
      className += "hover:bg-gray-50 text-gray-700 ";
    }

    return className;
  };

  const monthNames: string[] = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const dayNames: string[] = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const navigateMonth = (direction: number): void => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev);
      newMonth.setMonth(newMonth.getMonth() + direction);
      return newMonth;
    });
  };

  const handleFromTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = e.target.value.split(":").map(Number);
    const updated = new Date(from);
    updated.setHours(hours, minutes, 0, 0);
    setFrom(updated);
  };

  const handleToTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = e.target.value.split(":").map(Number);
    const updated = new Date(to);
    updated.setHours(hours, minutes, 0, 0);
    setTo(updated);
  };

  const setToNow = (type: "start" | "end"): void => {
    const now = new Date();
    
    if (type === "start") {
      setFrom(now);
    } else {
      setTo(now);
    }
    setError("");
  };

  const handleApply = (): void => {
    if (!from || !to) return;
    
    if (from > to) {
      setError("End date/time cannot be before start date/time");
      return;
    }

    setError("");
    setIsOpen(false);
    onDateChange({ from, to });
  };

  const clearSelection = (): void => {
    setFrom(new Date());
    setTo(new Date());
    setError("");
    setSelectingStart(true);
  };

  return (
    <div className="relative flex justify-end">
      {/* Compact Trigger Button */}
      <button
        disabled={autoRefresh}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-purple-300 transition-all duration-200 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Calendar className="w-4 h-4 text-purple-600" />
        <span className="text-gray-700 font-medium">
          {from && to
            ? `${format(from, "MMM d, HH:mm")} - ${format(to, "MMM d, HH:mm")}`
            : "Select date range"}
        </span>
        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {/* Compact Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">
                  {selectingStart ? "Select start date" : "Select end date"}
                </span>
                <span className={`w-2 h-2 rounded-full animate-pulse ${selectingStart ? 'bg-purple-500' : 'bg-pink-500'}`} />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mx-4 mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            {/* Calendar */}
            <div className="p-4">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <h3 className="text-sm font-semibold text-gray-800">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-gray-500">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth(currentMonth).map((date, index) => (
                  <div key={index} className="aspect-square flex items-center justify-center">
                    {date ? (
                      <button
                        onClick={() => handleDateClick(date)}
                        onMouseEnter={() => setHoverDate(date)}
                        onMouseLeave={() => setHoverDate(null)}
                        className={getDateClassName(date)}
                      >
                        {date.getDate()}
                      </button>
                    ) : (
                      <div className="w-7 h-7" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Time Section */}
            <div className="px-4 pb-3 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Start Time
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="time"
                      value={from ? format(from, "HH:mm") : initialStartTime}
                      onChange={handleFromTimeChange}
                      disabled={autoRefresh}
                      className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => setToNow("start")}
                      disabled={autoRefresh}
                      className="p-1.5 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50"
                      title="Now"
                    >
                      <Clock className="w-3.5 h-3.5 text-purple-600" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    End Time
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="time"
                      value={to ? format(to, "HH:mm") : initialEndTime}
                      onChange={handleToTimeChange}
                      disabled={autoRefresh}
                      className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => setToNow("end")}
                      disabled={autoRefresh}
                      className="p-1.5 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors disabled:opacity-50"
                      title="Now"
                    >
                      <Clock className="w-3.5 h-3.5 text-pink-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 p-3 bg-gray-50 border-t border-gray-200">
              <button
                onClick={clearSelection}
                disabled={autoRefresh}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={!from || !to || !!error || autoRefresh}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed rounded-lg transition-all"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DateTimeRangePicker;