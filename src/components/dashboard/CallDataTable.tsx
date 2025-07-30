// "use client";

// import React, { useState, useMemo, useEffect } from "react";
// import DataTable, { TableColumn } from "react-data-table-component";
// import { useTheme } from "next-themes";
// import { Search, Filter, Download, Headset } from "lucide-react";
// import { CallRecord } from "@/types/callRecord";
// import { useSession } from "next-auth/react";
// import { formatCallDuration } from "@/utils/formatCallDuration";
// import AudioPlayer from "../AudioPlayer";
// import { formatDateTime } from "@/utils/formatDateTime";
// import CallDetailsModal from "../CallDetailsModal";
// import { utcToCurrentTimezone } from "@/utils/timezone";

// const dispositionColors: Record<string, string> = {
//   XFER: "bg-blue-100 text-blue-800",
//   DC: "bg-red-100 text-red-800",
//   CALLBK: "bg-green-100 text-green-800",
//   NI: "bg-yellow-100 text-yellow-800",
//   DNC: "bg-purple-100 text-purple-800",
//   DNQ: "bg-orange-100 text-orange-800",
//   LB: "bg-cyan-100 text-cyan-800",
//   A: "bg-teal-100 text-teal-800",
//   DAIR: "bg-indigo-100 text-indigo-800",
//   HP: "bg-pink-100 text-pink-800",
//   FAS: "bg-gray-100 text-gray-800",
//   RI: "bg-slate-100 text-slate-800",
// };

// const CallDataTable = ({
//   callRecords,
//   dateRange,
// }: {
//   callRecords: CallRecord[];
//   dateRange: { from: string; to: string };
// }) => {
//   const [data, setData] = useState<CallRecord[]>(callRecords);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [filterDisposition, setFilterDisposition] = useState("");
//   const [selectedRows, setSelectedRows] = useState<CallRecord[]>([]);
//   const [toggleCleared, setToggleCleared] = useState(false);
//   const { theme } = useTheme();
//   const dispositions = [...new Set(data.map((item) => item.disposition))];
//   const [callsLoading, setCallsLoading] = useState(false);
//   const [rowsPerPage, setRowperPage] = useState(10);

//   const { data: session } = useSession();

//   const role = session?.user?.role

//   useEffect(() => {
//     setData(callRecords);
//   }, [callRecords]);

//   const fetchNextCallRecords = async (
//     page: number,
//     num_of_records = rowsPerPage
//   ) => {
//     try {
//       setCallsLoading(true);
//       const client_id = session?.user?.client_id;

//       if (!client_id) {
//         setCallsLoading(false);
//         return null;
//       }

//       const res = await fetch("/api/fetchCallRecords", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           client_id,
//           from_date: dateRange.from,
//           to_date: dateRange.to,
//           caller_id: null,
//           page,
//           num_of_records,
//         }),
//       });

//       const result = await res.json();

//       if (!res.ok)
//         throw new Error(result.error || "Failed to fetch call records");

//       setData(result.callRecords || []);
//     } catch (err) {
//       console.error("Error fetching records:", err);
//     } finally {
//       setCallsLoading(false);
//     }
//   };

//   const filteredData = useMemo(() => {
//     return data.filter((item) => {
//       const matchesSearch = Object.values(item).some((value) =>
//         value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
//       );
//       const matchesDisposition =
//         filterDisposition === "" || item.disposition === filterDisposition;
//       return matchesSearch && matchesDisposition;
//     });
//   }, [data, searchTerm, filterDisposition]);

//   const getDispositionColor = (disposition: string) => {
//     return dispositionColors[disposition] || "bg-gray-100 text-gray-800";
//   };

//   const exportData = () => {
//     if (data.length === 0) return;

//     const csv = [
//       Object.keys(data[0]).join(","),
//       ...filteredData.map((row) => Object.values(row).join(",")),
//     ].join("\n");

