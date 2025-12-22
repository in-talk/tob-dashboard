"use client";

import React, { useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Last7DaysDisposition, AgentDispositionBreakdown } from "@/types/last7DaysDisposition";
import { ChevronDown, ChevronUp, Calendar, Headset } from "lucide-react";
import SyncingProgressBars from "../ui/SyncingProgressBars";

interface AgentDispositionLast7DaysProps {
    data: Last7DaysDisposition[];
    isLoading: boolean;
    isExpanded: boolean;
    onToggle: () => void;
}

const AgentDispositionLast7Days: React.FC<AgentDispositionLast7DaysProps> = ({
    data,
    isLoading,
    isExpanded,
    onToggle
}) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [expandedRows, setExpandedRows] = useState<any>(null);

    const dispositionKeys = [
        "a", "dc", "hp", "lb", "na", "np", "ri", "dnc", "dnq", "fas", "dair", "xfer", "callbk"
    ];

    const renderDispositionColumns = (isOverall: boolean) => {
        return dispositionKeys.map((key) => (
            <Column
                key={key}
                field={isOverall ? `overall.${key}` : key}
                header={key.toUpperCase()}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                body={(rowData: any) => {
                    const val = Number(isOverall ? rowData.overall?.[key] : rowData?.[key]) || 0;
                    const total = Number(isOverall ? rowData.overall?.total_calls : rowData?.total_calls) || 0;
                    const percentage = total > 0 ? ((val / total) * 100).toFixed(1) : "0.0";

                    return (
                        <div className="flex flex-col items-center">
                            <span className="text-xs font-medium">{val}</span>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">({percentage}%)</span>
                        </div>
                    );
                }}
                style={{ minWidth: "65px" }}
            />
        ));
    };

    const rowExpansionTemplate = (rowData: Last7DaysDisposition) => {
        return (
            <div className="p-3 bg-gray-50 dark:bg-gray-900/50">
                <h4 className="text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">Agent Breakup for {rowData.date}</h4>
                <DataTable
                    value={rowData.agents}
                    className="p-datatable-sm"
                    pt={{
                        header: { className: "bg-transparent" },
                        thead: { className: "bg-transparent" },
                        tbody: { className: "bg-transparent" },
                        bodyRow: { className: "bg-transparent border-b border-gray-200 dark:border-gray-700" }
                    }}
                >
                    <Column
                        field="agent_name"
                        header="Agent"
                        body={(row: AgentDispositionBreakdown) => <span className="capitalize font-medium text-xs">{row.agent_name}</span>}
                        style={{ minWidth: "100px" }}
                    />
                    <Column
                        field="total_calls"
                        header="Total"
                        body={(row: AgentDispositionBreakdown) => <span className="font-bold text-xs">{row.total_calls}</span>}
                        style={{ minWidth: "60px" }}
                    />
                    {renderDispositionColumns(false)}
                </DataTable>
            </div>
        );
    };

    return (
        <div className="p-2 bg-gray-100 dark:bg-sidebar rounded-xl overflow-hidden">
            <div className="pt-1 min-h-[4px]">{isLoading && <SyncingProgressBars />}</div>

            <div className="w-full">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
                    <div
                        className="p-2 bg-white dark:bg-sidebar border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                        onClick={onToggle}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5" />
                                <h3 className="text-md font-semibold text-gray-900 dark:text-white">
                                    Agent Disposition (Last 7 Days)
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {isExpanded ? "Collapse" : "Expand"}
                                </span>
                                {isExpanded ? (
                                    <ChevronUp className="w-5 h-5 text-gray-500" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-500" />
                                )}
                            </div>
                        </div>
                    </div>

                    <div
                        className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
                            }`}
                    >
                        <DataTable
                            value={data}
                            expandedRows={expandedRows}
                            onRowToggle={(e) => setExpandedRows(e.data)}
                            rowExpansionTemplate={rowExpansionTemplate}
                            dataKey="date"
                            className="p-datatable-sm"
                            emptyMessage={
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Headset className="w-12 h-12 text-gray-300 mb-4" />
                                    <p className="text-gray-400">No data available for the last 7 days</p>
                                </div>
                            }
                            pt={{
                                header: { className: "bg-white dark:bg-sidebar" },
                                thead: { className: "dark:bg-sidebar" },
                                tbody: { className: "dark:bg-sidebar" },
                                headerRow: { className: "border-b dark:bg-sidebar text-xs border-gray-200" },
                                bodyRow: {
                                    className: "border-b border-gray-200 dark:bg-sidebar dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700",
                                },
                            }}
                            stripedRows
                            showGridlines
                        >
                            <Column expander style={{ width: "3em" }} />
                            <Column
                                field="date"
                                header="Date"
                                body={(row: Last7DaysDisposition) => <span className="font-bold text-xs">{row.date}</span>}
                                style={{ minWidth: "100px" }}
                            />
                            <Column
                                field="overall.total_calls"
                                header="Total"
                                body={(row: Last7DaysDisposition) => <span className="font-bold text-xs">{row.overall.total_calls}</span>}
                                style={{ minWidth: "60px" }}
                            />
                            {renderDispositionColumns(true)}
                        </DataTable>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentDispositionLast7Days;
