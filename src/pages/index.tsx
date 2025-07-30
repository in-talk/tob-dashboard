import DispositionChart from "@/components/dashboard/DispositionChart";
import Stats from "@/components/dashboard/Stats";
import NewDateFilter from "@/components/NewDateFilter";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useTimezone } from "@/hooks/useTimezone";
import { CallRecord } from "@/types/callRecord";
import { withAuth } from "@/utils/auth";
import { formatLocalDate } from "@/utils/formatDateTime";
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

  const client_id = session?.user?.client_id;

  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [dateRange, setDateRange] = useState(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 1);

    return {
      from: formatLocalDate(startDate),
      to: formatLocalDate(endDate),
    };
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
    client_id && utcDateRange
      ? `chart-${client_id}-${utcDateRange.from}-${utcDateRange.to}`
      : null;
  const callKey =
    client_id && utcDateRange
      ? `call-${client_id}-${utcDateRange.from}-${utcDateRange.to}`
      : null;
  const agentKey =
    client_id && utcDateRange
      ? `agent-${client_id}-${utcDateRange.from}-${utcDateRange.to}`
      : null;

  const chartDataQuery = useSWR(
    chartKey,
    () =>
      postFetcher("/api/fetchDispositionGraphData", {
        client_id,
        from_date: utcDateRange.from,
        to_date: utcDateRange.to,
      }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  const callDataQuery = useSWR(
    callKey,
    () =>
      postFetcher("/api/fetchCallRecords", {
        client_id,
        from_date: utcDateRange.from,
        to_date: utcDateRange.to,
      }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  const agentReportQuery = useSWR(
    agentKey,
    () =>
      postFetcher("/api/fetchAgentReport", {
        client_id,
        from_date: utcDateRange.from,
        to_date: utcDateRange.to,
      }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  const callRecords: CallRecord[] = callDataQuery.data?.callRecords ?? [];

  const dispositionChartData = transformGraphData(
    chartDataQuery.data?.graphData ?? []
  );

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

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      chartDataQuery.mutate();
      callDataQuery.mutate();
      agentReportQuery.mutate();
      setLastUpdated(new Date());
    }, refreshInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [
    autoRefresh,
    refreshInterval,
    chartDataQuery,
    callDataQuery,
    agentReportQuery,
  ]);

  return (
    <>
      <Head>
        <title>InTalk Dashboard - Smart Customer Service Management</title>
      </Head>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="w-full flex justify-between items-start sticky top-0 z-10 bg-gray-100 dark:bg-sidebar p-3 rounded-sm ">
          <div className="flex items-center gap-4 flex-wrap py-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => {
                  setAutoRefresh(e.target.checked);
                  if (e.target.checked) setLastUpdated(new Date());
                }}
              />
              Auto Refresh
            </label>
            <Select
              disabled={!autoRefresh}
              value={`${refreshInterval}`}
              onValueChange={(value) => setRefreshInterval(Number(value))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select interval" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Refresh Interval</SelectLabel>
                  <SelectItem value="5">Every 5 minutes</SelectItem>
                  <SelectItem value="10">Every 10 minutes</SelectItem>
                  <SelectItem value="15">Every 15 minutes</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            {autoRefresh && (
              <span className="text-sm block text-gray-500">
                Updated {getTimeAgo()}
              </span>
            )}
          </div>
          <NewDateFilter
            onDateChange={setDateRange}
            autoRefresh={autoRefresh}
            initialRange={dateRange}
          />
        </div>

        <div className="w-full">
          <Stats
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
          <CallDataTable callRecords={callRecords} />
        </div>
        <div className="w-full">
          <AgentDispositionReport agentReport={agentReport || []} />
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin", "user"]);
