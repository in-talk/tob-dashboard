"use client";

import React, { useMemo, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { AgentReportRow } from "@/utils/transformAgentData";
import { ChevronDown, ChevronUp, FileAudio, Headset } from "lucide-react";
import SyncingProgressBars from "../ui/SyncingProgressBars";
import { agentDispositionReportText } from "@/constants";

const AgentDispositionReport = ({
  agentReport,
  isLoading,
}: {
  agentReport: AgentReportRow[];
  isLoading: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleAccordion = () => setIsExpanded(!isExpanded);

  // Base columns
  const baseColumns = [
    {
      field: "agentName",
      header: agentDispositionReportText.table.headers.agentName,
      body: (row: AgentReportRow) => (
        <span className="capitalize text-sm font-bold">{row.agentName}</span>
      ),
      style: { width: "120px" },
    },
    {
      field: "totalCalls",
      header: agentDispositionReportText.table.headers.totalCalls,
      body: (row: AgentReportRow) => (
        <span className="text-sm font-bold">{row.totalCalls}</span>
      ),
      style: { width: "120px" },
    },
    {
      field: "xfer",
      header: agentDispositionReportText.table.headers.xfer,
      body: (row: AgentReportRow) => {
        const { count, percentage } = row.xfer || { count: "0", percentage: "0" };
        return (
          <span className="text-sm">
            {count} - <span className="font-bold text-green-500">({percentage}%)</span>
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
    "dnc", "callbk", "fas", "a", "hp", "dc", "dair", "ri", "lb", "np", "na", "dnq", "other",
  ];

  const dynamicColumns = useMemo(() => {
    return dynamicDispositionKeys
      .filter((key) => agentReport.some((row) => Number(row[key]?.count) > 0))
      .map((key) => ({
        field: key,
        header: key.toUpperCase(),
        body: (row: AgentReportRow) => {
          const { count, percentage } = row[key] || { count: "0", percentage: "0" };
          return (
            <span className="text-sm">
              {count} - <span className="font-bold text-red-500">({percentage}%)</span>
            </span>
          );
        },
      }));
  }, [agentReport, dynamicDispositionKeys]);

  return (
    <div className="p-2 bg-gray-100 dark:bg-sidebar rounded-xl overflow-hidden">
      {/* Loading bar */}
      <div className="pt-1 min-h-[4px]">{isLoading && <SyncingProgressBars />}</div>

      <div className="w-full overflow-x-auto">
        <div className="min-w-[900px] border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
          {/* Accordion Header */}
          <div
            className="p-2 bg-white dark:bg-sidebar border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
            onClick={toggleAccordion}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileAudio className="w-5 h-5" />
                <h3 className="text-md font-semibold text-gray-900 dark:text-white">
                  {agentDispositionReportText.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {isExpanded
                    ? agentDispositionReportText.toggle.collapse
                    : agentDispositionReportText.toggle.expand}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-500 transition-transform duration-200" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500 transition-transform duration-200" />
                )}
              </div>
            </div>
          </div>

          {/* Accordion Body */}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isExpanded ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="bg-light dark:bg-sidebar border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
              <DataTable
                value={agentReport}
                loading={false}
                className="p-datatable-sm"
                emptyMessage={
                  <div className="flex flex-col items-center justify-center py-12">
                    <Headset className="w-12 h-12 text-gray-300 mb-4" />
                    <p className="text-gray-300 text-lg">
                      {agentDispositionReportText.table.emptyState.title}
                    </p>
                    <p className="text-gray-300 text-sm">
                      {agentDispositionReportText.table.emptyState.description}
                    </p>
                  </div>
                }
                pt={{
                  header: { className: "bg-white dark:bg-sidebar" },
                  thead: { className: "dark:bg-sidebar" },
                  tbody: { className: "dark:bg-sidebar" },
                  headerRow: { className: "border-b dark:bg-sidebar text-xs border-gray-200" },
                  emptyMessage: { className: "dark:bg-sidebar" },
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
                    style={{ background: "transparent" }}
                  />
                ))}
              </DataTable>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentDispositionReport;