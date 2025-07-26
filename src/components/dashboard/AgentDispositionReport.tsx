"use client";

import React, { useMemo } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { AgentReportRow } from "@/utils/transformAgentData";
import { Headset } from "lucide-react";

const AgentDispositionReport = ({
  agentReport,
}: {
  agentReport: AgentReportRow[];
}) => {

  const baseColumns = [
    {
      field: "agentName",
      header: "Agent Name",
      body: (row: AgentReportRow) => (
        <span className="capitalize text-sm font-bold">{row.agentName}</span>
      ),
      style: { width: "120px", },
    },
    {
      field: "totalCalls",
      header: "Total Calls",
      body: (row: AgentReportRow) => (
        <span className="text-sm font-bold">{row.totalCalls}</span>
      ),
      style: { width: "120px" },
    },
    {
      field: "xfer",
      header: "XFER",
      body: (row: AgentReportRow) => {
        const { count, percentage } = row.xfer || {
          count: "0",
          percentage: "0",
        };
        return (
          <span className="text-sm">
            {count} -{" "}
            <span className="font-bold text-green-500">({percentage}%)</span>
          </span>
        );
      },
      style: { width: "120px" },
    },
  ];

  const dynamicDispositionKeys: (keyof Omit<
    AgentReportRow,
    "agentName" | "totalCalls"
  >)[] = [
    "dnc",
    "callbk",
    "fas",
    "a",
    "hp",
    "dc",
    "dair",
    "ri",
    "lb",
    "np",
    "na",
    "dnq",
    "other",
  ];

  const dynamicColumns = useMemo(() => {
    return dynamicDispositionKeys
      .filter((key) => agentReport.some((row) => Number(row[key]?.count) > 0))
      .map((key) => ({
        field: key,
        header: key.toUpperCase(),
        body: (row: AgentReportRow) => {
          const { count, percentage } = row[key] || {
            count: "0",
            percentage: "0",
          };
          return (
            <span className="text-sm">
              {count} -{" "}
              <span className="font-bold text-red-500">({percentage}%)</span>
            </span>
          );
        },
      }));
  }, [agentReport]);



  return (
    <div className="p-6 bg-gray-100 dark:bg-sidebar rounded-xl overflow-hidden">
      <div className="w-full overflow-x-auto">
        <div className="min-w-[900px]">
          <h1 className="text-2xl font-bold mb-6">
            Agent Disposition Report
          </h1>

          <div className="bg-light dark:bg-sidebar border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
            <DataTable
              value={agentReport}
              loading={false}
              className="p-datatable-sm"
              emptyMessage={
                <div className="flex flex-col items-center justify-center py-12">
                  <Headset className="w-12 h-12 text-gray-300 mb-4" />
                  <p className="text-gray-300 text-lg">No records found</p>
                  <p className="text-gray-300 text-sm">
                    Try adjusting your search or filter criteria
                  </p>
                </div>
              }
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
                  className: "border-b dark:bg-sidebar text-xs border-gray-200",
                },
                emptyMessage: {
                  className: "dark:bg-sidebar",
                },
                bodyRow: {
                  className:
                    "border-b border-gray-200 dark:bg-sidebar dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700",
                },
              }}
              stripedRows
              showGridlines
            >
              {[...baseColumns, ...dynamicColumns].map((col, index) => (
                <Column
                  key={index}
                  field={col.field}
                  header={col.header}
                  body={col.body}
                  style={{ background: "transparent",}}
                  
                />
              ))}
            </DataTable>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentDispositionReport;