import { withAuth } from "@/utils/auth";
import { GetServerSideProps } from "next";
import Users from "@/components/Users";
import Head from "next/head";

export default function UsersPage() {
  return (
    <>
      <Head>
        <title>InTalk Dashboard - Smart Customer Service Management</title>
      </Head>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <h1 className="text-4xl font-bold capitalize">Users</h1>
        <Users />
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin"]);
