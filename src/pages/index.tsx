import DispositionChart from "@/components/dashboard/DispositionChart";
import Stats from "@/components/dashboard/Stats";
import NewDateFilter from "@/components/NewDateFilter";
import AutoRefresh from "@/components/ui/autoRefresh";
import ClientSelector from "@/components/ui/clientSelector";
import { useTimezone } from "@/hooks/useTimezone";
import { CallRecord } from "@/types/callRecord";
import { withAuth } from "@/utils/auth";
import { getUTCDateRange } from "@/utils/timezone";
import { transformAgentData } from "@/utils/transformAgentData";
import { transformGraphData } from "@/utils/transformGraphData";
import { GetServerSideProps } from "next";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import Head from "next/head";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";

const CallDataTable = dynamic(
  () => import("@/components/dashboard/CallDataTable"),
  { ssr: false }
);
const AgentDispositionReport = dynamic(
  () => import("@/components/dashboard/AgentDispositionReport"),
  { ssr: false }
);

export default function Home() {
  const { data: session } = useSession();
  const { timezone } = useTimezone();

  // const client_id = session?.user?.client_id;
  const user_id = session?.user?.id;

  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(0.5);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [previousCallRecords, setPreviousCallRecords] = useState<CallRecord[]>(
    []
  );
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const from = new Date(now);
    // from.setDate(from.getDate() - 1);
    from.setHours(from.getHours() - 1);
    return { from, to: now };
  });

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
      }).then((res) => res.json()),
    []
  );

  const chartKey =
    selectedClientId && utcDateRange
      ? `chart-${selectedClientId}-${utcDateRange.from}-${utcDateRange.to}`
      : null;
  const callKey =
    selectedClientId && utcDateRange
      ? `call-${selectedClientId}-${utcDateRange.from}-${utcDateRange.to}`
      : null;
  const agentKey =
    selectedClientId && utcDateRange
      ? `agent-${selectedClientId}-${utcDateRange.from}-${utcDateRange.to}`
      : null;
