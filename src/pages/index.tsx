import DispositionChart from "@/components/dashboard/DispositionChart";
import Stats from "@/components/dashboard/Stats";
import DateFilter from "@/components/DateFilter";
import { CallRecord } from "@/types/callRecord";
// import GaugeChart from "@/components/dashboard/GaugeChart";
import { withAuth } from "@/utils/auth";
import { transformAgentData } from "@/utils/transformAgentData";
import { transformGraphData } from "@/utils/transformGraphData";
import { GetServerSideProps } from "next";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import Head from "next/head";
import { useState } from "react";
import useSWR from "swr";

const fetcher = (url: string, body: Record<string, unknown>) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((res) => res.json());

const CallDataTable = dynamic(
  () => import("@/components/dashboard/CallDataTable"),
  {
    ssr: false,
  }
);
const AgentDispositionReport = dynamic(
  () => import("@/components/dashboard/AgentDispositionReport"),
  {
    ssr: false,
  }
);

export default function Home() {
  const { data: session } = useSession();
  const client_id = session?.user?.client_id;

  const [dateRange, setDateRange] = useState<{
    from: string;
    to: string;
  }>(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 1);

    return {
      from: startDate.toISOString().split("T")[0],
      to: endDate.toISOString().split("T")[0],
    };
  });

  const callDataQuery = useSWR(
    client_id && dateRange
      ? `/api/fetchCallRecords?client_id=${client_id}&from=${dateRange.from}&to=${dateRange.to}`
      : null,
    () =>
      fetcher("/api/fetchCallRecords", {
        client_id,
        from_date: dateRange.from,
        to_date: dateRange.to,
      })
  );

  const chartDataQuery = useSWR(
    client_id && dateRange
      ? `/api/fetchDispositionGraphData?client_id=${client_id}&from=${dateRange.from}&to=${dateRange.to}`
      : null,
    () =>
      fetcher("/api/fetchDispositionGraphData", {
        client_id,
        from_date: dateRange.from,
        to_date: dateRange.to,
      })
  );

  const agentReportQuery = useSWR(
    client_id && dateRange
      ? `/api/fetchAgentReport?client_id=${client_id}&from=${dateRange.from}&to=${dateRange.to}`
      : null,
    () =>
      fetcher("/api/fetchAgentReport", {
        client_id,
        from_date: dateRange.from,
        to_date: dateRange.to,
      })
  );

  const callRecords: CallRecord[] = callDataQuery.data?.callRecords ?? [];
  const dispositionChartData = transformGraphData(
    chartDataQuery.data?.graphData ?? []
  );

  console.log('dispositionChartData',dispositionChartData)
  const agentReport = transformAgentData(
    agentReportQuery.data?.agentRecords ?? []
  );

  return (
    <>
      <Head>
        <title>InTalk Dashboard - Smart Customer Service Management</title>
      </Head>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <h1 className="text-4xl font-bold capitalize">
          {session?.user.role} Dashboard
        </h1>

        <DateFilter onDateChange={setDateRange} initialRange={dateRange} />

        <div className="w-full">
          <Stats
            agentReport={agentReport || []}
            isLoading={agentReportQuery.isLoading}
          />
        </div>
        <div className="w-full">
          <DispositionChart
            dispositionChartData={dispositionChartData || []}
            initialRange={dateRange}
          />
        </div>
        <div className="w-full my-6">
          <CallDataTable callRecords={callRecords} dateRange={dateRange} />
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
