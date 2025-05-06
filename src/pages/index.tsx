import CreateDocument from "@/components/CreateDocument";
import CreateUser from "@/components/CreateUser";
import DocumentList from "@/components/DocumentList";
import UsersList from "@/components/UsersList";
import { withAuth } from "@/utils/auth";
import { GetServerSideProps } from "next";
import { useSession } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex justify-between items-center my-2">
          <h1 className="text-4xl font-bold capitalize">
            {session?.user.role} Dashboard
          </h1>
          {session?.user.role === "admin" ? <CreateUser /> : <CreateDocument />}
        </div>

        <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min">
          {session?.user.role === "admin" ? <UsersList /> : <DocumentList />}
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin", "user"]);
