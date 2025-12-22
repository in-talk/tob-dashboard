"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  DataTable,
  DataTableFilterMeta,
  DataTableFilterMetaData,
  DataTablePageEvent,
} from "primereact/datatable";
import { Column, ColumnFilterElementTemplateOptions } from "primereact/column";
import { FilterMatchMode, FilterOperator } from "primereact/api";
import { InputText } from "primereact/inputtext";
import { Dropdown, DropdownChangeEvent } from "primereact/dropdown";
import { Paginator } from "primereact/paginator";
import {
  Search,
  Download,
  Headset,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { CallRecord } from "@/types/callRecord";
import { useSession } from "next-auth/react";
import { formatCallDuration } from "@/utils/formatCallDuration";
import AudioPlayer from "../AudioPlayer";
import { utcToCurrentTimezone } from "@/utils/timezone";
import { formatDateTime } from "@/utils/formatDateTime";
import SyncingProgressBars from "../ui/SyncingProgressBars";
import CallDetailsModal from "../CallDetailsModal";
import { exportDispositionCSV } from "@/utils/csvExport";

const DISPOSITION_COLORS: Record<string, string> = {
  XFER: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  DC: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  CALLBK: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  NI: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  DNC: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  DNQ: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  LB: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  A: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  DAIR: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  HP: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  FAS: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  RI: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
  NP: "bg-purple-100 text-purple-800 dark:bg-purple-700 dark:text-purple-200",
};

const DEFAULT_FILTER_COLOR =
  "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";

const ROWS_PER_PAGE_OPTIONS = [5, 10, 15, 20, 25, 50, 100, 200];

const GLOBAL_FILTER_FIELDS = [
  "agent",
  "call_id",
  "disposition",
  "label",
  "transcription",
  "caller_id",
];

const INITIAL_FILTERS: DataTableFilterMeta = {
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  agent: {
    operator: FilterOperator.AND,
    constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }],
  },
  call_id: {
    operator: FilterOperator.AND,
    constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }],
  },
  disposition: {
    operator: FilterOperator.OR,
    constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }],
  },
  created_at: {
    operator: FilterOperator.AND,
    constraints: [{ value: null, matchMode: FilterMatchMode.DATE_IS }],
  },
  turn: {
    operator: FilterOperator.AND,
    constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }],
  },
  label: {
    operator: FilterOperator.AND,
    constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }],
  },
  transcription: {
    operator: FilterOperator.AND,
    constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }],
  },
};

interface CallDataTableProps {
  callRecords: CallRecord[];
  isLoading: boolean;
  utcDateRange: {
    from: string;
    to: string;
  };
  pagination?: { page: number; pageSize: number };
  onPaginationChange?: (pagination: { page: number; pageSize: number }) => void;
  totalRecords?: number;
  serverSearchTerm?: string;
  onServerSearchChange?: (term: string) => void;
  searchType?: "call_id" | "caller_id";
  onSearchTypeChange?: (type: "call_id" | "caller_id") => void;
}

