// utils/csvExport.ts
import { CallRecord } from "@/types/callRecord";

interface ExportDispositionCSVProps {
  callRecords: CallRecord[];
  disposition: string;
  utcDateRange: { from: string; to: string };
  role?: string;
}

export function exportDispositionCSV({
  callRecords,
  disposition,
  utcDateRange,
  role,
}: ExportDispositionCSVProps) {
  const filteredData =
    disposition.toUpperCase() === "TOTALCALLS"
      ? callRecords
      : callRecords.filter(
          (record) =>
            record.disposition?.toUpperCase() === disposition.toUpperCase()
        );

  if (filteredData.length === 0) {
    console.warn("No data to export");
    return;
  }

  const excludeColumns = [
    "metadata",
    "total_records",
    "current_page",
    "page_size",
    "total_page",
    "has_next_page",
    "has_previous_page",
    "call_recording_path",
    "total_pages",
    "call_status",
  ];

  if (role === "user") {
    excludeColumns.push(
      "label",
      "transcription",
      "call_unique_id",
      "client_id",
      "label",
      "model",
      "version",
      "call_start_time",
      "call_end_time",
    );
  }

  const filteredKeys = Object.keys(filteredData[0]).filter(
    (key) => !excludeColumns.includes(key)
  );

  const csv = [
    filteredKeys.join(","),
    ...filteredData.map((row) =>
      filteredKeys
        .map((key) => {
          const value = row[key as keyof CallRecord];

          // Extract seconds from call_duration
          if (
            key === "call_duration" &&
            typeof value === "object" &&
            value !== null
          ) {
            const seconds = value.seconds || 0;
            const milliseconds = value.milliseconds || 0;

            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;

            return `${String(minutes).padStart(2, "0")}:${String(
              remainingSeconds
            ).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
          }

          // Handle strings with commas or quotes
          if (
            typeof value === "string" &&
            (value.includes(",") || value.includes('"'))
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }

          return value ?? "";
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${disposition.toUpperCase()}_${utcDateRange.from}_to_${
    utcDateRange.to
  }.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}
