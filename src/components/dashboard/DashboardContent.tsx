// components/dashboard/DashboardContent.tsx
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { CallRecord } from "@/types/callRecord";
import { useDashboardData } from "@/hooks/useDashboardData";
import DashboardHeader from "./DashboardHeader";
import Stats from "./Stats";
import DispositionChart from "./DispositionChart";
import { exportDispositionCSV } from "@/utils/csvExport";
import { useSession } from "next-auth/react";

const CallDataTable = dynamic(() => import("./CallDataTable"), { ssr: false });
const AgentDispositionReport = dynamic(
  () => import("./AgentDispositionReport"),
  {
    ssr: false,
  }
);
const AgentDispositionLast7Days = dynamic(
  () => import("./AgentDispositionLast7Days"),
  {
    ssr: false,
  }
);

interface DashboardContentProps {
  userId: string | undefined;
}

export default function DashboardContent({ userId }: DashboardContentProps) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const { data: session } = useSession();

  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const from = new Date(now);
    from.setHours(from.getHours() - 1);
    return { from, to: now };
  });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(0.5);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [previousCallRecords, setPreviousCallRecords] = useState<CallRecord[]>(
    []
  );
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [serverSearchTerm, setServerSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<"call_id" | "caller_id">(
    "caller_id"
  );
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [showLast7Days, setShowLast7Days] = useState(false);
  const [exportingDisposition, setExportingDisposition] = useState<string | null>(null);

  const { data, isLoading, error, utcDateRange, queries } = useDashboardData({
    userId,
    selectedClientId,
    dateRange,
    pagination,
    serverSearchTerm,
    searchType,
    globalSearchTerm,
    fetchLast7Days: showLast7Days,
  });


  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setDateRange((prev) => ({ ...prev, to: new Date() }));
      setLastUpdated(new Date());
    }, refreshInterval * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Reset pagination when search term changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [serverSearchTerm, searchType, globalSearchTerm, dateRange]);
  console.log('changes=>', data.callRecords.length)
  // Cache previous call records
  useEffect(() => {
    if (data.callRecords.length > 0) {
      setPreviousCallRecords(data.callRecords);
    }
  }, [data.callRecords]);

  // Auto-select first client
  useEffect(() => {
    if (!selectedClientId && data.clients.length > 0) {
      setSelectedClientId(data.clients[0].client_id);
    }
  }, [data.clients, selectedClientId]);

  const getTimeAgo = useCallback(() => {
    if (!lastUpdated) return "Never";
    const diffMs = Date.now() - lastUpdated.getTime();
    const diffMin = Math.floor(diffMs / 1000 / 60);
    return diffMin === 0
      ? "Just now"
      : `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  }, [lastUpdated]);

  const handleStatWiseDisposition = useCallback(
    async (disposition: string, count: number) => {
      if (!selectedClientId) {
        console.error("Client ID is required for export");
        return;
      }

      setExportingDisposition(disposition);
      try {
        // Prepare the payload
        const payload: Record<string, unknown> = {
          client_id: selectedClientId,
          from_date: utcDateRange.from,
          to_date: utcDateRange.to,
          page: 1,
          num_of_records: count || 100000,
        };

        // For specific dispositions, use search_term to filter at database level
        // For "totalCalls", don't pass search_term to get all records
        if (disposition.toLowerCase() !== 'totalcalls') {
          payload.search_term = disposition.toUpperCase();
        }

        // Fetch records filtered by disposition using search_term
        const response = await fetch("/api/fetchCallRecords", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch records for export");
        }

        const result = await response.json();
        const allRecords = result.callRecords?.rows?.[0]?.get_client_data_paginated?.data ?? [];

        // Export the records (already filtered by search_term)
        exportDispositionCSV({
          callRecords: allRecords,
          disposition,
          utcDateRange,
          role: session?.user?.role || "user",
        });
      } catch (error) {
        console.error("Error exporting disposition data:", error);
        alert("Failed to export data. Please try again.");
      } finally {
        setExportingDisposition(null);
      }
    },
    [selectedClientId, utcDateRange, session?.user?.role]
  );

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">
            Error loading dashboard data
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Please log in to view dashboard</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <DashboardHeader
        clients={data.clients}
        selectedClientId={selectedClientId}
        onClientChange={setSelectedClientId}
        dateRange={dateRange}
        onDateChange={setDateRange}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        refreshInterval={refreshInterval}
        setRefreshInterval={setRefreshInterval}
        setLastUpdated={setLastUpdated}
        getTimeAgo={getTimeAgo}
        isLoading={isLoading}
      />

      <Stats
        onClick={handleStatWiseDisposition}
        agentReport={data.agentReport ?? []}
        isLoading={queries.agentReport.isLoading}
        exportingDisposition={exportingDisposition}
      />

      <DispositionChart
        dispositionChartData={data.dispositionChartData ?? []}
        isLoading={queries.chartData.isLoading}
      />

      <div className="w-full my-6">
        <CallDataTable
          callRecords={
            queries.callData.isLoading && previousCallRecords.length > 0
              ? previousCallRecords
              : data.callRecords
          }
          isLoading={queries.callData.isLoading}
          utcDateRange={utcDateRange}
          pagination={pagination}
          onPaginationChange={setPagination}
          totalRecords={data.paginationMeta?.total_records || 0}
          serverSearchTerm={serverSearchTerm}
          onServerSearchChange={setServerSearchTerm}
          searchType={searchType}
          onSearchTypeChange={setSearchType}
          globalSearchTerm={globalSearchTerm}
          onGlobalSearchChange={setGlobalSearchTerm}
        />
      </div>

      <div className="flex flex-col gap-6">
        <AgentDispositionReport
          agentReport={data.agentReport ?? []}
          isLoading={queries.agentReport.isLoading}
        />

        {session?.user?.role === "admin" && (
          <AgentDispositionLast7Days
            data={data.last7DaysDisposition ?? []}
            isLoading={queries.last7DaysDisposition.isLoading}
            isExpanded={showLast7Days}
            onToggle={() => setShowLast7Days(!showLast7Days)}
          />
        )}
      </div>
    </div>
  );
}
