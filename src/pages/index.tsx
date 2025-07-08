import AgentDispositionReport from "@/components/dashboard/AgentDispositionReport";
import CallDataTable from "@/components/dashboard/CallDataTable";
import DispositionChart from "@/components/dashboard/DispositionChart";
import { CallRecord } from "@/types/callRecord";
// import GaugeChart from "@/components/dashboard/GaugeChart";
import { withAuth } from "@/utils/auth";
import { AgentReportRow, transformAgentData } from "@/utils/transformAgentData";
import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import Head from "next/head";
interface HomeProps {
  callRecords: CallRecord[];
  agentReport: AgentReportRow[];
}

export default function Home({ callRecords, agentReport }: HomeProps) {
  return (
    <>
      <Head>
        <title>InTalk Dashboard - Smart Customer Service Management</title>
      </Head>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <h1 className="text-4xl font-bold capitalize">Dashboard</h1>
        <div className="">
          <CallDataTable callRecords={callRecords} />
        </div>
        <div className="w-full">
          <DispositionChart />
        </div>
        <div className="w-full">
          <AgentDispositionReport agentReport={agentReport} />
        </div>
        {/* <div className="w-full">
          <GaugeChart />
        </div> */}
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = withAuth(
  async (context) => {
    const session = await getSession(context);
    const client_id = session?.user?.client_id;

    if (!client_id) {
      return {
        redirect: {
          destination: "/signin",
          permanent: false,
        },
      };
    }

    try {
      const [callRes, agentRes] = await Promise.all([
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

      const [callResult, agentResult] = await Promise.all([
        callRes.json(),
        agentRes.json(),
      ]);

      if (!callRes.ok) {
        throw new Error(callResult.error || "Failed to fetch call records");
      }

      if (!agentRes.ok) {
        throw new Error(agentResult.error || "Failed to fetch agent report");
      }

      return {
        props: {
          callRecords: callResult.callRecords || [],
          agentReport: transformAgentData(agentResult?.agentRecords || []),
        },
      };
    } catch (error) {
      console.error("SSR error:", error);

      return {
        props: {
          callRecords: [],
          agentReport: [],
        },
      };
    }
  },
  ["admin", "user"]
);
