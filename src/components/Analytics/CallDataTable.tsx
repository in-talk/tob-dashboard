import React, { useState, useMemo, useEffect } from "react";
import DataTable, { TableColumn } from "react-data-table-component";
import { useTheme } from "next-themes";
import { Search, Filter, Download, Phone, User } from "lucide-react";
import { CallRecord } from "@/types/callRecord";
import { useCallData } from "@/context/CallRecordContext";

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
  HP: "bg-pink-100 text-pink-800",
  FAS: "bg-gray-100 text-gray-800",
  RI: "bg-slate-100 text-slate-800",
};

const CallDataTable = () => {
  const [data, setData] = useState<CallRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDisposition, setFilterDisposition] = useState("");
  const [selectedRows, setSelectedRows] = useState<CallRecord[]>([]);
  const [toggleCleared, setToggleCleared] = useState(false);

  const { theme } = useTheme();
  const dispositions = [...new Set(data.map((item) => item.Disposition))];
  const { callData, loading } = useCallData();

  useEffect(() => {
    if (!loading && callData && callData.length > 0) {
      setData(callData);
    }
  }, [callData, loading]);

  // Filter data
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch = Object.values(item).some((value) =>
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesDisposition =
        filterDisposition === "" || item.Disposition === filterDisposition;
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

  // Define columns
  const columns: TableColumn<CallRecord>[] = [
    {
      name: "Sr No.",
      selector: (row: CallRecord) => row.SrNo,
      sortable: true,
      width: "150px",
      center: true,
    },
    {
      name: "Client ID",
      selector: (row: CallRecord) => row.ClientID,
      sortable: true,
      width: "100px",
      cell: (row: CallRecord) => (
        <span title={row.ClientID}>{row.ClientID}</span>
      ),
    },
    {
      name: "Time",
      selector: (row: CallRecord) => row.CallTime,
      sortable: true,
      width: "130px",
      center: true,
      cell: (row: CallRecord) => (
        <span title={row.CallTime}>{row.CallTime}</span>
      ),
    },
    {
      name: "Type",
      selector: (row: CallRecord) => row.CallType,
      sortable: true,
      width: "80px",
    },
    {
      name: "Disposition",
      selector: (row: CallRecord) => row.Disposition,
      sortable: true,
      width: "110px",
      center: true,
      cell: (row: CallRecord) => (
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDispositionColor(
            row.Disposition
          )}`}
          title={row.Disposition}
        >
          {row.Disposition}
        </span>
      ),
    },
    {
      name: "Transcription",
      selector: (row: CallRecord) => row.Transcription,
      sortable: true,
      center: false,
      cell: (row: CallRecord) => (
        <span title={row.Transcription}>{row.Transcription}</span>
      ),
    },
    {
      name: "D",
      selector: (row: CallRecord) => row.D || 0,
      sortable: true,
      width: "50px",
      center: true,
      cell: (row: CallRecord) => row.D,
    },
    {
      name: "Turns",
      selector: (row: CallRecord) => row.T || 0,
      sortable: true,
      width: "100px",
      center: true,
      cell: (row: CallRecord) => row.T,
    },
    {
      name: "Lead Id",
      selector: (row: CallRecord) => row.LeadID || 0,
      sortable: true,
      width: "100px",
      center: true,
      cell: (row: CallRecord) => row.LeadID,
    },
    {
      name: "Agent",
      selector: (row: CallRecord) => row.AgentName || "-",
      sortable: true,
      width: "80px",
      cell: (row: CallRecord) => (
        <span title={row.AgentName}>{row.AgentName || "-"}</span>
      ),
    },
    // {
    //   name: "Call Audio",
    //   selector: (row: CallRecord) => row.CallAudio || "-",
    //   sortable: true,
    //   center: true,
    //   cell: (row: CallRecord) => (
    //     <a
    //       className=" cursor-pointer hover:underline block text-blue-700 dark:text-blue-300"
    //       href={row.CallAudio}
    //     >
    //       {row.CallAudio}
    //     </a>
    //   ),
    // },
  ];

  // Custom styles for the data table
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
        minHeight: "48px",
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
      },
    },
    cells: {
      style: {
        paddingLeft: "12px",
        paddingRight: "12px",
        fontSize: "13px",
      },
    },
  };

  const LoadingComponent = () => (
    <div className="flex justify-center items-center h-40 bg-transparent">
      <div className="relative w-12 h-12 top-[170px]">
        <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
        <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-ping opacity-25"></div>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-light dark:bg-sidebar min-h-screen">
      <div className="max-w-full mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Call Detail Records</h1>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Search */}
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

          {/* Export and Clear Selection */}
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
            <p className="text-2xl font-bold text-blue-900">
              {filteredData.length}
            </p>
          </div>
          <div className="bg-indigo-100  dark:bg-indigo-400 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-900" />
              <span className="text-sm font-medium text-indigo-900">
                Total Agents
              </span>
            </div>
            <p className="text-2xl font-bold text-indigo-900">
              {
                new Set(
                  filteredData.map((call) => call.AgentName).filter(Boolean)
                ).size
              }
            </p>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-light dark:bg-sidebar border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <div className="w-full overflow-x-auto" style={{ maxWidth: "100vw" }}>
            <div style={{ minWidth: "1000px" }}>
              <DataTable
                title="Call Records"
                columns={columns}
                data={filteredData}
                progressPending={loading}
                progressComponent={<LoadingComponent />}
                pagination
                paginationPerPage={20}
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
