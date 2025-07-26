import React, { useState } from "react";
import {
  Calendar,
  Clock,
  // RotateCcw,
  // X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTimezone } from "@/hooks/useTimezone";

interface RecentSelection {
  id: number;
  label: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

interface DateTimeRangePickerProps {
  onDateChange?: (range: { from: string; to: string }) => void;
  autoRefresh: boolean;
  initialStartDate?: string;
  initialStartTime?: string;
  initialEndDate?: string;
  initialEndTime?: string;
}

const DateTimeRangePicker: React.FC<DateTimeRangePickerProps> = ({
  onDateChange,
  autoRefresh,
  initialStartDate = "",
  initialStartTime = "",
  initialEndDate = "",
  initialEndTime = "",
}) => {
  const [startDate, setStartDate] = useState<string>(initialStartDate);
  const [startTime, setStartTime] = useState<string>(initialStartTime);
  const [endDate, setEndDate] = useState<string>(initialEndDate);
  const [endTime, setEndTime] = useState<string>(initialEndTime);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [recentSelections, setRecentSelections] = useState<RecentSelection[]>(
    []
  );
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectingStart, setSelectingStart] = useState<boolean>(true);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const { timezone } = useTimezone();

  const isValidDateRange = (
    startDate: string,
    startTime: string,
    endDate: string,
    endTime: string
  ): boolean => {
    if (!startDate || !startTime || !endDate || !endTime) return true;

    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);

    return startDateTime <= endDateTime;
  };

  const saveToRecent = (): void => {
    if (startDate && startTime && endDate && endTime) {
      const newSelection: RecentSelection = {
        id: Date.now(),
        label: `${startDate} ${startTime} - ${endDate} ${endTime}`,
        startDate,
        startTime,
        endDate,
        endTime,
      };

      setRecentSelections((prev) => {
        const filtered = prev.filter(
          (item) => item.label !== newSelection.label
        );
        return [newSelection, ...filtered].slice(0, 5);
      });
    }
  };

  // const loadRecentSelection = (selection: RecentSelection): void => {
  //   setStartDate(selection.startDate);
  //   setStartTime(selection.startTime);
  //   setEndDate(selection.endDate);
  //   setEndTime(selection.endTime);
  //   setError("");
  // };

  const clearSelection = (): void => {
    setStartDate("");
    setStartTime("");
    setEndDate("");
    setEndTime("");
    setError("");
    setSelectingStart(true);
  };

  const handleApply = (): void => {
    if (!isValidDateRange(startDate, startTime, endDate, endTime)) {
      setError("End date/time cannot be before start date/time");
      return;
    }

    saveToRecent();
    setIsOpen(false);
    setError("");

    if (onDateChange && startDate && startTime && endDate && endTime) {
      const startDateTime = `${startDate}T${startTime}:00`;
      const endDateTime = `${endDate}T${endTime}:00`;

      onDateChange({
        from: startDateTime,
        to: endDateTime,
      });
    }
  };

  // const removeRecentSelection = (id: number): void => {
  //   setRecentSelections((prev) => prev.filter((item) => item.id !== id));
  // };

  const getCurrentTime = (): string => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  const getTodayDate = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const setToNow = (type: "start" | "end"): void => {
    const today = getTodayDate();
    const now = getCurrentTime();

    if (type === "start") {
      setStartDate(today);
      setStartTime(now);
    } else {
      setEndDate(today);
      setEndTime(now);
    }
    setError("");
  };

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

  const formatDateForInput = (date: Date): string => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleDateClick = (date: Date): void => {
    const dateStr = formatDateForInput(date);

    if (selectingStart) {
      setStartDate(dateStr);
      if (!startTime) setStartTime(getCurrentTime());
      setSelectingStart(false);
    } else {
      setEndDate(dateStr);
      if (!endTime) setEndTime(getCurrentTime());
      setSelectingStart(true);
    }
    setError("");
  };

  const isDateInRange = (date: Date): boolean => {
    if (!startDate || !endDate) return false;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return date >= start && date <= end;
  };

  const getDateClassName = (date: Date): string => {
    if (!date) return "";

    const dateStr = formatDateForInput(date);
    const isStart = dateStr === startDate;
    const isEnd = dateStr === endDate;
    const isInRange = isDateInRange(date);
    const isHovered = hoverDate && formatDateForInput(hoverDate) === dateStr;
    const isToday = dateStr === getTodayDate();

    let className =
      "w-8 h-8 flex items-center justify-center text-sm rounded-full cursor-pointer transition-all duration-200 ";

    if (isStart || isEnd) {
      className +=
        "bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold shadow-lg ";
    } else if (isInRange) {
      className +=
        "bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 ";
    } else if (isHovered) {
      className +=
        "bg-gradient-to-r from-blue-200 to-purple-200 text-blue-800 ";
    } else if (isToday) {
      className +=
        "bg-gradient-to-r from-green-100 to-blue-100 text-green-700 font-medium ";
    } else {
      className +=
        "hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200 text-gray-700 ";
    }

    return className;
  };

  const monthNames: string[] = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayNames: string[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const navigateMonth = (direction: number): void => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev);
      newMonth.setMonth(newMonth.getMonth() + direction);
      return newMonth;
    });
  };

  return (
    <div className="flex items-center justify-end mb-4 ">
      <div className="relative w-full max-w-md z-10">
        {/* Trigger Button */}
        <button
          disabled={autoRefresh}
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 flex items-center justify-between transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600 transition-colors duration-300" />
            <span className="text-sm text-gray-700">
              {startDate && startTime && endDate && endTime
                ? `${startDate} ${startTime} - ${endDate} ${endTime} (${timezone})`
                : "Select date & time range"}
            </span>
          </div>
          <div
            className={`text-purple-500 transition-all duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            ▼
          </div>
        </button>

        {/* Dropdown Panel */}
        {isOpen && (
          <div className="absolute top-full mt-2 w-full bg-white border border-gray-300 rounded-lg shadow-2xl z-[1000] p-4 animate-in slide-in-from-top-2 duration-300">
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md animate-in fade-in duration-300">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Selection Status */}
            <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-md">
              <p className="text-sm text-gray-700">
                {selectingStart ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></span>
                    Select start date
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></span>
                    Select end date
                  </span>
                )}
              </p>
            </div>

            {/* Calendar */}
            <div className="mb-4">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <h3 className="text-lg font-semibold text-gray-800">
                  {monthNames[currentMonth.getMonth()]}{" "}
                  {currentMonth.getFullYear()}
                </h3>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-gray-500 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth(currentMonth).map((date, index) => (
                  <div
                    key={index}
                    className="aspect-square flex items-center justify-center"
                  >
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
                      <div className="w-8 h-8"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Time Inputs */}
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  />
                  <button
                    onClick={() => setToNow("start")}
                    className="px-3 py-2 bg-gradient-to-r from-blue-100 to-purple-100 hover:from-blue-200 hover:to-purple-200 rounded-md transition-all duration-300 transform hover:scale-110 active:scale-95"
                    title="Set to now"
                  >
                    <Clock className="w-4 h-4 text-purple-600" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  />
                  <button
                    onClick={() => setToNow("end")}
                    className="px-3 py-2 bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 rounded-md transition-all duration-300 transform hover:scale-110 active:scale-95"
                    title="Set to now"
                  >
                    <Clock className="w-4 h-4 text-pink-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Selections */}
            {/* {recentSelections.length > 0 && (
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-green-600" />
                  Recent Selections
                </label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {recentSelections.map((selection, index) => (
                    <div
                      key={selection.id}
                      className="flex items-center justify-between p-2 bg-gradient-to-r from-green-50 to-blue-50 rounded-md hover:from-green-100 hover:to-blue-100 transition-all duration-300 transform hover:scale-105"
                      style={{
                        animationDelay: `${index * 50}ms`,
                        animation: "fadeInUp 0.3s ease-out forwards",
                      }}
                    >
                      <button
                        onClick={() => loadRecentSelection(selection)}
                        className="flex-1 text-left text-sm text-gray-700 hover:text-blue-600 transition-colors duration-300"
                      >
                        {selection.label}
                      </button>
                      <button
                        onClick={() => removeRecentSelection(selection.id)}
                        className="ml-2 text-gray-400 hover:text-red-500 transition-all duration-300 transform hover:scale-110 active:scale-95"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )} */}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-gray-200">
              <button
                onClick={clearSelection}
                className="flex-1 px-4 py-2 text-sm text-gray-600 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-md transition-all duration-300 transform hover:scale-105 active:scale-95"
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-2 text-sm text-gray-600 bg-gradient-to-r from-yellow-100 to-orange-100 hover:from-yellow-200 hover:to-orange-200 rounded-md transition-all duration-300 transform hover:scale-105 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={
                  !startDate || !startTime || !endDate || !endTime || !!error
                }
                className="flex-1 px-4 py-2 text-sm text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed rounded-md transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:transform-none"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {/* Add keyframe animation styles */}
        <style jsx>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes slideInFromTop {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default DateTimeRangePicker;
