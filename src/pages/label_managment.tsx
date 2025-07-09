import CreateDocument from "@/components/CreateDocument";
import DocumentList from "@/components/DocumentList";
import { withAuth } from "@/utils/auth";
import { GetServerSideProps } from "next";

export default function LabelManagment() {

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex justify-between items-center my-2">
          <CreateDocument />
        </div>
        <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 dark:bg-sidebar md:min-h-min">
          <DocumentList />
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin", "user"]);
