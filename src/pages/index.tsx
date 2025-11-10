// pages/index.tsx
import { GetServerSideProps } from "next";
import { useSession } from "next-auth/react";
import Head from "next/head";
import { withAuth } from "@/utils/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardContent from "@/components/dashboard/DashboardContent";

export default function Home() {
  const { data: session } = useSession();
  const user_id = session?.user?.id;

  return (
    <>
      <Head>
        <title>InTalk Dashboard - Smart Customer Service Management</title>
      </Head>
      <DashboardLayout>
        <DashboardContent userId={user_id} />
      </DashboardLayout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin", "user"]);