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
}

export function useDashboardData({
  userId,
  selectedClientId,
  dateRange,
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
          ? `call-${selectedClientId}-${utcDateRange.from}-${utcDateRange.to}`
          : null,
      agent:
        selectedClientId && utcDateRange
          ? `agent-${selectedClientId}-${utcDateRange.from}-${utcDateRange.to}`
          : null,
    }),
    [userId, selectedClientId, utcDateRange]
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
      }),
    { revalidateOnFocus: false, revalidateOnReconnect: true }
  );

  const callDataQuery = useSWR(
    keys.call,
    () =>
      postFetcher("/api/fetchCallRecords", {
        client_id: selectedClientId,
        from_date: utcDateRange.from,
        to_date: utcDateRange.to,
      }),
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

  // Transform and memoize data
  const data = useMemo(
    () => ({
      clients: clientsQuery.data?.clients ?? [],
      callRecords: callDataQuery.data?.callRecords ?? [],
      dispositionChartData: transformGraphData(
        chartDataQuery.data?.graphData ?? []
      ),
      agentReport: transformAgentData(
        agentReportQuery.data?.agentRecords ?? []
      ),
    }),
    [
      clientsQuery.data,
      callDataQuery.data,
      chartDataQuery.data,
      agentReportQuery.data,
    ]
  );

  // Combined loading state
  const isLoading =
    clientsQuery.isLoading ||
    chartDataQuery.isLoading ||
    callDataQuery.isLoading ||
    agentReportQuery.isLoading;

  // Combined error state
  const error =
    clientsQuery.error ||
    chartDataQuery.error ||
    callDataQuery.error ||
    agentReportQuery.error;

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
    },
  };
}