// hooks/useDashboardData.ts
import { useMemo, useCallback } from "react";
import useSWR from "swr";
import { useTimezone } from "@/hooks/useTimezone";
import { getUTCDateRange } from "@/utils/timezone";
import { transformAgentData } from "@/utils/transformAgentData";
import { transformGraphData } from "@/utils/transformGraphData";

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

  const utcDateRange = useMemo(
    () => getUTCDateRange(dateRange.from, dateRange.to, timezone),
    [dateRange.from, dateRange.to, timezone]
  );

  const postFetcher = useCallback(
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
      client: userId ? `user-${userId}` : null,
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
    [userId, selectedClientId, utcDateRange, pagination, serverSearchTerm, searchType, globalSearchTerm]
  );

  // SWR queries
  const clientsQuery = useSWR(
    keys.client,
    () =>
      fetch(`/api/fetchClientsByUser?user_id=${userId}`).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch clients");
        return res.json();
      }),
    { revalidateOnFocus: false, revalidateOnReconnect: true }
  );

  const chartDataQuery = useSWR(
    keys.chart,
    () =>
      postFetcher("/api/fetchDispositionGraphData", {
        client_id: selectedClientId,
        from_date: utcDateRange.from,
        to_date: utcDateRange.to,
        timezone,
      }),
    { revalidateOnFocus: false, revalidateOnReconnect: true }
  );

  const callDataQuery = useSWR(
    keys.call,
    () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        client_id: selectedClientId,
        page: pagination.page,
        num_of_records: pagination.pageSize,
      };

      console.log('page size=>', pagination.pageSize)

      // Priority 1: Specific Search (Caller ID / Call ID) - Ignores Date Range
      if (serverSearchTerm) {
        payload.from_date = null;
        payload.to_date = null;
        payload.search_term = null;
        if (searchType === "call_id") {
          payload.call_id = serverSearchTerm;
          payload.caller_id = null;
        } else {
          payload.call_id = null;
          payload.caller_id = serverSearchTerm;
        }
      }
      // Priority 2: Global Search or No Search - Respects Date Range
      else {
        payload.from_date = utcDateRange.from;
        payload.to_date = utcDateRange.to;
        payload.call_id = null;
        payload.caller_id = null;
        payload.search_term = globalSearchTerm || null;
      }

      return postFetcher("/api/fetchCallRecords", payload);
    },
    { revalidateOnFocus: false, revalidateOnReconnect: true }
  );

  const agentReportQuery = useSWR(
    keys.agent,
    () =>
      postFetcher("/api/fetchAgentReport", {
        client_id: selectedClientId,
        from_date: utcDateRange.from,
        to_date: utcDateRange.to,
      }),
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
      clients: clientsQuery.data?.clients ?? [],
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
      clientsQuery.data,
      callDataQuery.data,
      chartDataQuery.data,
      agentReportQuery.data,
      last7DaysQuery.data,
    ]
  );

  // Combined loading state
  const isLoading =
    clientsQuery.isLoading ||
    chartDataQuery.isLoading ||
    callDataQuery.isLoading ||
    agentReportQuery.isLoading ||
    last7DaysQuery.isLoading;

  // Combined error state
  const error =
    clientsQuery.error ||
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
      clients: clientsQuery,
      chartData: chartDataQuery,
      callData: callDataQuery,
      agentReport: agentReportQuery,
      last7DaysDisposition: last7DaysQuery,
    },
  };
}