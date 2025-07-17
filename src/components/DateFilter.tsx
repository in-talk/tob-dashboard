import { FilterIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { DateRangePicker } from "rsuite";

export default function DateFilter({
  onDateChange,
  initialRange,
}: {
  onDateChange: (range: { from: string; to: string }) => void;
  initialRange: { from: string; to: string };
}) {
  const [tempRange, setTempRange] = useState<[Date, Date] | null>(null);
  const [appliedRange, setAppliedRange] = useState<{ from: string; to: string }>(
    initialRange
  );

  // Convert initial string range to Date objects for picker
  useEffect(() => {
    if (initialRange.from && initialRange.to) {
      setTempRange([new Date(initialRange.from), new Date(initialRange.to)]);
    }
  }, [initialRange]);

  const handleApply = () => {
    if (tempRange && tempRange[0] && tempRange[1]) {
      const from = formatDate(tempRange[0]);
      const to = formatDate(tempRange[1]);
      setAppliedRange({ from, to });
    }
  };

  useEffect(() => {
    if (appliedRange.from && appliedRange.to) {
      onDateChange(appliedRange);
    }
  }, [appliedRange, onDateChange]);

const formatDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`;
};


  return (
    <div className="flex gap-2 items-center justify-end mb-4 flex-wrap">
      <DateRangePicker
        format="dd-MM-yyyy HH:mm"
        value={tempRange}
        onChange={(range) => setTempRange(range)}
        placeholder="Select date & time range"
        className="rsuite-custom-picker"
        showOneCalendar
        ranges={[]}
      />

      <button
        onClick={handleApply}
        className="px-5 py-2 rounded-lg cursor-pointer text-sm font-medium transition-all duration-300 flex items-center gap-2 bg-gradient-to-br from-blue-600 to-purple-600 text-white hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(102,126,234,0.4)]"
      >
        <FilterIcon className="w-4 h-4" />
        Apply
      </button>
    </div>
  );
}