//     const blob = new Blob([csv], { type: "text/csv" });
//     const url = window.URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = "call-data.csv";
//     a.click();
//   };
//   const handleRowsPerPageChange = (newRowsPerPage: number, page: number) => {
//     if (newRowsPerPage !== rowsPerPage) {
//       setRowperPage(newRowsPerPage);
//       fetchNextCallRecords(page, newRowsPerPage);
//     }
//   };

//   const handleClearRows = () => {
//     setToggleCleared(!toggleCleared);
//     setSelectedRows([]);
//   };

//   const handleOpenPlayer = (url: string) => {
//     const playerUrl = `/audio-preview?url=${encodeURIComponent(url)}`;
//     window.open(playerUrl, "_blank");
//   };

//   const columns: TableColumn<CallRecord>[] = [
//     {
//       name: "Agent",
//       selector: (row: CallRecord) => row.agent || "-",
//       sortable: true,
//       width: "100px",
//       cell: (row: CallRecord) => (
//         <span className="capitalize px-2" title={row.agent}>
//           {row.agent || "N/A"}
//         </span>
//       ),
//     },
//     {
//       name: "Call Id",
//       selector: (row: CallRecord) => row.call_id,
//       sortable: true,
//       width: "90px",
//       cell: (row: CallRecord) => {
//         return role === "admin" ? (
//           <CallDetailsModal callId={row.call_id} />
//         ) : (
//           <span>{row.call_id}</span>
//         );
//       },
//     },
//     {
//       name: "D",
//       selector: (row: CallRecord) => row.call_duration?.minutes,
//       sortable: true,
//       width: "70px",
//       cell: (row: CallRecord) => {
//         const callDuration = formatCallDuration(row?.call_duration);
//         return <span>{callDuration || "-"}</span>;
//       },
//     },
//     {
//       name: "Created at",
//       selector: (row: CallRecord) => row.created_at,
//       sortable: true,
//       width: "170px",
//       cell: (row: CallRecord) => {
//         const CurrentTimezone = utcToCurrentTimezone(row.created_at)
//         const createdAt = formatDateTime(CurrentTimezone);
//         return <span>{createdAt || "-"}</span>;
//       },
//     },
//     {
//       name: "T",
//       selector: (row: CallRecord) => row.turn || 0,
//       sortable: true,
//       width: "50px",
//       cell: (row: CallRecord) => row.turn || -1,
//     },
//     {
//       name: "Disposition",
//       selector: (row: CallRecord) => row.disposition,
//       sortable: true,
//       width: "110px",
//       cell: (row: CallRecord) => (
//         <span
//           className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDispositionColor(
//             row.disposition
//           )}`}
//           title={row.disposition}
//         >
//           {row.disposition || "N/A"}
//         </span>
//       ),
//     },
//     {
//       name: "Call Audio",
//       selector: (row: CallRecord) => row.call_recording_path,
//       sortable: false,
//       width: role === "admin" ? "200px" : "100px",
//       cell: (row: CallRecord) => {
//         return role === "admin" ? (
//           <AudioPlayer audioPath={row.call_recording_path} />
//         ) : (
//           <span
//             className="text-blue-500 underline"
//             onClick={() => handleOpenPlayer(row.call_recording_path)}
//           >
//             Call Audio
//           </span>
//         );
//       },
//     },
//     {
//       name: "Label",
//       selector: (row: CallRecord) => row.label || 0,
//       sortable: true,
//       width: "100px",
//       cell: (row: CallRecord) => row.label || "N/A",
//     },
//   ];

//   if (role === "admin") {
//     columns.push({
//       name: "Transcription",
//       selector: (row: CallRecord) => row.transcription,
//       style: {
//         justifyContent: "flex-start",
//       },
//       cell: (row: CallRecord) => (
//         <span title={row.transcription} className="text-left max-w-[200px] pb-2 whitespace-nowrap overflow-x-auto">
//           {row.transcription}
//         </span>
//       ),
//     });
//   }
//   const customStyles = {
//     table: {
//       style: {
//         width: "100%",
//       },
//     },
//     tableWrapper: {
//       style: {
//         display: "table",
//         width: "100%",
//       },
//     },
//     rows: {
//       style: {
//         minHeight: "30px",
//         "&:hover": {
//           backgroundColor: "#f9fafb",
//         },
//       },
//     },
//     headCells: {
//       style: {
//         paddingLeft: "12px",
//         paddingRight: "12px",
//         fontWeight: "600",
//         fontSize: "11px",
//         textTransform: "uppercase" as const,
//         justifyContent: "start" as const,
//       },
//     },
//     cells: {
//       style: {
//         paddingLeft: "12px",
//         paddingRight: "12px",
//         fontSize: "13px",
//         justifyContent: "start" as const,
//       },
//     },
//   };

