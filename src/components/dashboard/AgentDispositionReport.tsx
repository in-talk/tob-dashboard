"use client";

import React, { useMemo } from "react";
import DataTable, { TableColumn } from "react-data-table-component";
import { useTheme } from "next-themes";
import { Headset } from "lucide-react";
import { AgentReportRow } from "@/utils/transformAgentData";

const AgentDispositionReport = ({
  agentReport,
}: {
  agentReport: AgentReportRow[];
}) => {
  const { theme } = useTheme();

  const baseColumns: TableColumn<AgentReportRow>[] = [
    {
      name: "Agent Name",
      selector: (row) => row.agentName,
      sortable: true,
      width: "120px",
      cell: (row) => (
        <span className="capitalize text-md font-bold"> {row.agentName}</span>
      ),
    },
    {
      name: "Total Calls",
      selector: (row) => row.totalCalls,
      sortable: true,
      width: "120px",
      cell: (row) => (
        <span className="text-md font-bold">{row.totalCalls}</span>
      ),
    },
    {
      name: "XFER",
      selector: (row: AgentReportRow) => row.xfer.count,
      sortable: true,
      width: "120px",
      cell: (row: AgentReportRow) => {
        const { count, percentage } = row.xfer || {
          count: "0",
          percentage: "0",
        };
        return (
          <span className="text-md">
            {count} -{" "}
            <span className="font-bold text-green-500">({percentage}%)</span>
          </span>
        );
      },
    },
  ];

  const dynamicDispositionKeys: (keyof Omit<
    AgentReportRow,
    "agentName" | "totalCalls"
  >)[] = ["dnc", "callbk", "fas", "am", "hp", "dc", "dair", "ri", "other"];

  const dynamicColumns = useMemo(() => {
    return dynamicDispositionKeys
      .filter((key) => agentReport.some((row) => Number(row[key]?.count) > 0))
      .map((key) => ({
        name: key.toUpperCase(),
        selector: (row: AgentReportRow) => Number(row[key]?.count),
        sortable: true,
        width: "120px",
        cell: (row: AgentReportRow) => {
          const { count, percentage } = row[key] || {
            count: "0",
            percentage: "0",
          };
          return (
            <span className="text-md">
              {count} -{" "}
              <span className="font-bold text-red-500">({percentage}%)</span>
            </span>
          );
        },
      }));
  }, [agentReport]);

  const columns = useMemo(
    () => [...baseColumns, ...dynamicColumns],
    [dynamicColumns]
  );

  const customStyles = {
    tableWrapper: {
      style: {
        display: "block",
        overflowX: "auto" as const,
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
    <div className="p-6 bg-gray-100 dark:bg-sidebar rounded-xl overflow-x-auto max-w-full">
      <div className="min-w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Agent Disposition Report</h1>
        </div>
        <div className="bg-light dark:bg-sidebar border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
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
                <Headset className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-300 text-lg">No records found</p>
                <p className="text-gray-300 text-sm">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
};

export default AgentDispositionReport;
