import { FilterIcon } from "lucide-react";
import { useState, useEffect } from "react";

export default function DateFilter({
  onDateChange,
  initialRange
}: {
  onDateChange: (range: { from: string; to: string }) => void;
  initialRange: { from: string; to: string };

}) {
  

  const [tempRange, setTempRange] = useState(initialRange);
  const [appliedRange, setAppliedRange] = useState(initialRange);

  const handleApply = () => {
    setAppliedRange(tempRange);
  };

  useEffect(() => {
    onDateChange(appliedRange);
  }, [appliedRange, onDateChange]);

  return (
    <div className="flex gap-2 items-center justify-end mb-4">
      <div className="flex gap-2 items-center">
        <label className="block text-sm">From:</label>
        <input
          type="date"
          value={tempRange.from}
          onChange={(e) =>
            setTempRange((prev) => ({ ...prev, from: e.target.value }))
          }
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>
      <div className="flex gap-2 items-center">
        <label className="block text-sm">To</label>
        <input
          type="date"
          value={tempRange.to}
          onChange={(e) =>
            setTempRange((prev) => ({ ...prev, to: e.target.value }))
          }
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>
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