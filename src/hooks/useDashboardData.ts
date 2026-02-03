// hooks/useDashboardData.ts
import { useMemo, useCallback } from "react";
import useSWR from "swr";
import { useTimezone } from "@/hooks/useTimezone";
import { getUTCDateRange } from "@/utils/timezone";
import { transformAgentData } from "@/utils/transformAgentData";
import { transformGraphData } from "@/utils/transformGraphData";
import { useClients } from "./useClients";

interface UseDashboardDataProps {
  userId: string | undefined;
  selectedClientId: string | null;
  dateRange: { from: Date; to: Date };
  pagination: { page: number; pageSize: number };
  serverSearchTerm?: string;
  searchType?: "call_id" | "caller_id";
  globalSearchTerm?: string;
  fetchLast7Days?: boolean;
}
export function useDashboardData({
  userId,
  selectedClientId,
  dateRange,
  pagination,
  serverSearchTerm,
  searchType = "caller_id",
  globalSearchTerm,
  fetchLast7Days = false,
}: UseDashboardDataProps) {
  const { timezone } = useTimezone();

  // Use the new hook for clients
  const { clients, isLoading: isClientsLoading, error: clientsError } = useClients(userId);

  const utcDateRange = useMemo(
    () => getUTCDateRange(dateRange.from, dateRange.to, timezone),
    [dateRange.from, dateRange.to, timezone]
  );

  const postFetcher = useCallback(
    // ... (existing postFetcher code)
    (url: string, body: Record<string, unknown>) =>
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      }),
    []
  );

  // Generate SWR keys
  const keys = useMemo(
    () => ({
      chart:
        selectedClientId && utcDateRange
          ? `chart-${selectedClientId}-${utcDateRange.from}-${utcDateRange.to}`
          : null,
      call:
        selectedClientId && utcDateRange
          ? `call-${selectedClientId}-${serverSearchTerm ? 'spec-' + serverSearchTerm + '-' + searchType : 'glob-' + (globalSearchTerm || 'none') + '-' + utcDateRange.from + '-' + utcDateRange.to}-${pagination.page}-${pagination.pageSize}`
          : null,
      agent:
        selectedClientId && utcDateRange
          ? `agent-${selectedClientId}-${utcDateRange.from}-${utcDateRange.to}`
          : null,
    }),
    [selectedClientId, utcDateRange, pagination, serverSearchTerm, searchType, globalSearchTerm]
  );

  // removed clientsQuery logic as it is now in useClients

  const chartDataQuery = useSWR(
    keys.chart,
    // ... (rest of the file)
    { revalidateOnFocus: false, revalidateOnReconnect: true }
  );

  const callDataQuery = useSWR(
    keys.call, // ... 
    // ...
    { revalidateOnFocus: false, revalidateOnReconnect: true }
  );

  const agentReportQuery = useSWR(
    keys.agent, // ...
    // ...
    { revalidateOnFocus: false, revalidateOnReconnect: true }
  );

  const last7DaysQuery = useSWR(
    selectedClientId && fetchLast7Days ? ["/api/fetchAgentDispositionLast7Days", selectedClientId] : null,
    ([url, cid]: [string, string]) =>
      postFetcher(url, {
        client_id: cid,
      }),
    { revalidateOnFocus: false, revalidateOnReconnect: true }
  );

  // Transform and memoize data
  const data = useMemo(
    () => ({
      clients: clients,
      callRecords: callDataQuery.data?.callRecords?.rows?.[0].get_client_data_paginated?.data ?? [],
      paginationMeta: callDataQuery.data?.callRecords?.rows?.[0].get_client_data_paginated?.meta,
      dispositionChartData: transformGraphData(
        chartDataQuery.data?.graphData ?? []
      ),
      agentReport: transformAgentData(
        agentReportQuery.data?.agentRecords ?? []
      ),
      last7DaysDisposition: last7DaysQuery.data?.last7DaysData ?? [],
    }),
    [
      clients,
      callDataQuery.data,
      chartDataQuery.data,
      agentReportQuery.data,
      last7DaysQuery.data,
    ]
  );

  // Combined loading state
  const isLoading =
    isClientsLoading ||
    chartDataQuery.isLoading ||
    callDataQuery.isLoading ||
    agentReportQuery.isLoading ||
    last7DaysQuery.isLoading;

  // Combined error state
  const error =
    clientsError ||
    chartDataQuery.error ||
    callDataQuery.error ||
    agentReportQuery.error ||
    last7DaysQuery.error;

  return {
    data,
    isLoading,
    error,
    utcDateRange,
    queries: {
      // clients query object is not directly available from the hook return, but data is passed
      chartData: chartDataQuery,
      callData: callDataQuery,
      agentReport: agentReportQuery,
      last7DaysDisposition: last7DaysQuery,
    },
  };
}