import React from "react";
import DataTable, { TableColumn } from "react-data-table-component";
import { useTheme } from "next-themes";
import { Phone } from "lucide-react";

import { AgentReportRow } from "@/utils/transformAgentData";

const AgentDispositionReport = ({
  agentReport,
}: {
  agentReport: AgentReportRow[];
}) => {
  const { theme } = useTheme();

  const columns: TableColumn<AgentReportRow>[] = [
    {
      name: "Agent Name",
      selector: (row: AgentReportRow) => row.agentName,
      sortable: true,
      width: "120px",
      center: true,
      cell: (row: AgentReportRow) => (
        <span className="capitalize text-md font-bold"> {row.agentName}</span>
      ),
    },
    {
      name: "Total Calls",
      selector: (row: AgentReportRow) => row.totalCalls,
      sortable: true,
      width: "120px",
      center: true,
      cell: (row: AgentReportRow) => (
        <span className="text-md font-bold">{row.totalCalls}</span>
      ),
    },
    {
      name: "XFER",
      selector: (row: AgentReportRow) => row.xfer.count,
      sortable: true,
      width: "100px",
      cell: (row: AgentReportRow) => {
        return (
          <span className="text-md">
            {row.xfer.count} -{" "}
            <span className="font-bold text-blue-500 ">
              ({row.xfer.percentage}%)
            </span>{" "}
          </span>
        );
      },
    },
    {
      name: "DNC",
      selector: (row: AgentReportRow) => row.dnc.count,
      sortable: true,
      width: "100px",
      center: true,
      cell: (row: AgentReportRow) => {
        return (
          <span className="text-md">
            {row.dnc.count} -{" "}
            <span className="font-bold text-purple-500">
              ({row.dnc.percentage}%)
            </span>{" "}
          </span>
        );
      },
    },
    {
      name: "NI",
      selector: (row: AgentReportRow) => row.ni.count,
      sortable: true,
      width: "120px",
      center: true,
      cell: (row: AgentReportRow) => {
        return (
          <span className="text-md">
            {row.ni.count} -{" "}
            <span className="font-bold text-yellow-500">
              ({row.ni.percentage}%)
            </span>{" "}
          </span>
        );
      },
    },
    {
      name: "CB",
      selector: (row: AgentReportRow) => row.cb.count,
      sortable: false,
      width: "120px",
      center: true,
      cell: (row: AgentReportRow) => {
        return (
          <span className="text-md">
            {row.cb.count} -{" "}
            <span className="font-bold ">({row.cb.percentage}%)</span>{" "}
          </span>
        );
      },
    },
    {
      name: "DC",
      selector: (row: AgentReportRow) => row.dc.count,
      sortable: true,
      width: "120px",
      center: true,
      cell: (row: AgentReportRow) => {
        return (
          <span className="text-md">
            {row.dc.count} -{" "}
            <span className="font-bold text-red-500">
              ({row.dc.percentage}%)
            </span>{" "}
          </span>
        );
      },
    },

    {
      name: "DAIR",
      selector: (row: AgentReportRow) => row.dair.count,
      sortable: true,
      width: "120px",
      cell: (row: AgentReportRow) => {
        return (
          <span className="text-md">
            {row.dair.count} -{" "}
            <span className="font-bold text-green-500">
              ({row.dair.percentage}%)
            </span>{" "}
          </span>
        );
      },
    },
    {
      name: "RI",
      selector: (row: AgentReportRow) => row.ri.count,
      sortable: true,
      width: "110px",
      cell: (row: AgentReportRow) => {
        return (
          <span className="text-md">
            {row.ri.count} -{" "}
            <span className="font-bold text-orange-400">
              ({row.ri.percentage}%)
            </span>{" "}
          </span>
        );
      },
    },
    {
      name: "Other",
      selector: (row: AgentReportRow) => row.other.count,
      sortable: true,
      width: "120px",
      cell: (row: AgentReportRow) => {
        return (
          <span className="text-md">
            {row.other.count} -{" "}
            <span className="font-bold text-pink-300">
              ({row.other.percentage}%)
            </span>{" "}
          </span>
        );
      },
    },
  ];

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
          <h1 className="text-2xl font-bold mb-2">Agent Disposition Report</h1>
        </div>

        <div className="bg-light dark:bg-sidebar border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <div className="w-full overflow-x-auto max-w-[100vw]">
            <div>
              <DataTable
                title=""
                columns={columns}
                data={agentReport}
                progressComponent={<LoadingComponent />}
                pagination
                paginationServer
                paginationPerPage={10}
                paginationRowsPerPageOptions={[5, 10, 15, 20, 25, 50, 100]}
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
                    <p className="text-gray-500 text-lg">No records found</p>
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

export default AgentDispositionReport;
