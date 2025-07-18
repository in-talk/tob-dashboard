import CreateDocument from "@/components/CreateDocument";
import DocumentList from "@/components/DocumentList";
import { withAuth } from "@/utils/auth";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";

export default function LabelManagment() {
  const router = useRouter();
  const queryKeys = Object.keys(router.query);
  const collectionType = queryKeys.length > 0 ? queryKeys[0] : "CGM";
  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex justify-between items-center px-4 my-2">
          <CreateDocument collectionType={collectionType} />
          <h1 className="text-3xl text-center font-bold">{collectionType}</h1>
        </div>
        <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 dark:bg-sidebar md:min-h-min">
          <DocumentList collectionType={collectionType} />
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin"]);