const clientKey = user_id ? `client-${user_id}` : null;
  console.log("Home clientKey:", user_id, clientKey);
  const clientsDataQuery = useSWR(
    clientKey,
    () =>
      fetch(`/api/fetchClientsByUser?user_id=${user_id}`).then((res) =>
        res.json()
      ),
    { revalidateOnFocus: false, revalidateOnReconnect: true }
  );

  const chartDataQuery = useSWR(
    chartKey,
    () =>
      postFetcher("/api/fetchDispositionGraphData", {
        client_id: selectedClientId,
        from_date: utcDateRange.from,
        to_date: utcDateRange.to,
      }),
    { revalidateOnFocus: false, revalidateOnReconnect: true }
  );

  const callDataQuery = useSWR(
    callKey,
    () =>
      postFetcher("/api/fetchCallRecords", {
        client_id: selectedClientId,
        from_date: utcDateRange.from,
        to_date: utcDateRange.to,
      }),
    { revalidateOnFocus: false, revalidateOnReconnect: true }
  );

  const agentReportQuery = useSWR(
    agentKey,
    () =>
      postFetcher("/api/fetchAgentReport", {
        client_id: selectedClientId,
        from_date: utcDateRange.from,
        to_date: utcDateRange.to,
      }),
    { revalidateOnFocus: false, revalidateOnReconnect: true }
  );

  // ------------------ Combined Loading State ------------------
  const isAnyLoading =
    clientsDataQuery.isLoading ||
    chartDataQuery.isLoading ||
    callDataQuery.isLoading ||
    agentReportQuery.isLoading;

    console.log("clientsDataQuery:", clientsDataQuery);

  const callRecords: CallRecord[] = callDataQuery.data?.callRecords ?? [];
  const dispositionChartData = transformGraphData(
    chartDataQuery.data?.graphData ?? []
  );
  const clientData = clientsDataQuery.data?.clients ?? [];
  const agentReport = transformAgentData(
    agentReportQuery.data?.agentRecords ?? []
  );
  const getTimeAgo = () => {
    if (!lastUpdated) return "Never";
    const diffMs = Date.now() - lastUpdated.getTime();
    const diffMin = Math.floor(diffMs / 1000 / 60);
    return diffMin === 0
      ? "Just now"
      : `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  };

  const handleStatWiseDisposition = (disposition: string) => {
    const filteredData =
      callRecords.filter(
        (record) =>
          record.disposition?.toUpperCase() === disposition?.toUpperCase()
      ) ?? disposition.toUpperCase() === "totalCalls"
        ? callRecords
        : [];
    if (filteredData.length === 0) return;

    const excludeColumns = [
      "metadata",
      "total_records",
      "current_page",
      "page_size",
      "total_page",
      "has_next_page",
      "has_previous_page",
      "call_recording_path",
      "total_pages",
      "call_status",
    ]; // columns to exclude

    // Fix 1: Get keys from the first record, not the array
    // Fix 2: Add type assertion for the indexing
    const filteredKeys = Object.keys(filteredData[0]).filter(
      (key) => !excludeColumns.includes(key)
    );

    const csv = [
      filteredKeys.join(","),
      ...filteredData.map((row) =>
        filteredKeys
          .map((key) => {
            const value = row[key as keyof CallRecord];

            // Extract seconds from call_duration
            if (
              key === "call_duration" &&
              typeof value === "object" &&
              value !== null
            ) {
              return `${value.seconds}:${value.milliseconds}` || 0;
            }

            // Handle strings with commas or quotes
            if (
              typeof value === "string" &&
              (value.includes(",") || value.includes('"'))
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }

            return value ?? "";
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${disposition.toUpperCase()} (FROM ${utcDateRange.from} TO ${
      utcDateRange.to
    }).csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setDateRange((prev) => ({ ...prev, to: new Date() }));
      console.log("Auto-refreshing data...");
      setLastUpdated(new Date());
    }, refreshInterval * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  useEffect(() => {
    if (callDataQuery.data?.callRecords?.length) {
      setPreviousCallRecords(callDataQuery.data.callRecords);
    }
  }, [callDataQuery.data]);
  console.log("Render Home - clientData:", clientData);
  return (
    <>
      <Head>
        <title>InTalk Dashboard - Smart Customer Service Management</title>
      </Head>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="w-full flex justify-between items-start sticky top-0 z-10 bg-gray-100 dark:bg-sidebar p-3 rounded-sm ">
          <AutoRefresh
            refreshInterval={refreshInterval}
            autoRefresh={autoRefresh}
            setAutoRefresh={setAutoRefresh}
            setRefreshInterval={setRefreshInterval}
            setLastUpdated={setLastUpdated}
            getTimeAgo={getTimeAgo}
            disabled={isAnyLoading}
          />
          {clientData?.length ? (
            <ClientSelector
              clients={clientData}
              selectedClientId={selectedClientId}
              onClientChange={setSelectedClientId}
              label="Select Client"
              placeholder="Choose a client..."
              disabled={isAnyLoading}
            />
          ) : null}
          <NewDateFilter
            onDateChange={setDateRange}
            autoRefresh={autoRefresh}
            initialRange={dateRange}
            disabled={isAnyLoading}
          />
        </div>

        <div className="w-full">
          <Stats
            onClick={handleStatWiseDisposition}
            agentReport={agentReport || []}
            isLoading={agentReportQuery.isLoading}
          />
        </div>

        <div className="w-full">
          <DispositionChart
            dispositionChartData={dispositionChartData || []}
            isLoading={chartDataQuery.isLoading}
          />
        </div>

        <div className="w-full my-6">
          <CallDataTable
            callRecords={
              callDataQuery.isLoading && previousCallRecords.length > 0
                ? previousCallRecords
                : callRecords
            }
            isLoading={callDataQuery.isLoading}
          />
        </div>

        <div className="w-full">
          <AgentDispositionReport
            agentReport={agentReport || []}
            isLoading={agentReportQuery.isLoading}
          />
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin", "user"]);
