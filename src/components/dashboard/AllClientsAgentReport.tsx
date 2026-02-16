"use client";

import React, { useMemo } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { AgentReportRow } from "@/utils/transformAgentData";
import { Headset, ChevronDown, ChevronUp } from "lucide-react";
import SyncingProgressBars from "../ui/SyncingProgressBars";
import { agentDispositionReportText } from "@/constants";
import { Client } from "@/types/client";

interface AllClientsAgentReportProps {
    agentReport: AgentReportRow[];
    clients: Client[];
    isLoading: boolean;
    isExpanded: boolean;
    onToggle: () => void;
}

const AllClientsAgentReport = ({
    agentReport,
    clients,
    isLoading,
    isExpanded,
    onToggle,
}: AllClientsAgentReportProps) => {
    // Group report data by client_id
    const reportByClient = useMemo(() => {
        const grouped: Record<string, AgentReportRow[]> = {};
        if (!agentReport) return grouped;

        agentReport.forEach((row) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const clientId = (row as any).client_id;
            if (clientId) {
                if (!grouped[clientId]) {
                    grouped[clientId] = [];
                }
                grouped[clientId].push(row);
            }
        });
        return grouped;
    }, [agentReport]);

    const clientIds = Object.keys(reportByClient);

    const dynamicDispositionKeys: (keyof Omit<
        AgentReportRow,
        "agentName" | "totalCalls" | "client_id"
    >)[] = [
            "xfer", // Added xfer here as it is treated as a disposition
            "dnc",
            "callbk",
            "fas",
            "a",
            "rec",
            "dc",
            "dair",
            "ri",
            "lb",
            "np",
            "na",
            "dnq",
            "other",
        ];

    // Helper to aggregate data for a single client
    const getClientSummary = (rows: AgentReportRow[]) => {
        const totalCalls = rows.reduce(
            (sum, row) => sum + Number(row.totalCalls || 0),
            0
        );

        const dispositionCounts: Record<string, number> = {};

        dynamicDispositionKeys.forEach((key) => {
            dispositionCounts[key as string] = rows.reduce((sum, row) => {
                // Safe access: row[key] might be undefined or have count string
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const cellData = row[key] as any;
                const count = cellData?.count ? Number(cellData.count) : 0;
                return sum + count;
            }, 0);
        });

        // Create table data rows
        const summaryRows = [
            {
                disposition: agentDispositionReportText.table.headers.totalCalls,
                count: totalCalls,
                percentage: null, // Total calls usually doesn't show % relative to itself in this context
                isTotal: true,
            },
            ...dynamicDispositionKeys.map((key) => {
                const count = dispositionCounts[key as string] || 0;
                const percentage = totalCalls > 0 ? ((count / totalCalls) * 100).toFixed(1) : "0";
                return {
                    disposition: key.toUpperCase(),
                    count,
                    percentage,
                    isTotal: false,
                };
            }),
        ];

        return summaryRows;
    };

    return (
        <div className="w-full max-w-full p-2 bg-gray-100 dark:bg-sidebar rounded-xl overflow-hidden mt-6">
            <div
                className="p-2 bg-white dark:bg-sidebar border-b border-gray-200 dark:border-gray-700 mb-4 rounded-lg shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                onClick={onToggle}
            >
                <div className="flex items-center justify-between">
                    <h3 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Headset className="w-5 h-5" />
                        All Clients Agent Disposition Report
                    </h3>
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

            {isExpanded && (
                <div className="w-full overflow-x-auto pb-4">
                    {isLoading ? (
                        <div className="p-4"><SyncingProgressBars /></div>
                    ) : clientIds.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">No records found</div>
                    ) : (
                        <div className="flex flex-row gap-4">
                            {clientIds.map((clientId) => {
                                const clientName =
                                    clients.find((c) => c.client_id === clientId)?.name ||
                                    `Client ${clientId}`;
                                const clientRows = reportByClient[clientId];
                                const summaryData = getClientSummary(clientRows);

                                return (
                                    <div
                                        key={clientId}
                                        className="min-w-[300px] flex-shrink-0 bg-white dark:bg-sidebar border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm flex flex-col"
                                    >
                                        <div className="p-3 border-b border-gray-200 dark:border-gray-700 font-semibold text-md bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                                            {clientName}
                                        </div>
                                        <div className="p-0 overflow-auto max-h-[500px]">
                                            <DataTable
                                                value={summaryData}
                                                className="p-datatable-sm"
                                                emptyMessage="No records found"
                                                stripedRows
                                                showGridlines
                                            >
                                                <Column
                                                    field="disposition"
                                                    header="Disposition"
                                                    className="font-semibold text-sm"
                                                />
                                                <Column
                                                    header="Count & %"
                                                    body={(rowData) => (
                                                        <span className="text-sm">
                                                            {rowData.count}
                                                            {!rowData.isTotal && (
                                                                <> - <span className="font-bold text-red-500">({rowData.percentage}%)</span></>
                                                            )}
                                                        </span>
                                                    )}
                                                />
                                            </DataTable>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AllClientsAgentReport;
