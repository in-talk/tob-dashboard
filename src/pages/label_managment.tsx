import CreateDocument from "@/components/CreateDocument";
import DocumentList from "@/components/DocumentList";
import { withAuth } from "@/utils/auth";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useMemo } from "react";

export default function LabelManagment() {
  const router = useRouter();

  // Extract collection type from query keys (e.g., ?ACA) or explicit param
  const collectionType = useMemo(() => {
    if (!router.isReady) return null;

    // Support both ?collectionType=ACA and ?ACA
    if (router.query.collectionType) {
      return router.query.collectionType as string;
    }

    const queryKeys = Object.keys(router.query);
    return queryKeys.length > 0 ? queryKeys[0] : null;
  }, [router.isReady, router.query]);

  if (!router.isReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!collectionType) {
    return (
      <div className="flex items-center justify-center h-screen">
        <h1 className="text-2xl font-bold">Collection type not specified</h1>
      </div>
    );
  }
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
