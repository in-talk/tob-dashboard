"use client";

import React, { useState, useMemo } from "react";
import DataTable, { TableColumn } from "react-data-table-component";
import { useTheme } from "next-themes";
import { Search, Filter, Download, Phone, User } from "lucide-react";
import { CallRecord } from "@/types/callRecord";
import { useSession } from "next-auth/react";
import { formatCallDuration } from "@/utils/formatCallDuration";
import AudioPlayer from "../AudioPlayer";
import { generateAudioUrl } from "@/utils/WasabiClient";
import { formatDateTime } from "@/utils/formatDateTime";

const dispositionColors: Record<string, string> = {
  XFER: "bg-blue-100 text-blue-800",
  DC: "bg-red-100 text-red-800",
  CALLBK: "bg-green-100 text-green-800",
  NI: "bg-yellow-100 text-yellow-800",
  DNC: "bg-purple-100 text-purple-800",
  DNQ: "bg-orange-100 text-orange-800",
  LB: "bg-cyan-100 text-cyan-800",
  AM: "bg-teal-100 text-teal-800",
  DAIR: "bg-indigo-100 text-indigo-800",
  PQ2: "bg-pink-100 text-pink-800",
  NT: "bg-gray-100 text-gray-800",
  P: "bg-slate-100 text-slate-800",
};

