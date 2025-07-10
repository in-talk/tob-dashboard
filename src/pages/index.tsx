import DispositionChart from "@/components/dashboard/DispositionChart";
import { CallRecord } from "@/types/callRecord";
// import GaugeChart from "@/components/dashboard/GaugeChart";
import { withAuth } from "@/utils/auth";
import { AgentReportRow, transformAgentData } from "@/utils/transformAgentData";
import {
  DispositionGraph,
  transformGraphData,
} from "@/utils/transformGraphData";
import { GetServerSideProps } from "next";
import { getSession, useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import Head from "next/head";
interface HomeProps {
  callRecords: CallRecord[];
  dispositionChartData: DispositionGraph[];
  agentReport: AgentReportRow[];
}

export default function Home({
  callRecords,
  dispositionChartData,
  agentReport,
}: HomeProps) {
  const { data: session } = useSession();
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

  return (
    <>
      <Head>
        <title>InTalk Dashboard - Smart Customer Service Management</title>
      </Head>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <h1 className="text-4xl font-bold capitalize">
          {session?.user.role} Dashboard
        </h1>
        <div>
          <div className="w-full">
            <DispositionChart dispositionChartData={dispositionChartData} />
          </div>
          <CallDataTable callRecords={callRecords} />

          <div className="w-full">
            <AgentDispositionReport agentReport={agentReport} />
          </div>
          {/* <div className="w-full">
          <GaugeChart />
        </div> */}
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = withAuth(
  async (context) => {
    const session = await getSession(context);

    if (!session) {
      return {
        redirect: {
          destination: "/signin",
          permanent: false,
        },
      };
    }

    const { role, client_id } = session.user;

    if (role === "user" && !client_id) {
      return {
        redirect: {
          destination: "/signin",
          permanent: false,
        },
      };
    }

    try {
      const [callRes, graphDataRes, agentRes] = await Promise.all([
        fetch(`${process.env.BASE_URL}/api/fetchCallRecords`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id,
            page: 1,
            num_of_records: 10,
            caller_id: null,
          }),
        }),
        fetch(`${process.env.BASE_URL}/api/fetchDispositionGraphData`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
          body: JSON.stringify({
            client_id,
          }),
        }),
        fetch(`${process.env.BASE_URL}/api/fetchAgentReport`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id,
          }),
        }),
      ]);

      const [callResult, graphDataResult, agentResult] = await Promise.all([
        callRes.json(),
        graphDataRes.json(),
        agentRes.json(),
      ]);

      if (!callRes.ok) {
        throw new Error(callResult.error || "Failed to fetch call records");
      }
      if (!graphDataRes.ok) {
        throw new Error(
          callResult.error || "Failed to fetch dispostion graph data"
        );
      }

      if (!agentRes.ok) {
        throw new Error(agentResult.error || "Failed to fetch agent report");
      }

      return {
        props: {
          callRecords: callResult.callRecords || [],
          dispositionChartData: transformGraphData(
            graphDataResult.graphData || []
          ),
          agentReport: transformAgentData(agentResult?.agentRecords || []),
        },
      };
    } catch (error) {
      console.error("SSR error:", error);

      return {
        props: {
          callRecords: [],
          dispositionChartData: [],
          agentReport: [],
        },
      };
    }
  },
  ["admin", "user"]
);