//   const LoadingComponent = () => (
//     <div className="flex justify-center items-center h-screen bg-transparent">
//       <div className="relative w-12 h-12 -top-[120px]">
//         <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
//         <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-ping opacity-25"></div>
//       </div>
//     </div>
//   );

//   return (
//     <div className="p-6 bg-gray-100 dark:bg-sidebar rounded-xl ">
//       <div className="max-w-full mx-auto">
//         <div className="mb-6">
//           <h1 className="text-2xl font-bold mb-2">Call Records</h1>
//         </div>

//         <div className="mb-2 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
//           <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
//             <div className="relative">
//               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
//               <input
//                 type="text"
//                 placeholder="Search calls..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="pl-10 pr-4 py-0 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//               />
//             </div>

//             {/* Filter */}
//             <div className="relative">
//               <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
//               <select
//                 value={filterDisposition}
//                 onChange={(e) => setFilterDisposition(e.target.value)}
//                 className="pl-10 pr-8 py-0 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
//               >
//                 <option value="" className="text-sm">
//                   All Dispositions
//                 </option>
//                 {dispositions.map((disposition) => (
//                   <option key={disposition} value={disposition}>
//                     {disposition}
//                   </option>
//                 ))}
//               </select>
//             </div>
//           </div>

//           <div className="flex gap-2">
//             {selectedRows.length > 0 && (
//               <button
//                 onClick={handleClearRows}
//                 className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
//               >
//                 Clear Selection ({selectedRows.length})
//               </button>
//             )}
//             <button
//               onClick={exportData}
//               className="px-5 py-1 rounded-lg cursor-pointer text-sm font-medium transition-all duration-300 flex items-center gap-2 bg-gradient-to-br from-blue-600 to-purple-600 text-white hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(102,126,234,0.4)]"
//             >
//               <Download className="w-2 h-2" />
//               Export CSV
//             </button>
//           </div>
//         </div>

//         {/* Data Table */}
//         <div className="bg-light dark:bg-sidebar border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
//           <div className="w-full overflow-auto max-w-[100vw] ">
//             <div>
//               <DataTable
//                 title=""
//                 columns={columns}
//                 data={filteredData}
//                 progressPending={callsLoading}
//                 progressComponent={<LoadingComponent />}
//                 pagination
//                 paginationServer
//                 paginationPerPage={rowsPerPage}
//                 onChangeRowsPerPage={handleRowsPerPageChange}
//                 onChangePage={(page) => fetchNextCallRecords(page, rowsPerPage)}
//                 paginationTotalRows={Number(filteredData[0]?.total_records)}
//                 paginationRowsPerPageOptions={[5, 10, 15, 20, 25, 50, 100]}
//                 clearSelectedRows={toggleCleared}
//                 customStyles={customStyles}
//                 theme={theme}
//                 highlightOnHover
//                 pointerOnHover
//                 responsive
//                 fixedHeader
//                 fixedHeaderScrollHeight="500px"
//                 noDataComponent={
//                   <div className="flex flex-col items-center justify-center py-12">
//                     <Headset className="w-12 h-12 text-gray-300 mb-4" />
//                     <p className="text-gray-300 text-lg">
//                       No call records found
//                     </p>
//                     <p className="text-gray-300 text-sm">
//                       Try adjusting your search or filter criteria
//                     </p>
//                   </div>
//                 }
//               />
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CallDataTable;

"use client";

