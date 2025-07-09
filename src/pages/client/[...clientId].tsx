// import DispositionChart from "@/components/dashboard/DispositionChart";
import { CallRecord } from "@/types/callRecord";
import { withAuth } from "@/utils/auth";
import { AgentReportRow, transformAgentData } from "@/utils/transformAgentData";
import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import dynamic from "next/dynamic";

interface CallsPageProps {
  callRecords: CallRecord[];
  agentReport: AgentReportRow[];
}

const ClientPage = ({ callRecords, agentReport }: CallsPageProps) => {
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
      <CallDataTable callRecords={callRecords} />
      {/* <div className="w-full">
              <DispositionChart />
            </div> */}
      <div className="w-full">
        <AgentDispositionReport agentReport={agentReport} />
      </div>
      {/* <div className="w-full">
          <GaugeChart />
        </div> */}
    </>
  );
};
export default ClientPage;

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

    const { client_id } = session.user;

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
