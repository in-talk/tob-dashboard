import CallDataTable from "@/components/Analytics/CallDataTable";
import DispositionChart from "@/components/Analytics/DispositionChart";
import GaugeChart from "@/components/Analytics/GaugeChart";
import { withAuth } from "@/utils/auth";
import { GetServerSideProps } from "next";
import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>
          InTalk Dashboard - Smart Customer Service Management
        </title>
      </Head>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <h1 className="text-4xl font-bold capitalize">Dashboard</h1>
        <div className="">
          <CallDataTable />
        </div>
        <div className="w-full">
          <DispositionChart />
        </div>
        <div className="w-full">
          <GaugeChart />
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin", "user"]);