const CallDataTable: React.FC<CallDataTableProps> = ({
  callRecords,
  isLoading,
  utcDateRange,
  pagination,
  onPaginationChange,
  totalRecords: propTotalRecords,
  serverSearchTerm,
  onServerSearchChange,
  searchType = "caller_id",
  onSearchTypeChange,
}) => {
  const [data, setData] = useState<CallRecord[]>(callRecords);
  const [globalFilterValue, setGlobalFilterValue] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(true);
  const [filters, setFilters] = useState<DataTableFilterMeta>(INITIAL_FILTERS);
  const [localServerSearchTerm, setLocalServerSearchTerm] = useState(serverSearchTerm || "");

  const { data: session } = useSession();
  const role = session?.user?.role;

  useEffect(() => {
    setLocalServerSearchTerm(serverSearchTerm || "");
  }, [serverSearchTerm]);

  const handleServerSearch = useCallback(() => {
    if (onServerSearchChange) {
      onServerSearchChange(localServerSearchTerm);
    }
  }, [onServerSearchChange, localServerSearchTerm]);

  const handleClearServerSearch = useCallback(() => {
    setLocalServerSearchTerm("");
    if (onServerSearchChange) {
      onServerSearchChange("");
    }
  }, [onServerSearchChange]);

  const dispositions = useMemo(
    () => [...new Set(data.map((item) => item.disposition))],
    [data]
  );

  const dispositionOptions = useMemo(
    () => dispositions.map((d) => ({ label: d, value: d })),
    [dispositions]
  );

  const totalRecords = useMemo(
    () => propTotalRecords ?? ((data && data[0]?.total_records) || 0),
    [data, propTotalRecords]
  );

  const getDispositionColor = useCallback((disposition: string) => {
    return DISPOSITION_COLORS[disposition] || DEFAULT_FILTER_COLOR;
  }, []);

  const toggleAccordion = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const onPageChange = useCallback((event: DataTablePageEvent) => {
    if (onPaginationChange) {
      onPaginationChange({
        page: (event.page ?? 0) + 1,
        pageSize: event.rows,
      });
    }
  }, [onPaginationChange]);

  const first = useMemo(() => {
    if (pagination) {
      return (pagination.page - 1) * pagination.pageSize;
    }
    return 0;
  }, [pagination]);

  const rowsPerPage = useMemo(() => {
    if (pagination) {
      return pagination.pageSize;
    }
    return 20;
  }, [pagination]);

  const onGlobalFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFilters((prevFilters) => {
        const newFilters = { ...prevFilters };
        if (newFilters["global"]) {
          (newFilters["global"] as DataTableFilterMetaData).value = value;
        }
        return newFilters;
      });
      setGlobalFilterValue(value);
    },
    []
  );

  const exportData = useCallback(() => {
    exportDispositionCSV({
      callRecords: data,
      disposition: "TOTALCALLS",
      utcDateRange,
      role: session?.user?.role || "user",
    });
  }, [data, session?.user?.role, utcDateRange]);


  const handleOpenPlayer = useCallback((url: string) => {
    const playerUrl = `/audio-preview?url=${encodeURIComponent(url)}`;
    window.open(playerUrl, "_blank");
  }, []);

  // Template functions - memoized to prevent recreation
  const agentBodyTemplate = useCallback(
    (rowData: CallRecord) => (
      <span
        className="capitalize text-gray-900 dark:text-gray-100"
        title={rowData.agent}
      >
        {rowData.agent || "N/A"}
      </span>
    ),
    []
  );

  const callIdBodyTemplate = useCallback(
    (rowData: CallRecord) =>
      role === "admin" ? (
        <CallDetailsModal
          callId={rowData.call_id}
          clientId={rowData.client_id}
        />
      ) : (
        <span className="text-gray-900 dark:text-gray-100">
          {rowData.call_id}
        </span>
      ),
    [role]
  );

  const callerIdBodyTemplate = useCallback(
    (rowData: CallRecord) => (
      <span className="text-gray-900 dark:text-gray-100">
        {rowData.caller_id} {rowData.caller_count > 1 && role === "admin" ? `(${rowData.caller_count})` : ""}
      </span>
    ),
    []
  );

  const durationBodyTemplate = useCallback((rowData: CallRecord) => {
    const callDuration = formatCallDuration(rowData?.call_duration);
    return (
      <span className="text-gray-900 text-sm dark:text-gray-100">
        {callDuration || "-"}
      </span>
    );
  }, []);

  const createdAtBodyTemplate = useCallback((rowData: CallRecord) => {
    const currentTimezone = utcToCurrentTimezone(rowData.created_at);
    const createdAt = formatDateTime(currentTimezone);
    return (
      <span className="text-gray-900 text-sm dark:text-gray-100">
        {createdAt || "-"}
      </span>
    );
  }, []);

  const turnBodyTemplate = useCallback(
    (rowData: CallRecord) => (
      <p className="text-gray-900 text-sm text-center dark:text-gray-100">
        {rowData.turn ?? -1}
      </p>
    ),
    []
  );

  const dispositionBodyTemplate = useCallback(
    (rowData: CallRecord) => {
      const colorClass = getDispositionColor(rowData.disposition);
      return (
        <span
          className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${colorClass}`}
          title={rowData.disposition}
        >
          {rowData.disposition || "N/A"}
        </span>
      );
    },
    [getDispositionColor]
  );

  const audioBodyTemplate = useCallback(
    (rowData: CallRecord) =>
      role === "admin" ? (
        <AudioPlayer audioPath={rowData.call_recording_path} />
      ) : (
        <button
          className="text-blue-500 hover:text-blue-700 underline text-sm"
          onClick={() => handleOpenPlayer(rowData.call_recording_path)}
        >
          Call Audio
        </button>
      ),
    [role, handleOpenPlayer]
  );

  const labelBodyTemplate = useCallback(
    (rowData: CallRecord) => (
      <span className="text-gray-900 text-sm dark:text-gray-100">
        {rowData.label || "N/A"}
      </span>
    ),
    []
  );

  const transcriptionBodyTemplate = useCallback(
    (rowData: CallRecord) => (
      <span
        title={rowData.transcription}
        className="max-w-[200px] text-sm block whitespace-nowrap overflow-x-auto pb-1 text-gray-900 dark:text-gray-100"
      >
        {rowData.transcription}
      </span>
    ),
    []
  );

  const dispositionFilterTemplate = useCallback(
    (options: ColumnFilterElementTemplateOptions) => (
      <Dropdown
        value={options.value}
        options={dispositionOptions}
        onChange={(e: DropdownChangeEvent) =>
          options.filterCallback(e.value, options.index)
        }
        placeholder="Select Disposition"
        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
      />
    ),
    [dispositionOptions]
  );

  const searchTypeOptions = [
    { label: "Caller ID", value: "caller_id" },
    { label: "Call ID", value: "call_id" },
  ];

  const header = useMemo(
    () => (
      <div className="flex flex-wrap gap-4 justify-end items-center mb-2">
        <div className="flex gap-4 items-center">
          {onServerSearchChange && onSearchTypeChange && role === "admin" && (
            <div className="flex gap-2 items-center mr-4">
              <Dropdown
                value={searchType}
                options={searchTypeOptions}
                onChange={(e) => onSearchTypeChange(e.value)}
                className="w-32 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <InputText
                  value={localServerSearchTerm}
                  onChange={(e) => setLocalServerSearchTerm(e.target.value)}
                  placeholder={`Search ${searchType === "call_id" ? "Call ID" : "Caller ID"}`}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-64"
                />
              </div>
              <button
                onClick={handleServerSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
              {serverSearchTerm && (
                <button
                  onClick={handleClearServerSearch}
                  className="px-4 py-2 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <InputText
              value={globalFilterValue}
              onChange={onGlobalFilterChange}
              placeholder="Search current page..."
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <button
            onClick={exportData}
            className="px-4 py-2 rounded-lg cursor-pointer text-sm font-medium transition-all duration-300 flex items-center gap-2 bg-gradient-to-br from-blue-600 to-purple-600 text-white hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(102,126,234,0.4)]"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onServerSearchChange, onSearchTypeChange, role, searchType, localServerSearchTerm, handleServerSearch, serverSearchTerm, handleClearServerSearch, globalFilterValue, onGlobalFilterChange, exportData]
  );

  // Empty message component
  const emptyMessage = useMemo(
    () => (
      <div className="flex flex-col items-center justify-center py-12">
        <Headset className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          No call records found
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-sm">
          Try adjusting your search or filter criteria
        </p>
      </div>
    ),
    []
  );

  // DataTable pt configuration
  const ptConfig = useMemo(
    () => ({
      header: { className: "bg-white dark:bg-sidebar" },
      thead: { className: "dark:bg-sidebar" },
      tbody: { className: "dark:bg-sidebar" },
      headerRow: {
        className: "border-b dark:bg-sidebar text-sm border-gray-200 pb-2",
      },
      emptyMessage: { className: "dark:bg-sidebar" },
      paginator: { root: { className: "dark:bg-sidebar" } },
      bodyRow: {
        className:
          "border-b border-gray-200 dark:bg-sidebar dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700",
      },
    }),
    []
  );

  // Column style configurations
  const columnStyles = useMemo(
    () => ({
      base: { padding: "0", background: "transparent" },
      agent: { minWidth: "0px" },
      callId: { minWidth: "80px" },
      callerId: { minWidth: "100px" },
      duration: { minWidth: "80px" },
      createdAt: { minWidth: "120px" },
      turn: { minWidth: "60px" },
      disposition: { minWidth: "70px" },
      audio: { minWidth: role === "admin" ? "200px" : "120px" },
      label: { minWidth: "100px" },
      transcription: { minWidth: "200px" },
    }),
    [role]
  );

  // Effects
  useEffect(() => {
    setData(callRecords);
  }, [callRecords]);

  return (
    <div className="p-2 bg-gray-100 dark:bg-sidebar rounded-xl">
      <div className="pt-1 min-h-[4px]">
        {isLoading && <SyncingProgressBars />}
      </div>
      <div className="max-w-full mx-auto">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
          <div
            className="p-2 bg-white dark:bg-sidebar border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
            onClick={toggleAccordion}
          >
            <div className="flex items-center justify-between">
              {isLoading && callRecords.length > 0 && (
                <div className="absolute top-0 left-0 h-1 w-full z-10 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 animate-pulse rounded-t-md" />
              )}
              <div className="flex items-center gap-3">
                <Headset className="w-5 h-5" />
                <div>
                  <h3 className="text-md font-semibold text-gray-900 dark:text-white">
                    Call Records
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {totalRecords} total records
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {isExpanded ? "Collapse" : "Expand"}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-500 transition-transform duration-200" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500 transition-transform duration-200" />
                )}
              </div>
            </div>
          </div>

          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? "max-h-full opacity-100" : "max-h-0 opacity-0"
              }`}
          >
            <div className="px-4 py-0">
              <DataTable
                value={data}
                header={header}
                // Only enable built-in paginator if NOT using server-side pagination
                paginator={!pagination}
                // Disable lazy loading to allow client-side filtering on the current page data
                lazy={false}
                totalRecords={!pagination ? Number(totalRecords) : undefined}
                scrollable
                scrollHeight="600px"
                first={!pagination ? first : undefined}
                onPage={!pagination ? onPageChange : undefined}
                paginatorLeft={!pagination}
                paginatorTemplate="RowsPerPageDropdown CurrentPageReport PrevPageLink NextPageLink"
                rows={rowsPerPage}
                rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                currentPageReportTemplate=" {first} - {last} of {totalRecords}"
                dataKey="call_id"
                filters={filters}
                filterDisplay="menu"
                globalFilterFields={GLOBAL_FILTER_FIELDS}
                emptyMessage={emptyMessage}
                stripedRows
                size="small"
                showGridlines
                className="custom-datatable"
                pt={ptConfig}
              >
                <Column
                  field="agent"
                  header="Agent"
                  sortable
                  filter
                  headerStyle={{ marginRight: "8px" }}
                  filterPlaceholder="Search by agent"
                  style={{ ...columnStyles.base, ...columnStyles.agent }}
                  body={agentBodyTemplate}
                />
                {role === "admin" && (
                  <Column
                    field="call_id"
                    header="Call ID"
                    sortable
                    filter
                    filterPlaceholder="Search by call ID"
                    style={{ ...columnStyles.base, ...columnStyles.callId }}
                    body={callIdBodyTemplate}
                  />
                )}

                <Column
                  field="caller_id"
                  header="Caller ID"
                  sortable
                  filter
                  filterPlaceholder="Search by caller ID"
                  style={{ ...columnStyles.base, ...columnStyles.callerId }}
                  body={callerIdBodyTemplate}
                />

                <Column
                  field="call_duration"
                  header="Duration"
                  sortable
                  style={{ ...columnStyles.base, ...columnStyles.duration }}
                  body={durationBodyTemplate}
                />

                <Column
                  field="created_at"
                  header="Created At"
                  sortable
                  filterField="created_at"
                  style={{ ...columnStyles.base, ...columnStyles.createdAt }}
                  body={createdAtBodyTemplate}
                />
                {role === "admin" && (
                  <Column
                    field="turn"
                    header="T"
                    sortable
                    filter
                    dataType="numeric"
                    style={{ ...columnStyles.base, ...columnStyles.turn }}
                    body={turnBodyTemplate}
                  />
                )}
                <Column
                  field="disposition"
                  header="D"
                  sortable
                  filter
                  filterMenuStyle={{ width: "14rem" }}
                  style={{ ...columnStyles.base, ...columnStyles.disposition }}
                  body={dispositionBodyTemplate}
                  filterElement={dispositionFilterTemplate}
                />

                <Column
                  field="call_recording_path"
                  header="Call Audio"
                  style={{ ...columnStyles.base, ...columnStyles.audio }}
                  body={audioBodyTemplate}
                />

                {role === "admin" && (
                  <Column
                    field="label"
                    header="Label"
                    sortable
                    filter
                    filterPlaceholder="Search by label"
                    style={{ ...columnStyles.base, ...columnStyles.label }}
                    className="p-1"
                    body={labelBodyTemplate}
                  />
                )}

                {role === "admin" && (
                  <Column
                    field="transcription"
                    header="Transcription"
                    filter
                    filterPlaceholder="Search transcription"
                    style={{
                      ...columnStyles.base,
                      ...columnStyles.transcription,
                    }}
                    body={transcriptionBodyTemplate}
                  />
                )}
              </DataTable>

              {/* Standalone Paginator for Server-Side Pagination */}
              {pagination && (
                <Paginator
                  first={first}
                  rows={rowsPerPage}
                  totalRecords={Number(totalRecords)}
                  rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                  onPageChange={(e) => {
                    if (onPaginationChange) {
                      onPaginationChange({
                        page: (e.page ?? 0) + 1,
                        pageSize: e.rows,
                      });
                    }
                  }}
                  template="RowsPerPageDropdown CurrentPageReport PrevPageLink NextPageLink"
                  leftContent={<div />} // Spacer to match DataTable style if needed
                  className="dark:bg-sidebar border-t border-gray-200 dark:border-gray-700"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CallDataTable);