const CallDataTable = ({ callRecords }: { callRecords: CallRecord[] }) => {
  const [data, setData] = useState<CallRecord[]>(callRecords);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDisposition, setFilterDisposition] = useState("");
  const [selectedRows, setSelectedRows] = useState<CallRecord[]>([]);
  const [toggleCleared, setToggleCleared] = useState(false);
  const { theme } = useTheme();
  const dispositions = [...new Set(data.map((item) => item.disposition))];
  const [callsLoading, setCallsLoading] = useState(false);
  const { data: session } = useSession();

  const fetchCallRecords = async (page: number) => {
    try {
      setCallsLoading(true);
      const client_id = session?.user?.client_id;

      if (!client_id) {
        setCallsLoading(false);
        return null;
      }

      const res = await fetch("/api/fetchCallRecords", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id,
          page,
          num_of_records: 10,
          caller_id: null,
        }),
      });

      const result = await res.json();

      if (!res.ok)
        throw new Error(result.error || "Failed to fetch call records");

      setData(result.callRecords || []);
    } catch (err) {
      console.error("Error fetching records:", err);
    } finally {
      setCallsLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch = Object.values(item).some((value) =>
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesDisposition =
        filterDisposition === "" || item.disposition === filterDisposition;
      return matchesSearch && matchesDisposition;
    });
  }, [data, searchTerm, filterDisposition]);

  const getDispositionColor = (disposition: string) => {
    return dispositionColors[disposition] || "bg-gray-100 text-gray-800";
  };

  const exportData = () => {
    if (data.length === 0) return;

    const csv = [
      Object.keys(data[0]).join(","),
      ...filteredData.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "call-data.csv";
    a.click();
  };

  const handleClearRows = () => {
    setToggleCleared(!toggleCleared);
    setSelectedRows([]);
  };

  const columns: TableColumn<CallRecord>[] = [
    {
      name: "Call Id",
      selector: (row: CallRecord) => row.call_id,
      sortable: true,
      width: "110px",
    },
    {
      name: "D",
      selector: (row: CallRecord) => row.call_duration?.minutes,
      sortable: true,
      width: "70px",
      cell: (row: CallRecord) => {
        const callDuration = formatCallDuration(row?.call_duration);
        return <span>{callDuration || "-"}</span>;
      },
    },
    {
      name: "Created at",
      selector: (row: CallRecord) => row.created_at,
      sortable: true,
      width: "200px",
      cell: (row: CallRecord) => {
        const createdAt = formatDateTime(row.created_at);
        return <span>{createdAt || "-"}</span>;
      },
    },
    {
      name: "T",
      selector: (row: CallRecord) => row.turn || 0,
      sortable: true,
      width: "50px",
      cell: (row: CallRecord) => row.turn || -1,
    },
    {
      name: "Disposition",
      selector: (row: CallRecord) => row.disposition,
      sortable: true,
      width: "110px",
      cell: (row: CallRecord) => (
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDispositionColor(
            row.disposition
          )}`}
          title={row.disposition}
        >
          {row.disposition || "N/A"}
        </span>
      ),
    },
    {
      name: "Call Recording",
      selector: (row: CallRecord) => row.call_recording_path,
      sortable: false,
      width: "300px",
      cell: (row: CallRecord) => {
        const audioUrl = generateAudioUrl(row.call_recording_path);
        return <AudioPlayer audioUrl={audioUrl} />;
      },
    },
    {
      name: "Label",
      selector: (row: CallRecord) => row.label || 0,
      sortable: true,
      width: "100px",
      cell: (row: CallRecord) => row.label || "N/A",
    },

    {
      name: "Agent",
      selector: (row: CallRecord) => row.agent || "-",
      sortable: true,
      width: "100px",
      cell: (row: CallRecord) => (
        <span className="capitalize" title={row.agent}>
          {row.agent || "N/A"}
        </span>
      ),
    },
  ];

  if (session?.user?.role === "admin") {
    columns.push({
      name: "Transcription",
      selector: (row: CallRecord) => row.transcription,
      sortable: true,
      width: "100px",
      cell: (row: CallRecord) => (
        <span title={row.transcription}>{row.transcription}</span>
      ),
    });
  }
  const customStyles = {
    table: {
      style: {
        width: "100%",
      },
    },
    tableWrapper: {
      style: {
        display: "table",
        width: "100%",
      },
    },
    rows: {
      style: {
        minHeight: "70px",
        "&:hover": {
          backgroundColor: "#f9fafb",
        },
      },
    },
    headCells: {
      style: {
        paddingLeft: "12px",
        paddingRight: "12px",
        fontWeight: "600",
        fontSize: "11px",
        textTransform: "uppercase" as const,
        justifyContent: "center" as const,
      },
    },
    cells: {
      style: {
        paddingLeft: "12px",
        paddingRight: "12px",
        fontSize: "13px",
        justifyContent: "center" as const,
      },
    },
  };

  const LoadingComponent = () => (
    <div className="flex justify-center items-center h-screen bg-transparent">
      <div className="relative w-12 h-12 -top-[120px]">
        <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
        <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-ping opacity-25"></div>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-light dark:bg-sidebar min-h-screen">
      <div className="max-w-full mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Call Records</h1>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search calls..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={filterDisposition}
                onChange={(e) => setFilterDisposition(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="">All Dispositions</option>
                {dispositions.map((disposition) => (
                  <option key={disposition} value={disposition}>
                    {disposition}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            {selectedRows.length > 0 && (
              <button
                onClick={handleClearRows}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Clear Selection ({selectedRows.length})
              </button>
            )}
            <button
              onClick={exportData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-100 dark:bg-blue-400 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-blue-900" />
              <span className="text-sm font-medium text-blue-900">
                Total Calls
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{data.length}</p>
          </div>
          <div className="bg-indigo-100  dark:bg-indigo-400 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-900" />
              <span className="text-sm font-medium text-indigo-900">
                Total Agents
              </span>
            </div>
            <p className="text-2xl font-bold text-indigo-900">
              {new Set(data.map((call) => call.agent).filter(Boolean)).size}
            </p>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-light dark:bg-sidebar border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <div className="w-full overflow-auto max-w-[100vw] ">
            <div>
              <DataTable
                title="Call Records"
                columns={columns}
                data={filteredData}
                progressPending={callsLoading}
                progressComponent={<LoadingComponent />}
                pagination
                paginationServer
                paginationPerPage={10}
                onChangePage={fetchCallRecords}
                paginationTotalRows={Number(filteredData[0]?.total_records)}
                paginationRowsPerPageOptions={[5, 10, 15, 20, 25, 50, 100]}
                clearSelectedRows={toggleCleared}
                customStyles={customStyles}
                theme={theme}
                highlightOnHover
                pointerOnHover
                responsive
                fixedHeader
                fixedHeaderScrollHeight="500px"
                noDataComponent={
                  <div className="flex flex-col items-center justify-center py-12">
                    <Phone className="w-12 h-12 text-gray-300 mb-4" />
                    <p className="text-gray-500 text-lg">
                      No call records found
                    </p>
                    <p className="text-gray-400 text-sm">
                      Try adjusting your search or filter criteria
                    </p>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallDataTable;