import React, { useState, useEffect } from "react";
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
import CallDetailsModal from "../CallDetailsModal";
import { utcToCurrentTimezone } from "@/utils/timezone";
import { formatDateTime } from "@/utils/formatDateTime";

const dispositionColors: Record<string, string> = {
  XFER: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  DC: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  CALLBK: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  NI: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  DNC: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  DNQ: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  LB: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  A: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  DAIR: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  HP: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  FAS: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  RI: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
};

const CallDataTable = ({ callRecords }: { callRecords: CallRecord[] }) => {
  const [data, setData] = useState<CallRecord[]>(callRecords);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [globalFilterValue, setGlobalFilterValue] = useState<string>("");
  const [first, setFirst] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleAccordion = () => {
    setIsExpanded(!isExpanded);
  };

  // const { theme } = useTheme();
  const { data: session } = useSession();
  const role = session?.user?.role;

  // PrimeReact filter configuration
  const [filters, setFilters] = useState<DataTableFilterMeta>({
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
  });

  const dispositions = [...new Set(data.map((item) => item.disposition))];
  useEffect(() => {
    setData(callRecords);
  }, [callRecords]);

  // const fetchNextCallRecords = async (
  //   page: number,
  //   num_of_records = rowsPerPage
  // ) => {
  //   try {
  //     setCallsLoading(true);
  //     const client_id = session?.user?.client_id;

  //     if (!client_id) {
  //       setCallsLoading(false);
  //       return null;
  //     }

  //     const res = await fetch("/api/fetchCallRecords", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         client_id,
  //         from_date: dateRange.from,
  //         to_date: dateRange.to,
  //         caller_id: null,
  //         page,
  //         num_of_records,
  //       }),
  //     });

  //     const result = await res.json();

  //     if (!res.ok)
  //       throw new Error(result.error || "Failed to fetch call records");

  //     const processedData = (result.callRecords || []).map(
  //       (record: CallRecord) => ({
  //         ...record,
  //         created_at_date: new Date(utcToCurrentTimezone(record.created_at)),
  //       })
  //     );

  //     setData(processedData);
  //   } catch (err) {
  //     console.error("Error fetching records:", err);
  //   } finally {
  //     setCallsLoading(false);
  //   }
  // };

  const onPageChange = (event: DataTablePageEvent) => {
    // const newPage = event.page! + 1;
    const rows = event.rows;
    setRowsPerPage(rows);
    setFirst(event.first);
    // fetchNextCallRecords(newPage, rows);
  };

  const getDispositionColor = (disposition: string) => {
    return (
      dispositionColors[disposition] ||
      "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
    );
  };

  const exportData = () => {
    if (data.length === 0) return;

    const csv = [
      Object.keys(data[0]).join(","),
      ...data.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "call-data.csv";
    a.click();
  };

  const handleOpenPlayer = (url: string) => {
    const playerUrl = `/audio-preview?url=${encodeURIComponent(url)}`;
    window.open(playerUrl, "_blank");
  };

  // Global filter change handler
  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const _filters = { ...filters };

    if (_filters["global"]) {
      (_filters["global"] as DataTableFilterMetaData).value = value;
    }

    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  // Header template
  const renderHeader = () => {
    return (
      <div className="flex flex-wrap gap-4 justify-end items-center mb-6">
        <div className="flex gap-4 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <InputText
              value={globalFilterValue}
              onChange={onGlobalFilterChange}
              placeholder="Search calls..."
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
    );
  };

  // Column body templates
  const agentBodyTemplate = (rowData: CallRecord) => {
    return (
      <span
        className="capitalize text-gray-900 dark:text-gray-100"
        title={rowData.agent}
      >
        {rowData.agent || "N/A"}
      </span>
    );
  };

  const callIdBodyTemplate = (rowData: CallRecord) => {
    return role === "admin" ? (
      <CallDetailsModal callId={rowData.call_id} />
    ) : (
      <span className="text-gray-900 dark:text-gray-100">
        {rowData.call_id}
      </span>
    );
  };

  const callerIdBodyTemplate = (rowData: CallRecord) => {
    return (
      <span className="text-gray-900 dark:text-gray-100">
        {rowData.caller_id}
      </span>
    );
  };

  const durationBodyTemplate = (rowData: CallRecord) => {
    const callDuration = formatCallDuration(rowData?.call_duration);
    return (
      <span className="text-gray-900 text-sm dark:text-gray-100">
        {callDuration || "-"}
      </span>
    );
  };

  const createdAtBodyTemplate = (rowData: CallRecord) => {
    const CurrentTimezone = utcToCurrentTimezone(rowData.created_at);
    const createdAt = formatDateTime(CurrentTimezone);

    return (
      <span className="text-gray-900 text-sm dark:text-gray-100">
        {createdAt || "-"}
      </span>
    );
  };

  const turnBodyTemplate = (rowData: CallRecord) => {
    return (
      <p className="text-gray-900 text-sm text-center dark:text-gray-100">
        {rowData.turn || -1}
      </p>
    );
  };

  const dispositionBodyTemplate = (rowData: CallRecord) => {
    const colorClass = getDispositionColor(rowData.disposition);
    return (
      <span
        className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${colorClass}`}
        title={rowData.disposition}
      >
        {rowData.disposition || "N/A"}
      </span>
    );
  };

  const audioBodyTemplate = (rowData: CallRecord) => {
    return role === "admin" ? (
      <AudioPlayer audioPath={rowData.call_recording_path} />
    ) : (
      <button
        className="text-blue-500 hover:text-blue-700 underline text-sm"
        onClick={() => handleOpenPlayer(rowData.call_recording_path)}
      >
        Call Audio
      </button>
    );
  };

  const labelBodyTemplate = (rowData: CallRecord) => {
    return (
      <span className="text-gray-900 text-sm dark:text-gray-100">
        {rowData.label || "N/A"}
      </span>
    );
  };

  const transcriptionBodyTemplate = (rowData: CallRecord) => {
    return (
      <span
        title={rowData.transcription}
        className="max-w-[200px] text-sm block whitespace-nowrap overflow-x-auto pb-1 text-gray-900 dark:text-gray-100"
      >
        {rowData.transcription}
      </span>
    );
  };

  // Filter templates
  const dispositionFilterTemplate = (
    options: ColumnFilterElementTemplateOptions
  ) => {
    return (
      <Dropdown
        value={options.value}
        options={dispositions.map((d) => ({ label: d, value: d }))}
        onChange={(e: DropdownChangeEvent) =>
          options.filterCallback(e.value, options.index)
        }
        placeholder="Select Disposition"
        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
      />
    );
  };

  // const dateFilterTemplate = (options: ColumnFilterElementTemplateOptions) => {
  //   return (
  //     <Calendar
  //       value={options.value}
  //       onChange={(e) => options.filterCallback(e.value, options.index)}
  //       dateFormat="mm/dd/yy"
  //       placeholder="mm/dd/yyyy"
  //       className="w-full border border-gray-300  dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
  //     />
  //   );
  // };

  const header = renderHeader();

  return (
    <div className="p-6 bg-gray-100 dark:bg-sidebar rounded-xl">
      <div className="max-w-full mx-auto">
        <div className=" border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
          <div
            className="p-4 bg-white dark:bg-sidebar border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
            onClick={toggleAccordion}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Headset className="w-5 h-5 " />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Call Records
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {(data && data[0]?.total_records) || 0} total records
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
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isExpanded ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="p-4">
              <DataTable
                value={data}
                header={header}
                totalRecords={Number(data && data[0]?.total_records)}
                scrollable
                scrollHeight="600px"
                paginator
                first={first}
                onPage={onPageChange}
                paginatorLeft
                paginatorTemplate="RowsPerPageDropdown CurrentPageReport PrevPageLink NextPageLink"
                rows={rowsPerPage}
                rowsPerPageOptions={[5, 10, 15, 20, 25, 50, 100]}
                currentPageReportTemplate=" {first} - {last} of {totalRecords}"
                dataKey="call_id"
                filters={filters}
                filterDisplay="menu"
                globalFilterFields={[
                  "agent",
                  "call_id",
                  "disposition",
                  "label",
                  "transcription",
                ]}
                emptyMessage={
                  <div className="flex flex-col items-center justify-center py-12">
                    <Headset className="w-12 h-12 text-gray-300 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-lg">
                      No call records found
                    </p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm">
                      Try adjusting your search or filter criteria
                    </p>
                  </div>
                }
                stripedRows
                size="small"
                showGridlines
                className="custom-datatable"
                pt={{
                  header: {
                    className: "bg-white dark:bg-sidebar",
                  },
                  thead: {
                    className: "dark:bg-sidebar",
                  },
                  tbody: {
                    className: "dark:bg-sidebar",
                  },
                  headerRow: {
                    className:
                      "border-b dark:bg-sidebar text-sm border-gray-200",
                  },
                  emptyMessage: {
                    className: "dark:bg-sidebar",
                  },

                  paginator: {
                    root: {
                      className: "dark:bg-sidebar",
                    },
                  },
                  bodyRow: {
                    className:
                      "border-b border-gray-200 dark:bg-sidebar dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700",
                  },
                }}
              >
                <Column
                  field="agent"
                  header="Agent"
                  sortable
                  filter
                  headerStyle={{ marginRight: "8px" }}
                  filterPlaceholder="Search by agent"
                  style={{
                    minWidth: "0px",
                    padding: "0",
                    background: "transparent",
                  }}
                  body={agentBodyTemplate}
                />

                <Column
                  field="call_id"
                  header="Call ID"
                  sortable
                  filter
                  filterPlaceholder="Search by call ID"
                  style={{
                    minWidth: "80px",
                    padding: "0",
                    background: "transparent",
                  }}
                  body={callIdBodyTemplate}
                />
                <Column
                  field="caller_id"
                  header="Caller ID"
                  sortable
                  filter
                  filterPlaceholder="Search by caller ID"
                  style={{
                    minWidth: "100px",
                    padding: "0",
                    background: "transparent",
                  }}
                  body={callerIdBodyTemplate}
                />

                <Column
                  field="call_duration"
                  header="Duration"
                  sortable
                  style={{
                    minWidth: "80px",
                    padding: "0",
                    background: "transparent",
                  }}
                  body={durationBodyTemplate}
                />

                <Column
                  field="created_at"
                  header="Created At"
                  sortable
                  filterField="created_at"
                  style={{
                    minWidth: "120px",
                    padding: "0",
                    background: "transparent",
                  }}
                  body={createdAtBodyTemplate}
                />

                <Column
                  field="turn"
                  header="T"
                  sortable
                  filter
                  dataType="numeric"
                  style={{
                    minWidth: "60px",
                    padding: "0",
                    background: "transparent",
                  }}
                  body={turnBodyTemplate}
                />

                <Column
                  field="disposition"
                  header="D"
                  sortable
                  filter
                  filterMenuStyle={{ width: "14rem" }}
                  style={{
                    minWidth: "70px",
                    padding: "0",
                    background: "transparent",
                  }}
                  body={dispositionBodyTemplate}
                  filterElement={dispositionFilterTemplate}
                />

                <Column
                  field="call_recording_path"
                  header="Call Audio"
                  style={{
                    minWidth: role === "admin" ? "200px" : "120px",
                    padding: "0",
                    background: "transparent",
                  }}
                  body={audioBodyTemplate}
                />

                <Column
                  field="label"
                  header="Label"
                  sortable
                  filter
                  filterPlaceholder="Search by label"
                  style={{
                    minWidth: "100px",
                    padding: "0",
                    background: "transparent",
                  }}
                  className="p-1"
                  body={labelBodyTemplate}
                />

                {role === "admin" && (
                  <Column
                    field="transcription"
                    header="Transcription"
                    filter
                    filterPlaceholder="Search transcription"
                    style={{
                      minWidth: "200px",
                      padding: "0",
                      background: "transparent",
                    }}
                    body={transcriptionBodyTemplate}
                  />
                )}
              </DataTable>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallDataTable;
